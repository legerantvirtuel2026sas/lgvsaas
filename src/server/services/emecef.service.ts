import { prisma } from '../db/client';
import { assertAuthorized, AuthContext } from '../auth/guards';
import { encryptData, decryptData } from '../auth/crypto';
import { emecefClient } from '../integrations/emecef/client';
import { EmecefInvoiceRequest, EmecefInvoiceType } from '../integrations/emecef/types';
import { recordAuditEvent } from './audit';

export const emecefService = {
  /**
   * Enregistre ou met à jour les identifiants e-MECeF avec chiffrement AES-256-GCM du jeton.
   */
  async saveCredentials(
    ctx: AuthContext,
    input: { ifu: string; apiToken: string; mecefUrl?: string; mode?: 'TEST' | 'PRODUCTION' }
  ) {
    await assertAuthorized(ctx, 'settings.manage');

    const encryptedToken = encryptData(input.apiToken.trim());

    const credential = await prisma.emecefCredential.upsert({
      where: { companyId: ctx.companyId },
      create: {
        companyId: ctx.companyId,
        ifu: input.ifu.trim(),
        encryptedApiToken: encryptedToken,
        mecefUrl: input.mecefUrl || 'https://emecef.impots.bj',
        mode: input.mode || 'TEST',
        isActive: true,
      },
      update: {
        ifu: input.ifu.trim(),
        encryptedApiToken: encryptedToken,
        mecefUrl: input.mecefUrl || 'https://emecef.impots.bj',
        mode: input.mode || 'TEST',
        isActive: true,
      },
    });

    await recordAuditEvent({
      companyId: ctx.companyId,
      userId: ctx.userId,
      action: 'emecef.credentials_saved',
      resource: 'emecef_credential',
      details: { ifu: input.ifu, mode: credential.mode },
    });

    return { success: true, mode: credential.mode, ifu: credential.ifu };
  },

  /**
   * Flux complet de normalisation d'une facture auprès de la DGI (Section 9 de PROJECT.md)
   */
  async normalizeInvoice(ctx: AuthContext, invoiceId: string) {
    await assertAuthorized(ctx, 'emecef.normalize');

    // 1. Lire la facture et ses lignes
    const invoice = await prisma.salesDocument.findFirst({
      where: { id: invoiceId, companyId: ctx.companyId },
      include: {
        lines: { include: { product: true } },
        customer: true,
      },
    });

    if (!invoice) throw new Error('Facture introuvable');
    if (invoice.status !== 'VALIDATED') {
      throw new Error('Seule une facture validée peut être transmise pour normalisation e-MECeF.');
    }

    // 2. Récupérer et déchiffrer les identifiants e-MCF de l'entreprise
    const credential = await prisma.emecefCredential.findUnique({
      where: { companyId: ctx.companyId },
    });

    if (!credential || !credential.isActive) {
      throw new Error(
        'La configuration e-MECeF n’est pas active pour cette entreprise. Veuillez renseigner votre jeton dans Paramètres > Normalisation.'
      );
    }

    const decryptedToken = decryptData(credential.encryptedApiToken);
    const isTestMode = credential.mode === 'TEST';

    // 3. Préparer le payload de la demande
    const invoiceType: EmecefInvoiceType = invoice.type === 'CREDIT_NOTE' ? 'FA' : 'FV';

    const emecefPayload: EmecefInvoiceRequest = {
      ifu: credential.ifu,
      type: invoiceType,
      items: invoice.lines.map((line) => ({
        name: line.product.name,
        price: line.unitPriceHt,
        quantity: line.quantity,
        taxGroup: line.taxGroup as 'A' | 'B' | 'C' | 'D',
      })),
      client: {
        ifu: invoice.customer.ifu || undefined,
        name: invoice.customer.name,
        contact: invoice.customer.phone,
      },
      operator: {
        id: ctx.userId,
        name: ctx.email,
      },
      payment: [
        {
          name: 'CASH',
          amount: invoice.netToPay,
        },
      ],
      reference: invoice.originalMecefCode || undefined,
    };

    // 4. Étape 1 : Envoi de la demande initiale
    const submissionResponse = await emecefClient.submitInvoice(
      credential.mecefUrl,
      decryptedToken,
      emecefPayload,
      isTestMode
    );

    // 5. Comparaison des totaux retournés avec le calcul local
    if (submissionResponse.total !== invoice.netToPay) {
      throw new Error(
        `Blocage de sécurité : divergence entre le total calculé localement (${invoice.netToPay} FCFA) et le total retourné par l’e-MCF (${submissionResponse.total} FCFA). Finalisation annulée.`
      );
    }

    // 6. Étape 2 : Confirmation / Finalisation auprès de l'e-MCF
    const finalization = await emecefClient.confirmInvoice(
      credential.mecefUrl,
      decryptedToken,
      submissionResponse.uid,
      isTestMode
    );

    // 7. Verrouillage définitif de la facture et enregistrement des éléments de sécurité DGI
    const fiscalizedInvoice = await prisma.$transaction(async (tx) => {
      await tx.emecefSubmission.create({
        data: {
          companyId: ctx.companyId,
          documentId: invoice.id,
          uid: finalization.uid,
          mecefCode: finalization.codeMECeFDGI,
          nim: finalization.nim,
          qrCode: finalization.qrCode,
          counters: finalization.counters,
          signedAt: new Date(finalization.dateTime),
          status: 'CONFIRMED',
          requestPayload: emecefPayload as unknown as object,
          responsePayload: finalization as unknown as object,
        },
      });

      return tx.salesDocument.update({
        where: { id: invoice.id },
        data: {
          status: 'FISCALIZED',
        },
      });
    });

    await recordAuditEvent({
      companyId: ctx.companyId,
      userId: ctx.userId,
      action: 'emecef.invoice_fiscalized',
      resource: 'sales_document',
      resourceId: invoice.id,
      details: {
        codeMECeFDGI: finalization.codeMECeFDGI,
        nim: finalization.nim,
      },
    });

    return {
      success: true,
      invoice: fiscalizedInvoice,
      security: {
        codeMECeFDGI: finalization.codeMECeFDGI,
        nim: finalization.nim,
        qrCode: finalization.qrCode,
        counters: finalization.counters,
        dateTime: finalization.dateTime,
      },
    };
  },
};
