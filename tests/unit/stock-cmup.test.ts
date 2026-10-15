import { describe, it, expect } from 'vitest';
import {
  calculateNewCmup,
  assertStockAvailable,
  calculateTotalStockValuation,
  InsufficientStockError,
} from '../../src/server/domain/stock';

describe('Logique de stock, calcul CMUP et valorisation (Module M4)', () => {
  it('calcule le nouveau CMUP exact lors d’une entrée en stock', () => {
    // 100 unités à 2 000 FCFA = 200 000 FCFA
    // Achat de 50 unités à 2 600 FCFA = 130 000 FCFA
    // Total = 330 000 FCFA / 150 unités = 2 200 FCFA
    const newCmup = calculateNewCmup(100, 2000, 50, 2600);
    expect(newCmup).toBe(2200);
  });

  it('assigne le coût d’achat comme CMUP si le stock initial était nul ou négatif', () => {
    const cmupFromZero = calculateNewCmup(0, 0, 20, 3500);
    expect(cmupFromZero).toBe(3500);
  });

  it('bloque une sortie de stock si la quantité disponible est insuffisante (sauf option stock négatif)', () => {
    // Stock actuel : 8 unités. Demande : 10 unités.
    expect(() => {
      assertStockAvailable('Cartouche HP 85A', 8, 10, false);
    }).toThrow(InsufficientStockError);

    // Si option autorisée, l'opération passe
    expect(() => {
      assertStockAvailable('Cartouche HP 85A', 8, 10, true);
    }).not.toThrow();
  });

  it('calcule la valorisation totale du stock d’une entreprise', () => {
    const items = [
      { currentStock: 100, costPrice: 2000 }, // 200 000
      { currentStock: 10, costPrice: 12500 }, // 125 000
      { currentStock: 5, costPrice: 4000 },   // 20 000
    ];

    const result = calculateTotalStockValuation(items);
    expect(result.totalUnits).toBe(115);
    expect(result.totalValuationFcfa).toBe(345000);
  });
});
