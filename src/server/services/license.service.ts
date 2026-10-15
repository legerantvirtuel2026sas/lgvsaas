import { prisma } from '../db/client';
import { PlanCode, PackCode, calculateAnnualSubscriptionPrice, PLANS_CATALOG } from '../domain/pricing';
import { paymentProvider } from '../integrations/fedapay/client';
import { FedaPayWebhookPayload } from '../integrations/fedapay/types';
import { recordAuditEvent } from './audit';
import { ForbiddenError } from '../auth/guards';

export const licenseService = {
  /**
   * Crée une commande de licence annuelle côté serveur et initialise la session de paiement FedaPay.
   */
  async createSubscriptionOrder(
    userId: string,
    companyId: string,
    planCode: PlanCode,
    packs: PackCode[]
  ) {
    // 1. Vérifier que l'utilisateur est OWNER de l'entreprise
    const membership = await prisma.membership.findUnique({
      where: {
        userId_companyId: { userId, companyId },
      },
      include: {
        company: true,
        user: true,
      },
    });

    if (!membership || membership.role !== 'OWNER' || !membership.isActive) {
      throw new ForbiddenError('Seul le propriétaire de l’entreprise peut souscrire un abonnement.');
    }

    // 2. Calcul des montants TTC et vérifications d'intégrité côté serveur
    const pricing = calculateAnnualSubscriptionPrice(planCode, packs, ['COMMERCE']);
    const idempotencyKey = `order_${companyId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 3. Créer la commande en base (statut PENDING)
    const order = await prisma.licenceOrder.create({
      data: {
        companyId,
        planCode,
        packs,
        amountTtc: pricing.totalTtc,
        status: 'PENDING',
        idempotencyKey,
      },
    });

    // 4. Initialiser la transaction FedaPay
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const callbackUrl = `${appUrl}/e/${membership.company.slug}/corp/licence/confirmation?orderId=${order.id}`;

    const session = await paymentProvider.createPaymentSession({
      amount: pricing.totalTtc,
      description: `Abonnement annuel LGV SaaS - Plan ${pricing.planCode} (${membership.company.legalName})`,
      callback_url: callbackUrl,
      customer: {
        firstname: membership.user.fullName.split(' ')[0] || 'Client',
        lastname: membership.user.fullName.split(' ').slice(1).join(' ') || 'LGV',
        email: membership.user.email,
        phone_number: membership.company.phone
          ? { number: membership.company.phone, country: 'bj' }
          : undefined,
      },
      custom_metadata: {
        orderId: order.id,
        companyId: companyId,
      },
    });

    // 5. Mettre à jour la commande avec l'ID de transaction FedaPay
    await prisma.licenceOrder.update({
      where: { id: order.id },
      data: { fedapayTxId: session.transactionId },
    });

    await recordAuditEvent({
      companyId,
      userId,
      action: 'licence.order_created',
      resource: 'licence_order',
      resourceId: order.id,
      details: {
        amountTtc: pricing.totalTtc,
        planCode,
        packs,
      },
    });

    return {
      orderId: order.id,
      paymentUrl: session.paymentUrl,
      amountTtc: pricing.totalTtc,
    };
  },

  /**
   * Traite le webhook FedaPay de manière idempotente dans une transaction base de données.
   */
  async handleFedaPayWebhook(payload: FedaPayWebhookPayload) {
    const eventId = payload.id;

    // Idempotence : vérifier si cet événement a déjà été traité
    const existingEvent = await prisma.webhookEvent.findUnique({
      where: { eventId },
    });

    if (existingEvent) {
      return { alreadyProcessed: true };
    }

    if (payload.name !== 'transaction.approved') {
      // Enregistrer l'événement non approuvé sans activer la licence
      await prisma.webhookEvent.create({
        data: {
          provider: 'FEDAPAY',
          eventId,
          payload: payload as unknown as object,
        },
      });
      return { status: payload.name, activated: false };
    }

    const txId = String(payload.entity.id);

    // Relecture serveur à serveur de la transaction auprès de FedaPay
    const verifiedTx = await paymentProvider.verifyTransaction(txId);
    if (!verifiedTx.verified || verifiedTx.status !== 'approved') {
      throw new Error(`Transaction FedaPay non confirmée par l'API : ${txId}`);
    }

    const orderId = payload.entity.custom_metadata?.orderId || verifiedTx.orderId;
    const order = await prisma.licenceOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error(`Commande introuvable pour la transaction FedaPay : ${txId}`);
    }

    // Vérification de concordance du montant en XOF
    if (verifiedTx.amount !== order.amountTtc) {
      throw new Error(
        `Divergence de montant : attendu ${order.amountTtc}, reçu ${verifiedTx.amount}`
      );
    }

    // Activation de la licence dans une transaction atomique
    const activatedLicense = await prisma.$transaction(async (tx) => {
      // 1. Enregistrer l'événement webhook pour bloquer les rejeux
      await tx.webhookEvent.create({
        data: {
          provider: 'FEDAPAY',
          eventId,
          payload: payload as unknown as object,
        },
      });

      // 2. Mettre à jour la commande
      await tx.licenceOrder.update({
        where: { id: order.id },
        data: { status: 'APPROVED' },
      });

      // 3. Calculer la nouvelle date d'échéance (+12 mois)
      const now = new Date();
      const currentLicense = await tx.license.findUnique({
        where: { companyId: order.companyId },
      });

      let baseDate = now;
      if (currentLicense?.endsAt && currentLicense.endsAt > now) {
        baseDate = currentLicense.endsAt; // Prolongation
      }

      const newEndsAt = new Date(baseDate);
      newEndsAt.setFullYear(newEndsAt.getFullYear() + 1);

      const planInfo = PLANS_CATALOG[order.planCode as PlanCode] || PLANS_CATALOG.PRO;

      // 4. Mettre à jour la licence entreprise
      const updatedLic = await tx.license.upsert({
        where: { companyId: order.companyId },
        create: {
          companyId: order.companyId,
          planCode: order.planCode,
          packs: order.packs,
          mode: 'ANNUAL',
          status: 'ACTIVE',
          seats: planInfo.seats,
          endsAt: newEndsAt,
        },
        update: {
          planCode: order.planCode,
          packs: order.packs,
          mode: 'ANNUAL',
          status: 'ACTIVE',
          seats: planInfo.seats,
          endsAt: newEndsAt,
        },
      });

      return updatedLic;
    });

    // Journalisation d'audit
    await recordAuditEvent({
      companyId: order.companyId,
      action: 'licence.activated_via_fedapay',
      resource: 'license',
      resourceId: activatedLicense.id,
      details: {
        orderId: order.id,
        planCode: order.planCode,
        amountTtc: order.amountTtc,
        newEndsAt: activatedLicense.endsAt,
      },
    });

    return { success: true, license: activatedLicense };
  },

  /**
   * Activation manuelle par un super-admin (paiement virement / espèces hors ligne).
   */
  async manualActivateLicense(
    adminUserId: string,
    companyId: string,
    planCode: PlanCode,
    packs: PackCode[],
    justification: string
  ) {
    if (!justification || justification.trim().length < 5) {
      throw new Error('Une justification détaillée est obligatoire pour une activation manuelle.');
    }

    const now = new Date();
    const newEndsAt = new Date(now);
    newEndsAt.setFullYear(newEndsAt.getFullYear() + 1);

    const planInfo = PLANS_CATALOG[planCode] || PLANS_CATALOG.PRO;

    const license = await prisma.license.upsert({
      where: { companyId },
      create: {
        companyId,
        planCode,
        packs,
        mode: 'ANNUAL',
        status: 'ACTIVE',
        seats: planInfo.seats,
        endsAt: newEndsAt,
      },
      update: {
        planCode,
        packs,
        mode: 'ANNUAL',
        status: 'ACTIVE',
        seats: planInfo.seats,
        endsAt: newEndsAt,
      },
    });

    await recordAuditEvent({
      companyId,
      userId: adminUserId,
      action: 'licence.manual_activation_by_admin',
      resource: 'license',
      resourceId: license.id,
      details: {
        planCode,
        packs,
        justification,
      },
    });

    return license;
  },
};
