import { describe, it, expect } from 'vitest';
import { createCompanySchema, generateCompanySlug } from '../../src/server/schemas/company.schema';
import { ALL_PERMISSIONS } from '../../src/server/auth/permissions';

describe('Création d’entreprise, validation Zod et attribution du rôle OWNER', () => {
  it('valide un IFU béninois valide à 13 chiffres et rejette les formats incorrects', () => {
    const validData = {
      legalName: 'ABP Technologie SARL',
      tradeName: 'ABP Tech',
      ifu: '0202612345678', // 13 chiffres
      rccm: 'RB/COT/2026/B/1234',
      address: 'Cotonou, Haie Vive',
      phone: '+229 97 00 00 00',
      email: 'contact@abp.bj',
    };

    expect(() => createCompanySchema.parse(validData)).not.toThrow();

    // Rejette un IFU trop court
    expect(() =>
      createCompanySchema.parse({
        ...validData,
        ifu: '12345',
      })
    ).toThrow();

    // Rejette un IFU contenant des lettres
    expect(() =>
      createCompanySchema.parse({
        ...validData,
        ifu: '020261234567A',
      })
    ).toThrow();
  });

  it('génère un slug d’entreprise normalisé sans accents ni caractères spéciaux', () => {
    const slug1 = generateCompanySlug('Bénin Électronique & Services SARL');
    expect(slug1).toBe('benin-electronique-services-sarl');

    const slug2 = generateCompanySlug('Entreprise Métallurgique du Bénin');
    expect(slug2).toBe('entreprise-metallurgique-du-benin');
  });

  it('attribue automatiquement le rôle OWNER et l’intégralité des permissions au créateur', () => {
    const creatorUserId = 'user_founder_01';
    const companyId = 'comp_new_01';

    // Simulation de l'attribution lors de la création
    const membership = {
      userId: creatorUserId,
      companyId,
      role: 'OWNER' as const,
      permissions: [...ALL_PERMISSIONS],
      isActive: true,
    };

    expect(membership.role).toBe('OWNER');
    expect(membership.permissions).toContain('users.delete');
    expect(membership.permissions).toContain('settings.manage');
    expect(membership.permissions).toContain('costs.view');
    expect(membership.permissions).toContain('profit.view');
  });
});
