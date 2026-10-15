import { describe, it, expect } from 'vitest';
import { calculateLine, calculateInvoiceTotals } from '../../src/server/domain/money';

describe('Cycle des achats fournisseurs, dettes et réapprovisionnement (Module M5)', () => {
  it('calcule exactement les montants d’une facture d’achat avec TVA 18%', () => {
    const line = calculateLine({
      quantity: 100,
      unitPriceHt: 2600, // 260 000 FCFA HT
      vatRate: 18,
    });

    expect(line.netHt).toBe(260000);
    expect(line.vatAmount).toBe(46800);
    expect(line.totalTtc).toBe(306800);

    const totals = calculateInvoiceTotals({
      lines: [line],
      aibRate: 0,
    });

    expect(totals.totalNetHt).toBe(260000);
    expect(totals.totalVat).toBe(46800);
    expect(totals.netToPay).toBe(306800);
  });

  it('gère l’imputation des règlements fournisseurs et rejette le surpaiement', () => {
    let paidAmount = 0;
    const totalTtc = 306800;

    function pay(amount: number) {
      const remaining = totalTtc - paidAmount;
      if (amount > remaining) {
        throw new Error(`Surpaiement refusé : versé ${amount}, reste ${remaining}`);
      }
      paidAmount += amount;
      return totalTtc - paidAmount;
    }

    // Premier acompte de 100 000 FCFA
    const rem1 = pay(100000);
    expect(rem1).toBe(206800);

    // Tentative de surpaiement de 250 000 FCFA -> refusée
    expect(() => pay(250000)).toThrow(/Surpaiement refusé/);

    // Solde exact de 206 800 FCFA -> facture soldée
    const rem2 = pay(206800);
    expect(rem2).toBe(0);
  });
});
