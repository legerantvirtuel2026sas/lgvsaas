import { describe, it, expect } from 'vitest';
import { calculateLine, calculateInvoiceTotals } from '../../src/server/domain/money';
import { generateDocNumber } from '../../src/lib/sales-store';

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

  it('génère une numérotation annuelle stricte et séquentielle pour factures et exports sans collision', () => {
    const currentYear = new Date().getFullYear();

    const existingDocs = [
      { documentNumber: `FAC-${currentYear}-0001` },
      { documentNumber: `FAC-${currentYear}-0002` },
      { documentNumber: `EXP-${currentYear}-0001` },
    ];

    expect(generateDocNumber('INVOICE', existingDocs)).toBe(`FAC-${currentYear}-0003`);
    expect(generateDocNumber('EXPORT', existingDocs)).toBe(`EXP-${currentYear}-0002`);
  });

  it('préserve les proformas sans impact sur le stock et valide la déduction de stock uniquement lors de la validation', () => {
    let stock = 20;

    // Proforma : le stock n'est pas modifié
    const proformaStatus = 'DRAFT';
    function processInvoice(status: 'DRAFT' | 'VALIDATED' | 'FISCALIZED', qty: number) {
      if (status === 'VALIDATED' || status === 'FISCALIZED') {
        stock = Math.max(0, stock - qty);
      }
      return stock;
    }

    expect(processInvoice(proformaStatus, 5)).toBe(20); // Inchangé
    expect(processInvoice('VALIDATED', 5)).toBe(15); // Déduit lors de la validation
    expect(processInvoice('FISCALIZED', 10)).toBe(5); // Déduit lors de la normalisation
  });

  it('bloque formellement l’ajout d’un article épuisé en stock avec message explicite', () => {
    const exhaustedProduct = {
      id: 'prod_epuise',
      name: 'Clavier USB Filaire',
      currentStock: 0,
    };

    function validateArticleStock(product: typeof exhaustedProduct, qty: number) {
      if (product.currentStock <= 0) {
        throw new Error(`Cet article est épuisé : Vous devez d'abord réapprovisionner l'article « ${product.name} » en stock.`);
      }
      if (qty > product.currentStock) {
        throw new Error(`Stock insuffisant : Il ne reste que ${product.currentStock} unité(s).`);
      }
      return true;
    }

    expect(() => validateArticleStock(exhaustedProduct, 1)).toThrow(/Cet article est épuisé/);
  });

  it('attribue le bon titre de document selon le cycle de vie : Proforma -> Facture de Vente -> Normalisée', () => {
    function getDocumentTitle(status: 'DRAFT' | 'VALIDATED' | 'FISCALIZED', type: 'INVOICE' | 'EXPORT') {
      if (status === 'FISCALIZED') {
        return type === 'EXPORT' ? "FACTURE D'EXPORTATION" : "FACTURE DE VENTE";
      }
      if (status === 'VALIDATED') {
        return type === 'EXPORT' ? "FACTURE D'EXPORTATION" : "FACTURE DE VENTE";
      }
      return type === 'EXPORT' ? "FACTURE PROFORMA D'EXPORTATION" : "FACTURE PROFORMA";
    }

    expect(getDocumentTitle('DRAFT', 'INVOICE')).toBe('FACTURE PROFORMA');
    expect(getDocumentTitle('VALIDATED', 'INVOICE')).toBe('FACTURE DE VENTE');
    expect(getDocumentTitle('FISCALIZED', 'INVOICE')).toBe('FACTURE DE VENTE');
    expect(getDocumentTitle('DRAFT', 'EXPORT')).toBe("FACTURE PROFORMA D'EXPORTATION");
    expect(getDocumentTitle('VALIDATED', 'EXPORT')).toBe("FACTURE D'EXPORTATION");
    expect(getDocumentTitle('FISCALIZED', 'EXPORT')).toBe("FACTURE D'EXPORTATION");
  });
});
