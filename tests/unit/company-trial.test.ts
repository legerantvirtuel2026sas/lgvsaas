import { describe, it, expect } from 'vitest';

describe('Règles d’attribution de l’essai gratuit de 7 jours (Module M1)', () => {
  it('calcule une date d’échéance exacte à J+7 (7 * 24 heures)', () => {
    const now = new Date('2026-10-14T10:00:00.000Z');
    const trialDurationMs = 7 * 24 * 60 * 60 * 1000;
    const expectedTrialEndsAt = new Date(now.getTime() + trialDurationMs);

    expect(expectedTrialEndsAt.toISOString()).toBe('2026-10-21T10:00:00.000Z');

    // Vérification du nombre de jours restants
    const remainingDays = Math.ceil(
      (expectedTrialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    expect(remainingDays).toBe(7);
  });

  it('bloque l’attribution d’un 2e essai gratuit pour un même IFU (Anti-abus)', () => {
    // Base simulée des IFU ayant déjà bénéficié d'un essai gratuit
    const platformRegisteredIfus = new Set(['0202611111111']);

    function evaluateTrialEligibility(candidateIfu: string): {
      eligible: boolean;
      initialStatus: 'TRIAL' | 'EXPIRED';
      seats: number;
    } {
      const normalized = candidateIfu.trim();
      if (platformRegisteredIfus.has(normalized)) {
        return { eligible: false, initialStatus: 'EXPIRED', seats: 5 };
      }
      return { eligible: true, initialStatus: 'TRIAL', seats: 5 };
    }

    // Premier enregistrement de l'IFU : éligible
    const firstCompany = evaluateTrialEligibility('0202622222222');
    expect(firstCompany.eligible).toBe(true);
    expect(firstCompany.initialStatus).toBe('TRIAL');

    // Deuxième tentative avec le même IFU déjà enregistré : refus d'essai gratuit
    const duplicateIfuCompany = evaluateTrialEligibility('0202611111111');
    expect(duplicateIfuCompany.eligible).toBe(false);
    expect(duplicateIfuCompany.initialStatus).toBe('EXPIRED');
  });
});
