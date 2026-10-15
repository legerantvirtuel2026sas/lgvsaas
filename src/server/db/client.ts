/**
 * Client de base de données multi-tenant avec support de Row Level Security (RLS) PostgreSQL
 * Positionne la variable de session `app.current_company_id` pour chaque transaction.
 */

import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma =
  globalThis.prismaGlobal ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

/**
 * Exécute une opération transactionnelle avec injection obligatoire du companyId dans la session PostgreSQL.
 * Active le Row Level Security (RLS) au niveau du moteur PostgreSQL.
 */
export async function withTenantTransaction<T>(
  companyId: string,
  callback: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  if (!companyId) {
    throw new Error('companyId requis pour exécuter une transaction avec isolation multi-tenant');
  }

  return prisma.$transaction(async (tx) => {
    // Injecter la variable de session PostgreSQL app.current_company_id
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.current_company_id', $1, true);`,
      companyId
    );

    return callback(tx as unknown as PrismaClient);
  });
}
