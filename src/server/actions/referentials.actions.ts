'use server';

import { cookies } from 'next/headers';
import { validateSessionToken } from '../auth/session';
import { prisma } from '../db/client';
import { referentialsService } from '../services/referentials.service';
import { AuthContext, UnauthorizedError, ForbiddenError } from '../auth/guards';
import { CustomerInput, SupplierInput, ProductInput } from '../schemas/referentials.schema';

const COOKIE_NAME = 'auth_session';

async function buildAuthContext(companyId: string): Promise<AuthContext> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) throw new UnauthorizedError();

  const user = await validateSessionToken(token);
  if (!user) throw new UnauthorizedError();

  const membership = await prisma.membership.findUnique({
    where: {
      userId_companyId: {
        userId: user.id,
        companyId,
      },
    },
  });

  if (!membership || !membership.isActive) {
    throw new ForbiddenError('Accès non autorisé à cette entreprise');
  }

  return {
    userId: user.id,
    email: user.email,
    companyId,
    role: membership.role,
    permissions: membership.permissions,
  };
}

// Clients
export async function createCustomerAction(input: CustomerInput) {
  try {
    const ctx = await buildAuthContext(input.companyId);
    const customer = await referentialsService.createCustomer(ctx, input);
    return { success: true, customer };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Erreur création client' };
  }
}

export async function listCustomersAction(companyId: string, search?: string) {
  try {
    const ctx = await buildAuthContext(companyId);
    const customers = await referentialsService.listCustomers(ctx, companyId, search);
    return { success: true, customers };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Erreur lecture clients', customers: [] };
  }
}

export async function deleteCustomerAction(companyId: string, customerId: string) {
  try {
    const ctx = await buildAuthContext(companyId);
    await referentialsService.deleteCustomer(ctx, customerId);
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Erreur suppression client' };
  }
}

// Fournisseurs
export async function createSupplierAction(input: SupplierInput) {
  try {
    const ctx = await buildAuthContext(input.companyId);
    const supplier = await referentialsService.createSupplier(ctx, input);
    return { success: true, supplier };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Erreur création fournisseur' };
  }
}

export async function listSuppliersAction(companyId: string) {
  try {
    const ctx = await buildAuthContext(companyId);
    const suppliers = await referentialsService.listSuppliers(ctx, companyId);
    return { success: true, suppliers };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Erreur lecture fournisseurs', suppliers: [] };
  }
}

// Articles
export async function createProductAction(input: ProductInput) {
  try {
    const ctx = await buildAuthContext(input.companyId);
    const product = await referentialsService.createProduct(ctx, input);
    return { success: true, product };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Erreur création article' };
  }
}

export async function listProductsAction(companyId: string, search?: string) {
  try {
    const ctx = await buildAuthContext(companyId);
    const products = await referentialsService.listProducts(ctx, companyId, search);
    return { success: true, products };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Erreur lecture articles', products: [] };
  }
}

export async function deleteProductAction(companyId: string, productId: string) {
  try {
    const ctx = await buildAuthContext(companyId);
    await referentialsService.deleteProduct(ctx, productId);
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Erreur suppression article' };
  }
}
