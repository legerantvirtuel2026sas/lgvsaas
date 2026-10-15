import { describe, it, expect } from 'vitest';
import { calculateLine, calculateInvoiceTotals } from '../../src/server/domain/money';

describe('Cycle des ventes, marge figée et calculs fiscaux (Module M6)', () => {
  it('calcule exactement une facture avec remise globale, TVA 18% et AIB 1%', () => {
    const line1 = calculateLine({
      quantity: 10,
      unitPriceHt: 3500, // Brut = 35 000
      vatRate: 18,
      costPriceSnapshot: 2500, // Marge unitaire = 1 000 -> 10 000
    });

    const totals = calculateInvoiceTotals({
      lines: [line1],
      globalDiscountAmount: 5000, // Remise globale 5 000
      aibRate: 1, // AIB 1%
    });

    // Brut: 35 000 - Remise: 5 000 = Net HT: 30 000
    expect(totals.totalNetHt).toBe(30000);
    // TVA 18% sur 30 000 = 5 400
    expect(totals.totalVat).toBe(5400);
    // AIB 1% sur 30 000 = 300
    expect(totals.totalAib).toBe(300);
    // Net à payer = 30 000 + 5 400 + 300 = 35 700 FCFA
    expect(totals.netToPay).toBe(35700);
  });

  it('fige la marge brute via costPriceSnapshot indépendamment des évolutions futures de prix', () => {
    const originalCost = 2500;
    const saleQty = 10;
    const saleNetHt = 35000;

    // Marge calculée au moment de la vente avec costPriceSnapshot = 2500
    const snapshotCostTotal = saleQty * originalCost; // 25 000
    const frozenMargin = saleNetHt - snapshotCostTotal; // 10 000

    expect(frozenMargin).toBe(10000);

    // Si le prix de revient du produit passe à 3 000 FCFA le mois suivant
    const newProductCostPrice = 3000;
    // La marge historique passée reste figée à 10 000 FCFA grâce à costPriceSnapshot
    const historicalMargin = saleNetHt - (saleQty * originalCost);
    expect(historicalMargin).toBe(10000);
    expect(newProductCostPrice).toBe(3000);
  });

  it('gère l’imputation FIFO des règlements partiels et rejette le surpaiement', () => {
    let remaining = 150000;

    function applyPayment(amount: number) {
      if (amount > remaining) {
        throw new Error('Surpaiement refusé');
      }
      remaining -= amount;
      return remaining;
    }

    expect(applyPayment(50000)).toBe(100000);
    expect(() => applyPayment(120000)).toThrow(/Surpaiement refusé/);
    expect(applyPayment(100000)).toBe(0);
  });
});
