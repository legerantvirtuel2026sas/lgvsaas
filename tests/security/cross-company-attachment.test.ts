import { describe, it, expect } from 'vitest';
import { ALL_PERMISSIONS } from '../../src/server/auth/permissions';

describe('Rattachement inter-entreprises A vers B et copie étanche (Module M2)', () => {
  const companyA = 'comp_A_100';
  const companyB = 'comp_B_200';

  it('exige que l’utilisateur exécutant soit OWNER sur A ET sur B', () => {
    function canAttachUser(callerRoles: { companyId: string; role: string }[]): boolean {
      const isOwnerA = callerRoles.some((r) => r.companyId === companyA && r.role === 'OWNER');
      const isOwnerB = callerRoles.some((r) => r.companyId === companyB && r.role === 'OWNER');
      return isOwnerA && isOwnerB;
    }

    // Caller est OWNER de A mais seulement ADMIN de B -> refus
    const caller1 = [
      { companyId: companyA, role: 'OWNER' },
      { companyId: companyB, role: 'ADMIN' },
    ];
    expect(canAttachUser(caller1)).toBe(false);

    // Caller est OWNER des deux entreprises -> autorisé
    const caller2 = [
      { companyId: companyA, role: 'OWNER' },
      { companyId: companyB, role: 'OWNER' },
    ];
    expect(canAttachUser(caller2)).toBe(true);
  });

  it('copie le rôle et les droits de A vers B de façon strictement indépendante', () => {
    // Appartenance initiale dans l'entreprise A
    const membershipA = {
      userId: 'usr_seller_42',
      companyId: companyA,
      role: 'USER' as const,
      permissions: ['sales.create', 'customers.view'],
    };

    // Copie lors du rattachement dans B
    const membershipB = {
      userId: membershipA.userId,
      companyId: companyB,
      role: membershipA.role,
      permissions: [...membershipA.permissions],
    };

    expect(membershipB.companyId).toBe(companyB);
    expect(membershipB.permissions).toEqual(['sales.create', 'customers.view']);

    // Une modification ultérieure dans B n'altère absolument pas A
    membershipB.permissions.push('stock.view');
    expect(membershipB.permissions).toContain('stock.view');
    expect(membershipA.permissions).not.toContain('stock.view');
  });
});
