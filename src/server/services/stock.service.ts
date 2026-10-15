import { prisma } from '../db/client';
import { assertAuthorized, AuthContext, ForbiddenError } from '../auth/guards';
import { calculateNewCmup, assertStockAvailable, calculateTotalStockValuation } from '../domain/stock';
import { recordAuditEvent } from './audit';

export interface RecordStockMovementInput {
  companyId: string;
  productId: string;
  warehouseId?: string;
  type: 'IN' | 'OUT' | 'ADJUST' | 'RETURN';
  quantity: number; // Toujours un entier positif
  unitCost?: number;
  reason?: string;
  refType?: string;
  refId?: string;
}

export const stockService = {
  /**
   * Enregistre un mouvement de stock avec mise à jour atomique du stock courant et du CMUP.
   */
  async recordMovement(ctx: AuthContext, input: RecordStockMovementInput) {
    if (input.type === 'ADJUST') {
      await assertAuthorized(ctx, 'stock.adjust');
      if (!input.reason || input.reason.trim().length === 0) {
        throw new Error('Un motif est obligatoire pour tout ajustement de stock manuel.');
      }
    } else {
      await assertAuthorized(ctx, 'stock.view');
    }

    if (input.companyId !== ctx.companyId) throw new ForbiddenError();

    const product = await prisma.product.findFirst({
      where: { id: input.productId, companyId: ctx.companyId },
      include: {
        company: {
          include: { settings: true },
        },
      },
    });

    if (!product) throw new Error('Article introuvable');

    const allowNegative = product.company.settings?.allowNegativeStock ?? false;
    const qty = Math.abs(input.quantity);
    const unitCost = input.unitCost !== undefined ? Math.round(input.unitCost) : product.costPrice;

    // Transaction atomique
    return prisma.$transaction(async (tx) => {
      let delta = 0;
      let newCmup = product.costPrice;

      if (input.type === 'IN' || input.type === 'RETURN') {
        delta = qty;
        // Recalcul du CMUP lors d'une entrée en stock
        if (input.type === 'IN') {
          newCmup = calculateNewCmup(product.currentStock, product.costPrice, qty, unitCost);
        }
      } else if (input.type === 'OUT') {
        assertStockAvailable(product.name, product.currentStock, qty, allowNegative);
        delta = -qty;
      } else if (input.type === 'ADJUST') {
        // Quantité d'ajustement relative (positive ou négative)
        delta = input.quantity;
        if (product.currentStock + delta < 0 && !allowNegative) {
          throw new Error('L’ajustement rendrait le stock physique négatif');
        }
      }

      const updatedStock = product.currentStock + delta;

      // 1. Mettre à jour l'article
      const updatedProduct = await tx.product.update({
        where: { id: product.id },
        data: {
          currentStock: updatedStock,
          costPrice: newCmup,
        },
      });

      // 2. Créer la ligne de mouvement
      const movement = await tx.stockMovement.create({
        data: {
          companyId: ctx.companyId,
          productId: product.id,
          warehouseId: input.warehouseId || null,
          type: input.type,
          quantity: delta,
          unitCost,
          reason: input.reason || null,
          refType: input.refType || 'MANUAL',
          refId: input.refId || null,
          createdBy: ctx.userId,
        },
      });

      return { movement, updatedProduct };
    });
  },

  /**
   * Synthèse de l'état des stocks et alertes de seuil pour l'entreprise.
   */
  async getStockOverview(ctx: AuthContext, companyId: string) {
    await assertAuthorized(ctx, 'stock.view');
    if (companyId !== ctx.companyId) throw new ForbiddenError();

    const products = await prisma.product.findMany({
      where: { companyId, archivedAt: null },
      select: {
        id: true,
        sku: true,
        name: true,
        currentStock: true,
        minStockAlert: true,
        costPrice: true,
        salePriceHt: true,
      },
    });

    const outOfStockCount = products.filter((p) => p.currentStock <= 0).length;
    const underAlertCount = products.filter(
      (p) => p.currentStock > 0 && p.currentStock <= p.minStockAlert
    ).length;

    const valuation = calculateTotalStockValuation(products);

    return {
      totalProducts: products.length,
      outOfStockCount,
      underAlertCount,
      totalUnits: valuation.totalUnits,
      totalValuationFcfa: valuation.totalValuationFcfa,
    };
  },
};
