import { prisma } from '../db/client';
import { ActivityCardKey } from '../auth/permissions';
import { ACTIVITY_CARDS, CardStatus } from '../modules/registry';
import { recordAuditEvent } from './audit';

export const moduleFlagService = {
  /**
   * Obtient le statut actuel (OPEN ou MAINTENANCE) d'une carte du Hub.
   */
  async getCardStatus(cardKey: ActivityCardKey): Promise<CardStatus> {
    try {
      const flag = await prisma.moduleFlag.findUnique({
        where: { cardKey },
      });

      if (flag) {
        return flag.status as CardStatus;
      }
    } catch {
      // Fallback sur le registre si table non encore peuplée
    }

    return ACTIVITY_CARDS[cardKey]?.defaultStatus || 'MAINTENANCE';
  },

  /**
   * Vérifie si une carte est ouverte.
   */
  async isCardOpen(cardKey: ActivityCardKey): Promise<boolean> {
    const status = await this.getCardStatus(cardKey);
    return status === 'OPEN';
  },

  /**
   * Modifie l'état d'une carte (réservé au super-admin de la plateforme).
   */
  async setCardStatus(cardKey: ActivityCardKey, status: CardStatus, updatedBy: string) {
    const flag = await prisma.moduleFlag.upsert({
      where: { cardKey },
      create: {
        cardKey,
        status,
        updatedBy,
      },
      update: {
        status,
        updatedBy,
      },
    });

    await recordAuditEvent({
      userId: updatedBy,
      action: 'module_flag.updated',
      resource: 'module_flag',
      resourceId: cardKey,
      details: { newStatus: status },
    });

    return flag;
  },

  /**
   * Récupère le statut de l'ensemble des 4 cartes d'activité.
   */
  async getAllCardsWithStatus() {
    const keys: ActivityCardKey[] = ['COMMERCE', 'SERVICES', 'FLEET', 'CONSOLIDATION'];
    const results = await Promise.all(
      keys.map(async (key) => {
        const status = await this.getCardStatus(key);
        const cardDef = ACTIVITY_CARDS[key];
        return {
          ...cardDef,
          status,
          isOpen: status === 'OPEN',
        };
      })
    );
    return results;
  },
};
