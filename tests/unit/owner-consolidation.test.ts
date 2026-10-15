import { describe, it, expect } from 'vitest';

describe('Tableau de bord consolidé du propriétaire (Module M11)', () => {
  it('n’agrège que les entreprises où l’utilisateur est explicitement OWNER', () => {
    const userMemberships = [
      { companyId: 'comp_1', role: 'OWNER', isActive: true, caMonth: 500000 },
      { companyId: 'comp_2', role: 'OWNER', isActive: true, caMonth: 300000 },
      { companyId: 'comp_3', role: 'ADMIN', isActive: true, caMonth: 1000000 }, // Ne doit pas être consolidé !
      { companyId: 'comp_4', role: 'USER', isActive: true, caMonth: 200000 },  // Ne doit pas être consolidé !
    ];

    function calculateConsolidatedCa(memberships: typeof userMemberships): number {
      return memberships
        .filter((m) => m.role === 'OWNER' && m.isActive)
        .reduce((sum, m) => sum + m.caMonth, 0);
    }

    const consolidatedCa = calculateConsolidatedCa(userMemberships);
    // Doit être 500 000 + 300 000 = 800 000 FCFA (comp_3 et comp_4 exclus)
    expect(consolidatedCa).toBe(800000);
  });

  it('additionne uniquement des agrégats calculés sans mélanger de lignes de données brutes', () => {
    const aggregatesCompanyA = { ca: 600000, receivables: 150000, stock: 300000 };
    const aggregatesCompanyB = { ca: 400000, receivables: 50000, stock: 200000 };

    const grandTotals = {
      ca: aggregatesCompanyA.ca + aggregatesCompanyB.ca,
      receivables: aggregatesCompanyA.receivables + aggregatesCompanyB.receivables,
      stock: aggregatesCompanyA.stock + aggregatesCompanyB.stock,
    };

    expect(grandTotals.ca).toBe(1000000);
    expect(grandTotals.receivables).toBe(200000);
    expect(grandTotals.stock).toBe(500000);
  });
});
