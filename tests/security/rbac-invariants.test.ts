import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  ADMIN_DEFAULT_PERMISSIONS,
} from '../../src/server/auth/permissions';
import {
  assertAuthorized,
  assertLastOwnerProtected,
  assertNoPrivilegeEscalation,
  ForbiddenError,
  SecurityInvariantError,
  AuthContext,
} from '../../src/server/auth/guards';

describe('RBAC et Invariants de sécurité stricts', () => {
  const companyA = 'comp_123456';

  const ownerCtx: AuthContext = {
    userId: 'user_owner',
    email: 'owner@abp.bj',
    companyId: companyA,
    role: 'OWNER',
    permissions: [],
  };

  const adminCtx: AuthContext = {
    userId: 'user_admin',
    email: 'admin@abp.bj',
    companyId: companyA,
    role: 'ADMIN',
    permissions: [...ADMIN_DEFAULT_PERMISSIONS],
  };

  const sellerCtx: AuthContext = {
    userId: 'user_seller',
    email: 'seller@abp.bj',
    companyId: companyA,
    role: 'USER',
    permissions: ['sales.create', 'sales.view', 'customers.view'],
  };

  it('accorde toutes les permissions au rôle OWNER', () => {
    expect(hasPermission('OWNER', [], 'users.delete')).toBe(true);
    expect(hasPermission('OWNER', [], 'sales.validate')).toBe(true);
    expect(hasPermission('OWNER', [], 'settings.manage')).toBe(true);
  });

  it('interdit la permission users.delete au rôle ADMIN', () => {
    expect(hasPermission('ADMIN', [...ADMIN_DEFAULT_PERMISSIONS], 'users.delete')).toBe(false);
  });

  it('permet au vendeur standard uniquement ses permissions explicites', () => {
    expect(hasPermission('USER', sellerCtx.permissions, 'sales.create')).toBe(true);
    expect(hasPermission('USER', sellerCtx.permissions, 'sales.delete')).toBe(false);
    expect(hasPermission('USER', sellerCtx.permissions, 'costs.view')).toBe(false);
  });

  it('Invariant : le garde rejette fermement une tentative de users.delete par un ADMIN', async () => {
    await expect(assertAuthorized(adminCtx, 'users.delete')).rejects.toThrow(ForbiddenError);
  });

  it('Invariant : le garde rejette une action non concédée à un USER', async () => {
    await expect(assertAuthorized(sellerCtx, 'products.create')).rejects.toThrow(ForbiddenError);
  });

  it('Invariant : impossible de supprimer ou retirer le dernier propriétaire d’une entreprise', () => {
    const singleOwnerList = [{ userId: 'user_owner', isActive: true }];

    expect(() => {
      assertLastOwnerProtected('user_owner', singleOwnerList);
    }).toThrow(SecurityInvariantError);
  });

  it('permet de retirer un propriétaire s’il en reste au moins un autre actif', () => {
    const multiOwnerList = [
      { userId: 'user_owner_1', isActive: true },
      { userId: 'user_owner_2', isActive: true },
    ];

    expect(() => {
      assertLastOwnerProtected('user_owner_1', multiOwnerList);
    }).not.toThrow();
  });

  it('Invariant : anti-élévation de privilèges (un ADMIN ne peut pas attribuer le rôle OWNER)', () => {
    expect(() => {
      assertNoPrivilegeEscalation('ADMIN', adminCtx.permissions, 'OWNER', ['users.delete']);
    }).toThrow(ForbiddenError);
  });

  it('Invariant : anti-élévation de privilèges (un ADMIN ne peut pas concéder users.delete)', () => {
    expect(() => {
      assertNoPrivilegeEscalation('ADMIN', adminCtx.permissions, 'USER', ['users.delete']);
    }).toThrow(ForbiddenError);
  });
});
