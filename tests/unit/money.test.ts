import { describe, it, expect } from 'vitest';
import {
  roundFcfa,
  deriveHtFromTtc,
  calculateLine,
  calculateInvoiceTotals,
  formatFcfa,
} from '../../src/server/domain/money';

describe('Domaine monétaire FCFA (XOF)', () => {
  it('garantit que les montants sont toujours des entiers stricts sans décimales', () => {
    expect(roundFcfa(100.49)).toBe(100);
    expect(roundFcfa(100.5)).toBe(101);
    expect(roundFcfa(1500000.75)).toBe(1500001);
  });

  it('dérive correctement le montant HT et la TVA 18% depuis un TTC', () => {
    // Exemple : 235 900 FCFA TTC avec TVA 18 %
    // HT = 235 900 / 1.18 = 199 915.25 -> 199 915 FCFA
    // TVA = 235 900 - 199 915 = 35 985 FCFA
    const { amountHt, vatAmount } = deriveHtFromTtc(235900, 18);
    expect(amountHt).toBe(199915);
    expect(vatAmount).toBe(35985);
    expect(amountHt + vatAmount).toBe(235900);
  });

  it('calcule une ligne de facture avec remise en pourcentage, TVA et marge brute', () => {
    const line = calculateLine({
      quantity: 5,
      unitPriceHt: 10000,
      discountRate: 10, // 10 % de remise
      vatRate: 18,
      costPriceSnapshot: 6000, // prix de revient
    });

    // Brut HT = 5 * 10 000 = 50 000
    expect(line.grossHt).toBe(50000);
    // Remise 10 % = 5 000
    expect(line.discount).toBe(5000);
    // Net HT = 45 000
    expect(line.netHt).toBe(45000);
    // TVA 18 % sur 45 000 = 8 100
    expect(line.vatAmount).toBe(8100);
    // TTC = 45 000 + 8 100 = 53 100
    expect(line.totalTtc).toBe(53100);
    // Coût total = 5 * 6 000 = 30 000
    expect(line.costTotal).toBe(30000);
    // Marge brute = Net HT (45 000) - Coût total (30 000) = 15 000
    expect(line.grossMargin).toBe(15000);
  });

  it('calcule les totaux d’une facture avec AIB 1% (Bénin)', () => {
    const line1 = calculateLine({
      quantity: 2,
      unitPriceHt: 25000,
      vatRate: 18,
      costPriceSnapshot: 15000,
    }); // Brut: 50 000, Net HT: 50 000, TVA: 9 000

    const line2 = calculateLine({
      quantity: 1,
      unitPriceHt: 50000,
      vatRate: 18,
      costPriceSnapshot: 30000,
    }); // Brut: 50 000, Net HT: 50 000, TVA: 9 000

    const totals = calculateInvoiceTotals({
      lines: [line1, line2],
      aibRate: 1, // AIB 1 %
    });

    expect(totals.totalGrossHt).toBe(100000);
    expect(totals.totalNetHt).toBe(100000);
    expect(totals.totalVat).toBe(18000);
    // AIB 1 % sur 100 000 = 1 000 FCFA
    expect(totals.totalAib).toBe(1000);
    // Net à payer = 100 000 + 18 000 + 1 000 = 119 000 FCFA
    expect(totals.netToPay).toBe(119000);
    // Marge totale = 100 000 - (30 000 + 30 000) = 40 000 FCFA
    expect(totals.totalGrossMargin).toBe(40000);
  });

  it('formate les montants avec le suffixe FCFA', () => {
    const formatted = formatFcfa(1250000);
    expect(formatted).toContain('FCFA');
    expect(formatted).toContain('1');
    expect(formatted).toContain('250');
  });
});
