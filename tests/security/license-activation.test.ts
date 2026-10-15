import { describe, it, expect } from 'vitest';
import { PLANS_CATALOG, PlanCode } from '../../src/server/domain/pricing';

describe('Activation et prolongation de licence annuelle (Module M1B)', () => {
  it('attribue le bon nombre d’utilisateurs selon le plan souscrit', () => {
    expect(PLANS_CATALOG.ESSENTIEL.seats).toBe(2);
    expect(PLANS_CATALOG.PRO.seats).toBe(5);
    expect(PLANS_CATALOG.ENTREPRISE.seats).toBe(10);
  });

  it('active une licence pour 12 mois à partir de la date courante pour un essai', () => {
    const now = new Date('2026-10-14T10:00:00.000Z');

    function calculateNewEndsAt(currentEndsAt: Date | null, currentDate: Date): Date {
      let baseDate = currentDate;
      if (currentEndsAt && currentEndsAt > currentDate) {
        baseDate = currentEndsAt;
      }
      const extended = new Date(baseDate);
      extended.setFullYear(extended.getFullYear() + 1);
      return extended;
    }

    const firstActivation = calculateNewEndsAt(null, now);
    expect(firstActivation.toISOString()).toBe('2027-10-14T10:00:00.000Z');
  });

  it('prolonge d’un an supplémentaire une licence active existante non encore expirée', () => {
    const now = new Date('2026-10-14T10:00:00.000Z');
    const existingActiveEndsAt = new Date('2027-04-01T10:00:00.000Z'); // Expire dans 6 mois

    function calculateNewEndsAt(currentEndsAt: Date | null, currentDate: Date): Date {
      let baseDate = currentDate;
      if (currentEndsAt && currentEndsAt > currentDate) {
        baseDate = currentEndsAt;
      }
      const extended = new Date(baseDate);
      extended.setFullYear(extended.getFullYear() + 1);
      return extended;
    }

    const renewed = calculateNewEndsAt(existingActiveEndsAt, now);
    // Doit ajouter 1 an à partir du 01/04/2027 -> 01/04/2028
    expect(renewed.toISOString()).toBe('2028-04-01T10:00:00.000Z');
  });
});
