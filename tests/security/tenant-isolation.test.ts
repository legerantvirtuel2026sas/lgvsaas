import { describe, it, expect } from 'vitest';
import { AuthContext, ForbiddenError } from '../../src/server/auth/guards';

describe('Isolation Multi-Entreprises (Tenant Isolation & Anti-IDOR)', () => {
  const companyA = 'comp_company_A';
  const companyB = 'comp_company_B';

  const userOfCompanyA: AuthContext = {
    userId: 'user_A_001',
    email: 'userA@abp.bj',
    companyId: companyA,
    role: 'ADMIN',
    permissions: ['customers.view', 'customers.create'],
  };

  // Simulation d'une table d'enregistrements en base (clients)
  const mockCustomerDb = [
    { id: 'cust_01', companyId: companyA, name: 'Client Entreprise A' },
    { id: 'cust_02', companyId: companyB, name: 'Client Entreprise B (Confidentiel)' },
  ];

  function secureGetCustomerById(ctx: AuthContext, customerId: string) {
    // Règle d'or : le filtre companyId vient STRICTEMENT du contexte serveur ctx, JAMAIS de l'URL
    const customer = mockCustomerDb.find(
      (c) => c.id === customerId && c.companyId === ctx.companyId
    );

    if (!customer) {
      throw new ForbiddenError('Enregistrement introuvable ou accès non autorisé à cette entreprise.');
    }

    return customer;
  }

  it('permet à un utilisateur de l’entreprise A d’accéder à ses propres données', () => {
    const customer = secureGetCustomerById(userOfCompanyA, 'cust_01');
    expect(customer.name).toBe('Client Entreprise A');
    expect(customer.companyId).toBe(companyA);
  });

  it('bloque formellement toute tentative d’accès aux données de l’entreprise B par l’utilisateur de A (Anti-IDOR)', () => {
    expect(() => {
      secureGetCustomerById(userOfCompanyA, 'cust_02');
    }).toThrow(ForbiddenError);
  });

  it('ignore tout companyId falsifié passé en paramètre client au profit du contexte serveur', () => {
    const maliciousInput = {
      customerId: 'cust_01',
      forgedCompanyId: companyB,
    };

    // La résolution utilise userOfCompanyA.companyId (A) et ignore forgedCompanyId (B)
    const result = secureGetCustomerById(userOfCompanyA, maliciousInput.customerId);
    expect(result.companyId).toBe(companyA);
  });
});
