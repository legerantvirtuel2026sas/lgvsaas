import { describe, it, expect } from 'vitest';
import { calculateAnnualSubscriptionPrice } from '../../src/server/domain/pricing';

describe('Moteur de tarification et calcul serveur des abonnements (Module M1B)', () => {
  it('calcule le prix officiel du Pack Commerce pour le Plan Essentiel (176 900 FCFA TTC)', () => {
    const pricing = calculateAnnualSubscriptionPrice('ESSENTIEL', ['COMMERCE'], ['COMMERCE']);
    expect(pricing.totalTtc).toBe(176900);
    expect(pricing.seats).toBe(2);
    expect(pricing.totalDiscount).toBe(0);
    // HT + TVA 18%
    expect(pricing.totalHt + pricing.totalVat).toBe(176900);
  });

  it('calcule le prix officiel du Pack Commerce pour le Plan Pro (235 900 FCFA TTC)', () => {
    const pricing = calculateAnnualSubscriptionPrice('PRO', ['COMMERCE'], ['COMMERCE']);
    expect(pricing.totalTtc).toBe(235900);
    expect(pricing.seats).toBe(5);
    expect(pricing.totalDiscount).toBe(0);
  });

  it('applique la réduction de 50% sur le 2e pack pour le Plan Pro (sur le moins cher)', () => {
    // Si Commerce (235 900) et Services (218 200) sont autorisés
    // Services est le moins cher : 218 200 * 0.5 = 109 100 de remise
    // Total = 235 900 + 109 100 = 345 000 FCFA TTC
    const pricing = calculateAnnualSubscriptionPrice(
      'PRO',
      ['COMMERCE', 'SERVICES'],
      ['COMMERCE', 'SERVICES']
    );

    expect(pricing.totalDiscount).toBe(109100);
    expect(pricing.totalTtc).toBe(345000);
    expect(pricing.itemizedPacks[0].packCode).toBe('COMMERCE');
    expect(pricing.itemizedPacks[0].finalPriceTtc).toBe(235900);
    expect(pricing.itemizedPacks[1].packCode).toBe('SERVICES');
    expect(pricing.itemizedPacks[1].finalPriceTtc).toBe(109100);
  });

  it('bloque la commande d’un pack en maintenance ou non disponible à la vente', () => {
    // Seul COMMERCE est disponible par défaut
    expect(() =>
      calculateAnnualSubscriptionPrice('ESSENTIEL', ['FLEET'], ['COMMERCE'])
    ).toThrow(/n’est pas disponible à la souscription/);
  });
});
