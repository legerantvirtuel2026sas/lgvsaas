import { prisma } from '../db/client';
import { assertAuthorized, AuthContext, ForbiddenError } from '../auth/guards';
import {
  CustomerInput,
  SupplierInput,
  ProductInput,
  customerSchema,
  supplierSchema,
  productSchema,
} from '../schemas/referentials.schema';
import { recordAuditEvent } from './audit';

export class ReferentialIntegrityError extends Error {
  readonly status = 409;
  constructor(public message: string, public dependencies: string[]) {
    super(message);
    this.name = 'ReferentialIntegrityError';
  }
}

export const referentialsService = {
  // ==========================================
  // CLIENTS
  // ==========================================

  async createCustomer(ctx: AuthContext, rawInput: CustomerInput) {
    await assertAuthorized(ctx, 'customers.create');
    const validated = customerSchema.parse(rawInput);

    if (validated.companyId !== ctx.companyId) {
      throw new ForbiddenError('Opération non autorisée sur cette entreprise');
    }

    const customer = await prisma.customer.create({
      data: {
        companyId: validated.companyId,
        type: validated.type,
        name: validated.name.trim(),
        ifu: validated.ifu?.trim() || null,
        rccm: validated.rccm?.trim() || null,
        phone: validated.phone.trim(),
        email: validated.email?.trim() || null,
        address: validated.address?.trim() || null,
        creditLimit: validated.creditLimit || 0,
      },
    });

    await recordAuditEvent({
      companyId: ctx.companyId,
      userId: ctx.userId,
      action: 'customers.created',
      resource: 'customer',
      resourceId: customer.id,
      details: { name: customer.name, ifu: customer.ifu },
    });

    return customer;
  },

  async listCustomers(ctx: AuthContext, companyId: string, search?: string) {
    await assertAuthorized(ctx, 'customers.view');
    if (companyId !== ctx.companyId) throw new ForbiddenError();

    return prisma.customer.findMany({
      where: {
        companyId,
        archivedAt: null,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { ifu: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
    });
  },

  async deleteCustomer(ctx: AuthContext, customerId: string) {
    await assertAuthorized(ctx, 'customers.delete');

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, companyId: ctx.companyId },
    });

    if (!customer) throw new Error('Client introuvable');

    // Règle d'intégrité : vérifier s'il existe des créances ou factures associées
    if (customer.currentDebt > 0) {
      throw new ReferentialIntegrityError(
        'Impossible de supprimer ce client car il possède un solde de créance impayé.',
        ['Factures à terme impayées', `Solde débiteur : ${customer.currentDebt} FCFA`]
      );
    }

    await prisma.customer.delete({ where: { id: customerId } });

    await recordAuditEvent({
      companyId: ctx.companyId,
      userId: ctx.userId,
      action: 'customers.deleted',
      resource: 'customer',
      resourceId: customerId,
    });

    return { success: true };
  },

  async archiveCustomer(ctx: AuthContext, customerId: string) {
    await assertAuthorized(ctx, 'customers.update');

    const archived = await prisma.customer.update({
      where: { id: customerId },
      data: { archivedAt: new Date() },
    });

    await recordAuditEvent({
      companyId: ctx.companyId,
      userId: ctx.userId,
      action: 'customers.archived',
      resource: 'customer',
      resourceId: customerId,
    });

    return archived;
  },

  // ==========================================
  // FOURNISSEURS
  // ==========================================

  async createSupplier(ctx: AuthContext, rawInput: SupplierInput) {
    await assertAuthorized(ctx, 'suppliers.create');
    const validated = supplierSchema.parse(rawInput);

    if (validated.companyId !== ctx.companyId) throw new ForbiddenError();

    const supplier = await prisma.supplier.create({
      data: {
        companyId: validated.companyId,
        name: validated.name.trim(),
        ifu: validated.ifu?.trim() || null,
        rccm: validated.rccm?.trim() || null,
        phone: validated.phone.trim(),
        email: validated.email?.trim() || null,
        address: validated.address?.trim() || null,
        paymentTermsDays: validated.paymentTermsDays || 0,
      },
    });

    await recordAuditEvent({
      companyId: ctx.companyId,
      userId: ctx.userId,
      action: 'suppliers.created',
      resource: 'supplier',
      resourceId: supplier.id,
      details: { name: supplier.name },
    });

    return supplier;
  },

  async listSuppliers(ctx: AuthContext, companyId: string) {
    await assertAuthorized(ctx, 'suppliers.view');
    if (companyId !== ctx.companyId) throw new ForbiddenError();

    return prisma.supplier.findMany({
      where: { companyId, archivedAt: null },
      orderBy: { name: 'asc' },
    });
  },

  // ==========================================
  // ARTICLES & CATALOGUE PRODUITS
  // ==========================================

  async createProduct(ctx: AuthContext, rawInput: ProductInput) {
    await assertAuthorized(ctx, 'products.create');
    const validated = productSchema.parse(rawInput);

    if (validated.companyId !== ctx.companyId) throw new ForbiddenError();

    // Vérifier unicité du SKU pour cette entreprise
    const existing = await prisma.product.findUnique({
      where: {
        companyId_sku: {
          companyId: validated.companyId,
          sku: validated.sku.trim(),
        },
      },
    });

    if (existing) {
      throw new Error(`La référence article (SKU) "${validated.sku}" est déjà utilisée.`);
    }

    const product = await prisma.product.create({
      data: {
        companyId: validated.companyId,
        sku: validated.sku.trim().toUpperCase(),
        name: validated.name.trim(),
        categoryId: validated.categoryId || null,
        unitId: validated.unitId || null,
        salePriceHt: Math.round(validated.salePriceHt),
        costPrice: Math.round(validated.costPrice),
        taxGroup: validated.taxGroup,
        trackStock: validated.trackStock,
        minStockAlert: validated.minStockAlert,
        currentStock: 0,
      },
    });

    await recordAuditEvent({
      companyId: ctx.companyId,
      userId: ctx.userId,
      action: 'products.created',
      resource: 'product',
      resourceId: product.id,
      details: { sku: product.sku, salePriceHt: product.salePriceHt },
    });

    return product;
  },

  async listProducts(ctx: AuthContext, companyId: string, search?: string) {
    await assertAuthorized(ctx, 'products.view');
    if (companyId !== ctx.companyId) throw new ForbiddenError();

    const canViewCosts = ctx.role === 'OWNER' || ctx.role === 'ADMIN' || ctx.permissions.includes('costs.view');

    const products = await prisma.product.findMany({
      where: {
        companyId,
        archivedAt: null,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        category: true,
        unit: true,
      },
      orderBy: { name: 'asc' },
    });

    // Masquer le prix de revient si l'utilisateur ne possède pas costs.view
    return products.map((p) => ({
      ...p,
      costPrice: canViewCosts ? p.costPrice : null,
    }));
  },

  async deleteProduct(ctx: AuthContext, productId: string) {
    await assertAuthorized(ctx, 'products.delete');

    const product = await prisma.product.findFirst({
      where: { id: productId, companyId: ctx.companyId },
    });

    if (!product) throw new Error('Article introuvable');

    // Règle d'intégrité : vérifier s'il existe du stock ou des mouvements
    if (product.currentStock > 0) {
      throw new ReferentialIntegrityError(
        'Impossible de supprimer cet article car il est présent en stock physique.',
        [`Stock actuel : ${product.currentStock} unités`, 'Mouvements d’inventaire existants']
      );
    }

    await prisma.product.delete({ where: { id: productId } });

    await recordAuditEvent({
      companyId: ctx.companyId,
      userId: ctx.userId,
      action: 'products.deleted',
      resource: 'product',
      resourceId: productId,
    });

    return { success: true };
  },

  async archiveProduct(ctx: AuthContext, productId: string) {
    await assertAuthorized(ctx, 'products.update');

    const archived = await prisma.product.update({
      where: { id: productId },
      data: { archivedAt: new Date() },
    });

    await recordAuditEvent({
      companyId: ctx.companyId,
      userId: ctx.userId,
      action: 'products.archived',
      resource: 'product',
      resourceId: productId,
    });

    return archived;
  },

  // ==========================================
  // IMPORT EXCEL (MIGRATION LGV DESKTOP)
  // ==========================================

  async importCustomersBatch(
    ctx: AuthContext,
    companyId: string,
    rows: { name: string; ifu?: string; phone: string; email?: string; address?: string }[]
  ) {
    await assertAuthorized(ctx, 'customers.create');
    if (companyId !== ctx.companyId) throw new ForbiddenError();

    let createdCount = 0;
    for (const row of rows) {
      if (!row.name || !row.phone) continue;
      await prisma.customer.create({
        data: {
          companyId,
          name: row.name.trim(),
          ifu: row.ifu?.trim() || null,
          phone: row.phone.trim(),
          email: row.email?.trim() || null,
          address: row.address?.trim() || null,
          type: row.ifu ? 'COMPANY' : 'INDIVIDUAL',
        },
      });
      createdCount++;
    }

    await recordAuditEvent({
      companyId,
      userId: ctx.userId,
      action: 'customers.batch_imported',
      resource: 'customer',
      details: { importedCount: createdCount },
    });

    return { importedCount: createdCount };
  },

  async importProductsBatch(
    ctx: AuthContext,
    companyId: string,
    rows: { sku: string; name: string; salePriceHt: number; costPrice?: number; taxGroup?: 'A' | 'B' | 'C' | 'D' }[]
  ) {
    await assertAuthorized(ctx, 'products.create');
    if (companyId !== ctx.companyId) throw new ForbiddenError();

    let createdCount = 0;
    for (const row of rows) {
      if (!row.sku || !row.name || !row.salePriceHt) continue;

      const existing = await prisma.product.findUnique({
        where: {
          companyId_sku: {
            companyId,
            sku: row.sku.trim().toUpperCase(),
          },
        },
      });

      if (existing) continue; // Ignorer les doublons de référence

      await prisma.product.create({
        data: {
          companyId,
          sku: row.sku.trim().toUpperCase(),
          name: row.name.trim(),
          salePriceHt: Math.round(row.salePriceHt),
          costPrice: Math.round(row.costPrice || 0),
          taxGroup: row.taxGroup || 'B',
        },
      });
      createdCount++;
    }

    await recordAuditEvent({
      companyId,
      userId: ctx.userId,
      action: 'products.batch_imported',
      resource: 'product',
      details: { importedCount: createdCount },
    });

    return { importedCount: createdCount };
  },
};
