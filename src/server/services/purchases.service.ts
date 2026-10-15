import { prisma } from '../db/client';
import { assertAuthorized, AuthContext, ForbiddenError } from '../auth/guards';
import { calculateLine, calculateInvoiceTotals } from '../domain/money';
import { stockService } from './stock.service';
import { recordAuditEvent } from './audit';

export interface CreatePurchaseLineInput {
  productId: string;
  quantity: number;
  unitPriceHt: number;
  discountRate?: number;
  discountAmount?: number;
  vatRate?: number;
}

export interface CreatePurchaseInvoiceInput {
  companyId: string;
  supplierId: string;
  supplierRef?: string;
  paymentMode: 'COMPTANT' | 'A_TERME';
  dueDate?: Date;
  lines: CreatePurchaseLineInput[];
}

export const purchasesService = {
  /**
   * Crée un brouillon de facture d'achat fournisseur avec calcul automatique des lignes et TVA.
   */
  async createDraft(ctx: AuthContext, input: CreatePurchaseInvoiceInput) {
    await assertAuthorized(ctx, 'purchases.create');
    if (input.companyId !== ctx.companyId) throw new ForbiddenError();

    if (!input.lines || input.lines.length === 0) {
      throw new Error('Une facture d’achat doit comporter au moins une ligne.');
    }

    const calculatedLines = input.lines.map((l) => {
      const calc = calculateLine({
        quantity: l.quantity,
        unitPriceHt: l.unitPriceHt,
        discountRate: l.discountRate,
        discountAmount: l.discountAmount,
        vatRate: l.vatRate !== undefined ? l.vatRate : 18,
      });
      return {
        ...l,
        ...calc,
      };
    });

    const totals = calculateInvoiceTotals({
      lines: calculatedLines,
      aibRate: 0, // Pas d'AIB sur les achats fournisseurs
    });

    const year = new Date().getFullYear();

    // Numérotation séquentielle garantie sans trou
    const sequence = await prisma.documentSequence.upsert({
      where: {
        companyId_docType_year: {
          companyId: ctx.companyId,
          docType: 'PURCHASE',
          year,
        },
      },
      create: {
        companyId: ctx.companyId,
        docType: 'PURCHASE',
        year,
        lastNumber: 1,
      },
      update: {
        lastNumber: { increment: 1 },
      },
    });

    const invoiceNumber = `ACH-${year}-${String(sequence.lastNumber).padStart(4, '0')}`;

    const invoice = await prisma.purchaseInvoice.create({
      data: {
        companyId: ctx.companyId,
        supplierId: input.supplierId,
        invoiceNumber,
        supplierRef: input.supplierRef || null,
        status: 'DRAFT',
        paymentMode: input.paymentMode,
        dueDate: input.dueDate || null,
        totalGrossHt: totals.totalGrossHt,
        totalDiscount: totals.totalLineDiscount,
        totalNetHt: totals.totalNetHt,
        totalVat: totals.totalVat,
        totalTtc: totals.netToPay,
        paidAmount: 0,
        remainingAmount: totals.netToPay,
        lines: {
          create: calculatedLines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            unitPriceHt: l.unitPriceHt,
            discount: l.discount,
            netHt: l.netHt,
            vatRate: 18,
            vatAmount: l.vatAmount,
            totalTtc: l.totalTtc,
          })),
        },
      },
      include: {
        lines: true,
        supplier: true,
      },
    });

    await recordAuditEvent({
      companyId: ctx.companyId,
      userId: ctx.userId,
      action: 'purchases.draft_created',
      resource: 'purchase_invoice',
      resourceId: invoice.id,
      details: { invoiceNumber, totalTtc: invoice.totalTtc },
    });

    return invoice;
  },

  /**
   * Valide la facture d'achat : déclenche l'entrée en stock physique (IN) et met à jour le CMUP.
   */
  async validateInvoice(ctx: AuthContext, invoiceId: string) {
    await assertAuthorized(ctx, 'purchases.validate');

    const invoice = await prisma.purchaseInvoice.findFirst({
      where: { id: invoiceId, companyId: ctx.companyId },
      include: { lines: true },
    });

    if (!invoice) throw new Error('Facture d’achat introuvable');
    if (invoice.status !== 'DRAFT') {
      throw new Error('Seule une facture au statut Brouillon peut être validée.');
    }

    // 1. Entrée en stock pour chaque ligne d'article
    for (const line of invoice.lines) {
      await stockService.recordMovement(ctx, {
        companyId: ctx.companyId,
        productId: line.productId,
        type: 'IN',
        quantity: line.quantity,
        unitCost: Math.round(line.netHt / line.quantity), // Coût unitaire d'achat réel
        reason: `Achat fournisseur réf: ${invoice.invoiceNumber}`,
        refType: 'PURCHASE',
        refId: invoice.id,
      });
    }

    // 2. Gestion du paiement comptant ou à terme
    const isComptant = invoice.paymentMode === 'COMPTANT';

    const validated = await prisma.purchaseInvoice.update({
      where: { id: invoice.id },
      data: {
        status: 'VALIDATED',
        validatedAt: new Date(),
        validatedBy: ctx.userId,
        paidAmount: isComptant ? invoice.totalTtc : 0,
        remainingAmount: isComptant ? 0 : invoice.totalTtc,
        ...(isComptant
          ? {
              payments: {
                create: {
                  companyId: ctx.companyId,
                  amount: invoice.totalTtc,
                  paymentMethod: 'Espèces',
                  reference: 'Règlement comptant à la validation',
                },
              },
            }
          : {}),
      },
      include: { lines: true, payments: true },
    });

    await recordAuditEvent({
      companyId: ctx.companyId,
      userId: ctx.userId,
      action: 'purchases.validated',
      resource: 'purchase_invoice',
      resourceId: invoice.id,
      details: {
        invoiceNumber: invoice.invoiceNumber,
        stockUpdated: true,
        isComptant,
      },
    });

    return validated;
  },

  /**
   * Enregistre un règlement fournisseur avec imputation sur la dette (surpaiement refusé).
   */
  async recordPayment(
    ctx: AuthContext,
    input: { invoiceId: string; amount: number; paymentMethod: string; reference?: string }
  ) {
    await assertAuthorized(ctx, 'purchases.validate');

    const invoice = await prisma.purchaseInvoice.findFirst({
      where: { id: input.invoiceId, companyId: ctx.companyId },
    });

    if (!invoice) throw new Error('Facture d’achat introuvable');

    const amount = Math.round(Math.abs(input.amount));
    if (amount <= 0) throw new Error('Le montant du paiement doit être positif.');

    if (amount > invoice.remainingAmount) {
      throw new Error(
        `Surpaiement refusé : le montant versé (${amount} FCFA) dépasse le reste à payer (${invoice.remainingAmount} FCFA).`
      );
    }

    const newPaidAmount = invoice.paidAmount + amount;
    const newRemaining = invoice.totalTtc - newPaidAmount;

    const payment = await prisma.$transaction(async (tx) => {
      const p = await tx.supplierPayment.create({
        data: {
          companyId: ctx.companyId,
          invoiceId: invoice.id,
          amount,
          paymentMethod: input.paymentMethod,
          reference: input.reference || null,
        },
      });

      await tx.purchaseInvoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: newPaidAmount,
          remainingAmount: newRemaining,
        },
      });

      return p;
    });

    await recordAuditEvent({
      companyId: ctx.companyId,
      userId: ctx.userId,
      action: 'purchases.payment_recorded',
      resource: 'supplier_payment',
      resourceId: payment.id,
      details: { amount, remainingAmount: newRemaining },
    });

    return payment;
  },

  async listInvoices(ctx: AuthContext, companyId: string) {
    await assertAuthorized(ctx, 'purchases.view');
    if (companyId !== ctx.companyId) throw new ForbiddenError();

    return prisma.purchaseInvoice.findMany({
      where: { companyId },
      include: {
        supplier: true,
        lines: { include: { product: true } },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  },
};
