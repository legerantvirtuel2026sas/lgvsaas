/**
 * Logique pure du domaine Stock pour LGV SaaS (Section 7.5 de PROJECT.md)
 */

export class InsufficientStockError extends Error {
  readonly status = 422;
  constructor(public productName: string, public available: number, public requested: number) {
    super(
      `Stock insuffisant pour l’article "${productName}" : ${available} disponible(s), ${requested} demandé(s).`
    );
    this.name = 'InsufficientStockError';
  }
}

/**
 * Calcule le nouveau Coût Moyen Unitaire Pondéré (CMUP) lors d'une entrée en stock.
 * Formule : Nouveau CMUP = ((Ancien Stock * Ancien CMUP) + (Quantité Entrante * Coût Achat)) / (Nouveau Stock Total)
 */
export function calculateNewCmup(
  currentStock: number,
  currentCmup: number,
  incomingQty: number,
  incomingUnitCost: number
): number {
  if (incomingQty <= 0) return Math.round(currentCmup);

  if (currentStock <= 0) {
    return Math.round(incomingUnitCost);
  }

  const existingValue = currentStock * currentCmup;
  const incomingValue = incomingQty * incomingUnitCost;
  const totalQty = currentStock + incomingQty;

  return Math.round((existingValue + incomingValue) / totalQty);
}

/**
 * Vérifie la disponibilité du stock pour une vente ou sortie.
 */
export function assertStockAvailable(
  productName: string,
  currentStock: number,
  requestedQty: number,
  allowNegativeStock: boolean = false
): void {
  if (requestedQty <= 0) return;

  if (!allowNegativeStock && currentStock < requestedQty) {
    throw new InsufficientStockError(productName, currentStock, requestedQty);
  }
}

/**
 * Calcule la valorisation totale d'une liste d'articles.
 */
export function calculateTotalStockValuation(
  items: { currentStock: number; costPrice: number }[]
): { totalUnits: number; totalValuationFcfa: number } {
  let totalUnits = 0;
  let totalValuationFcfa = 0;

  for (const item of items) {
    const qty = Math.max(0, item.currentStock);
    const cost = Math.max(0, item.costPrice);
    totalUnits += qty;
    totalValuationFcfa += qty * cost;
  }

  return {
    totalUnits,
    totalValuationFcfa,
  };
}
