import { prisma } from '../db/client';
import { assertAuthorized, AuthContext, ForbiddenError } from '../auth/guards';
import { calculateLine, calculateInvoiceTotals } from '../domain/money';
import { stockService } from './stock.service';
import { recordAuditEvent } from './audit';

export interface CreateSalesLineInput {
  productId: string;
  quantity: number;
  unitPriceHt: number;
  discountRate?: number;
  discountAmount?: number;
  taxGroup?: 'A' | 'B' | 'C' | 'D';
}

export interface CreateSalesDocumentInput {
  companyId: string;
  customerId: string;
  type: 'PROFORMA' | 'INVOICE' | 'CREDIT_NOTE';
  paymentMode: 'COMPTANT' | 'A_TERME';
  dueDate?: Date;
  aibRate: 0 | 1 | 5;
  globalDiscount?: number;
  lines: CreateSalesLineInput[];
  originalInvoiceId?: string;
  initialPayments?: { amount: number; paymentMethod: string; reference?: string }[];
}

export const salesService = {
  /**
   * Crée un document de vente (Proforma, Facture brouillon ou Avoir).
   */
  async createDocument(ctx: AuthContext, input: CreateSalesDocumentInput) {
    if (input.type === 'PROFORMA') {
      await assertAuthorized(ctx, 'proformas.create');
    } else {
      await assertAuthorized(ctx, 'sales.create');
    }

    if (input.companyId !== ctx.companyId) throw new ForbiddenError();

    if (!input.lines || input.lines.length === 0) {
      throw new Error('Le document de vente doit comporter au moins un article.');
    }

    // 1. Calcul des lignes et récupération des prix de revient courants
    const calculatedLines = await Promise.all(
      input.lines.map(async (l) => {
        const product = await prisma.product.findFirst({
          where: { id: l.productId, companyId: ctx.companyId },
        });
        if (!product) throw new Error(`Article ${l.productId} introuvable`);

        const vatRate = l.taxGroup === 'B' || product.taxGroup === 'B' ? 18 : 0;

        const calc = calculateLine({
          quantity: l.quantity,
          unitPriceHt: l.unitPriceHt,
          discountRate: l.discountRate,
          discountAmount: l.discountAmount,
          vatRate,
          costPriceSnapshot: product.costPrice,
        });

        return {
          ...l,
          taxGroup: product.taxGroup,
          costPriceSnapshot: product.costPrice,
          ...calc,
        };
      })
    );

    // 2. Calcul des totaux généraux (TVA, Remise globale, AIB, Marge)
    const totals = calculateInvoiceTotals({
      lines: calculatedLines,
      globalDiscountAmount: input.globalDiscount,
      aibRate: input.aibRate,
    });

    const year = new Date().getFullYear();
    const docTypeSeq = input.type === 'PROFORMA' ? 'PROFORMA' : input.type === 'CREDIT_NOTE' ? 'CREDIT_NOTE' : 'INVOICE';
    const prefix = input.type === 'PROFORMA' ? 'PRO' : input.type === 'CREDIT_NOTE' ? 'AVO' : 'FAC';

    // Numérotation séquentielle sans trou
    const sequence = await prisma.documentSequence.upsert({
      where: {
        companyId_docType_year: {
          companyId: ctx.companyId,
          docType: docTypeSeq,
          year,
        },
      },
      create: {
        companyId: ctx.companyId,
        docType: docTypeSeq,
        year,
        lastNumber: 1,
      },
      update: {
        lastNumber: { increment: 1 },
      },
    });

    const documentNumber = `${prefix}-${year}-${String(sequence.lastNumber).padStart(4, '0')}`;

    const document = await prisma.salesDocument.create({
      data: {
        companyId: ctx.companyId,
        customerId: input.customerId,
        type: input.type,
        documentNumber,
        status: 'DRAFT',
        paymentMode: input.paymentMode,
        dueDate: input.dueDate || null,
        totalGrossHt: totals.totalGrossHt,
        totalLineDiscount: totals.totalLineDiscount,
        globalDiscount: totals.globalDiscount,
        totalNetHt: totals.totalNetHt,
        totalVat: totals.totalVat,
        aibRate: input.aibRate,
        aibAmount: totals.totalAib,
        netToPay: totals.netToPay,
        paidAmount: 0,
        remainingAmount: totals.netToPay,
        totalCostSnapshot: totals.totalCost,
        totalMargin: totals.totalGrossMargin,
        originalInvoiceId: input.originalInvoiceId || null,
        lines: {
          create: calculatedLines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            unitPriceHt: l.unitPriceHt,
            discountRate: l.discountRate || 0,
            discountAmount: l.discount,
            netHt: l.netHt,
            taxGroup: l.taxGroup,
            vatRate: l.vatAmount > 0 ? 18 : 0,
            vatAmount: l.vatAmount,
            totalTtc: l.totalTtc,
            costPriceSnapshot: l.costPriceSnapshot,
            margin: l.grossMargin,
          })),
        },
      },
      include: {
        lines: { include: { product: true } },
        customer: true,
      },
    });

    await recordAuditEvent({
      companyId: ctx.companyId,
      userId: ctx.userId,
      action: `sales.${input.type.toLowerCase()}_created`,
      resource: 'sales_document',
      resourceId: document.id,
      details: { documentNumber, netToPay: document.netToPay },
    });

    return document;
  },

  /**
   * Valide une facture de vente : sortie de stock (OUT) et figement définitif des marges.
   */
  async validateInvoice(ctx: AuthContext, invoiceId: string, payments?: { amount: number; paymentMethod: string; reference?: string }[]) {
    await assertAuthorized(ctx, 'sales.validate');

    const document = await prisma.salesDocument.findFirst({
      where: { id: invoiceId, companyId: ctx.companyId },
      include: { lines: true, customer: true },
    });

    if (!document) throw new Error('Document de vente introuvable');
    if (document.status !== 'DRAFT') {
      throw new Error('Seul un document brouillon peut être validé.');
    }

    // 1. Sortie de stock pour chaque ligne d'article
    for (const line of document.lines) {
      await stockService.recordMovement(ctx, {
        companyId: ctx.companyId,
        productId: line.productId,
        type: 'OUT',
        quantity: line.quantity,
        reason: `Vente client ${document.documentNumber}`,
        refType: 'SALE',
        refId: document.id,
      });
    }

    // 2. Gestion des paiements comptant
    let totalPaid = 0;
    const isComptant = document.paymentMode === 'COMPTANT';

    if (isComptant && payments && payments.length > 0) {
      totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    } else if (isComptant) {
      totalPaid = document.netToPay; // Règlement comptant par défaut
    }

    const remaining = Math.max(0, document.netToPay - totalPaid);

    // 3. Mise à jour de la créance client si paiement à terme
    if (remaining > 0) {
      await prisma.customer.update({
        where: { id: document.customerId },
        data: { currentDebt: { increment: remaining } },
      });
    }

    const validated = await prisma.salesDocument.update({
      where: { id: document.id },
      data: {
        status: 'VALIDATED',
        validatedAt: new Date(),
        validatedBy: ctx.userId,
        paidAmount: totalPaid,
        remainingAmount: remaining,
        ...(payments && payments.length > 0
          ? {
              payments: {
                create: payments.map((p) => ({
                  companyId: ctx.companyId,
                  amount: p.amount,
                  paymentMethod: p.paymentMethod,
                  reference: p.reference || null,
                })),
              },
            }
          : isComptant
          ? {
              payments: {
                create: {
                  companyId: ctx.companyId,
                  amount: document.netToPay,
                  paymentMethod: 'Espèces',
                  reference: 'Paiement comptant à la validation',
                },
              },
            }
          : {}),
      },
      include: { lines: true, payments: true, customer: true },
    });

    await recordAuditEvent({
      companyId: ctx.companyId,
      userId: ctx.userId,
      action: 'sales.invoice_validated',
      resource: 'sales_document',
      resourceId: document.id,
      details: {
        documentNumber: document.documentNumber,
        netToPay: document.netToPay,
        paidAmount: totalPaid,
        remainingAmount: remaining,
      },
    });

    return validated;
  },

  /**
   * Enregistre un règlement client sur une facture à terme (FIFO sur les créances).
   */
  async recordPayment(
    ctx: AuthContext,
    input: { invoiceId: string; amount: number; paymentMethod: string; reference?: string }
  ) {
    await assertAuthorized(ctx, 'payments.create');

    const document = await prisma.salesDocument.findFirst({
      where: { id: input.invoiceId, companyId: ctx.companyId },
    });

    if (!document) throw new Error('Facture introuvable');

    const amount = Math.round(Math.abs(input.amount));
    if (amount <= 0) throw new Error('Le montant du paiement doit être positif.');

    if (amount > document.remainingAmount) {
      throw new Error(
        `Surpaiement refusé : le montant versé (${amount} FCFA) dépasse le reste dû (${document.remainingAmount} FCFA).`
      );
    }

    const newPaidAmount = document.paidAmount + amount;
    const newRemaining = document.netToPay - newPaidAmount;

    const payment = await prisma.$transaction(async (tx) => {
      const p = await tx.salesPayment.create({
        data: {
          companyId: ctx.companyId,
          documentId: document.id,
          amount,
          paymentMethod: input.paymentMethod,
          reference: input.reference || null,
        },
      });

      await tx.salesDocument.update({
        where: { id: document.id },
        data: {
          paidAmount: newPaidAmount,
          remainingAmount: newRemaining,
        },
      });

      // Décrémenter la dette globale du client
      await tx.customer.update({
        where: { id: document.customerId },
        data: { currentDebt: { decrement: amount } },
      });

      return p;
    });

    await recordAuditEvent({
      companyId: ctx.companyId,
      userId: ctx.userId,
      action: 'payments.recorded',
      resource: 'sales_payment',
      resourceId: payment.id,
      details: { amount, remainingAmount: newRemaining },
    });

    return payment;
  },

  /**
   * Calcule la balance âgée des créances clients (0-30j, 31-60j, 61-90j, 90+j).
   */
  async getDebtorsSummary(ctx: AuthContext, companyId: string) {
    await assertAuthorized(ctx, 'receivables.view');
    if (companyId !== ctx.companyId) throw new ForbiddenError();

    const unpaidInvoices = await prisma.salesDocument.findMany({
      where: {
        companyId,
        status: { in: ['VALIDATED', 'FISCALIZED'] },
        remainingAmount: { gt: 0 },
      },
      include: { customer: true },
      orderBy: { issueDate: 'asc' },
    });

    const now = Date.now();
    let bracket0_30 = 0;
    let bracket31_60 = 0;
    let bracket61_90 = 0;
    let bracket90Plus = 0;
    let totalOutstanding = 0;

    const debtorsMap = new Map<string, { customer: typeof unpaidInvoices[0]['customer']; totalDue: number; invoicesCount: number }>();

    for (const inv of unpaidInvoices) {
      const ageDays = Math.floor((now - inv.issueDate.getTime()) / (1000 * 60 * 60 * 24));
      const remaining = inv.remainingAmount;
      totalOutstanding += remaining;

      if (ageDays <= 30) bracket0_30 += remaining;
      else if (ageDays <= 60) bracket31_60 += remaining;
      else if (ageDays <= 90) bracket61_90 += remaining;
      else bracket90Plus += remaining;

      const existing = debtorsMap.get(inv.customerId);
      if (existing) {
        existing.totalDue += remaining;
        existing.invoicesCount += 1;
      } else {
        debtorsMap.set(inv.customerId, {
          customer: inv.customer,
          totalDue: remaining,
          invoicesCount: 1,
        });
      }
    }

    return {
      totalOutstanding,
      bracket0_30,
      bracket31_60,
      bracket61_90,
      bracket90Plus,
      debtorsList: Array.from(debtorsMap.values()),
    };
  },
};
