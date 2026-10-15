/**
 * Domaine monétaire pour LGV SaaS
 * Règle d'or : FCFA (XOF) n'a AUCUNE décimale.
 * Tous les montants financiers sont des ENTIERS STRICTS (Int).
 * Les quantités sont représentées avec précision (Decimal/number).
 * Aucun type float n'est utilisé pour stocker ou agréger des montants.
 */

export interface InvoiceLineCalculationInput {
  quantity: number;
  unitPriceHt: number; // en FCFA entier
  discountAmount?: number; // remise fixe en FCFA
  discountRate?: number; // remise en pourcentage (ex: 5 pour 5%)
  vatRate: number; // taux TVA en pourcentage (ex: 18 pour 18%)
  costPriceSnapshot?: number; // prix de revient figé à la validation
}

export interface InvoiceLineCalculationResult {
  grossHt: number;
  discount: number;
  netHt: number;
  vatAmount: number;
  totalTtc: number;
  costTotal: number;
  grossMargin: number;
}

export interface InvoiceTotalsCalculationInput {
  lines: InvoiceLineCalculationResult[];
  globalDiscountAmount?: number;
  aibRate: 0 | 1 | 5; // AIB béninois (0%, 1% ou 5%)
}

export interface InvoiceTotalsCalculationResult {
  totalGrossHt: number;
  totalLineDiscount: number;
  globalDiscount: number;
  totalNetHt: number;
  totalVat: number;
  totalAib: number;
  netToPay: number;
  totalCost: number;
  totalGrossMargin: number;
}

/**
 * Arrondit un calcul monétaire à l'entier FCFA le plus proche (arrondi bancaire standard).
 */
export function roundFcfa(amount: number): number {
  return Math.round(amount);
}

/**
 * Dérive le montant HT et la TVA à partir d'un montant TTC (taux de TVA en %, 18% par défaut).
 */
export function deriveHtFromTtc(amountTtc: number, vatRate: number = 18): { amountHt: number; vatAmount: number } {
  const roundedTtc = Math.round(amountTtc);
  const amountHt = Math.round(roundedTtc / (1 + vatRate / 100));
  const vatAmount = roundedTtc - amountHt;
  return { amountHt, vatAmount };
}

/**
 * Calcule les totaux d'une ligne de vente ou d'achat.
 */
export function calculateLine(input: InvoiceLineCalculationInput): InvoiceLineCalculationResult {
  const quantity = Math.max(0, input.quantity);
  const unitPriceHt = Math.round(Math.max(0, input.unitPriceHt));
  const grossHt = Math.round(quantity * unitPriceHt);

  let discount = 0;
  if (input.discountAmount && input.discountAmount > 0) {
    discount = Math.min(grossHt, Math.round(input.discountAmount));
  } else if (input.discountRate && input.discountRate > 0) {
    discount = Math.min(grossHt, Math.round((grossHt * input.discountRate) / 100));
  }

  const netHt = grossHt - discount;
  const vatAmount = input.vatRate > 0 ? Math.round((netHt * input.vatRate) / 100) : 0;
  const totalTtc = netHt + vatAmount;

  const unitCost = Math.round(Math.max(0, input.costPriceSnapshot ?? 0));
  const costTotal = Math.round(quantity * unitCost);
  const grossMargin = netHt - costTotal;

  return {
    grossHt,
    discount,
    netHt,
    vatAmount,
    totalTtc,
    costTotal,
    grossMargin,
  };
}

/**
 * Calcule les totaux généraux d'une facture de vente (TVA, AIB, Net à payer, Marges).
 */
export function calculateInvoiceTotals(input: InvoiceTotalsCalculationInput): InvoiceTotalsCalculationResult {
  const totalGrossHt = input.lines.reduce((sum, line) => sum + line.grossHt, 0);
  const totalLineDiscount = input.lines.reduce((sum, line) => sum + line.discount, 0);

  const subNetHt = totalGrossHt - totalLineDiscount;
  const globalDiscount = Math.min(subNetHt, Math.round(input.globalDiscountAmount ?? 0));
  const totalNetHt = Math.max(0, subNetHt - globalDiscount);

  // Recalcul de la TVA au prorata si remise globale
  let totalVat = 0;
  if (globalDiscount > 0 && subNetHt > 0) {
    const ratio = totalNetHt / subNetHt;
    totalVat = Math.round(input.lines.reduce((sum, line) => sum + line.vatAmount, 0) * ratio);
  } else {
    totalVat = input.lines.reduce((sum, line) => sum + line.vatAmount, 0);
  }

  // AIB béninois (0%, 1%, 5% appliqué sur le Net HT total)
  const aibRate = input.aibRate ?? 0;
  const totalAib = aibRate > 0 ? Math.round((totalNetHt * aibRate) / 100) : 0;

  const netToPay = totalNetHt + totalVat + totalAib;
  const totalCost = input.lines.reduce((sum, line) => sum + line.costTotal, 0);
  const totalGrossMargin = totalNetHt - totalCost;

  return {
    totalGrossHt,
    totalLineDiscount,
    globalDiscount,
    totalNetHt,
    totalVat,
    totalAib,
    netToPay,
    totalCost,
    totalGrossMargin,
  };
}

/**
 * Formate un montant en FCFA avec espace fine / insécable : ex. "1 250 000 FCFA"
 */
export function formatFcfa(amount: number): string {
  const integerAmount = Math.round(amount || 0);
  const formatted = new Intl.NumberFormat('fr-BJ', {
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(integerAmount);
  return `${formatted} FCFA`;
}
