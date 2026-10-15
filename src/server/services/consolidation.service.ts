import { prisma } from '../db/client';

export interface CompanyConsolidatedKpi {
  companyId: string;
  slug: string;
  name: string;
  licenseStatus: string;
  caMonth: number;
  totalReceivables: number;
  stockValuation: number;
  activeEmployees: number;
}

export interface OwnerConsolidatedDashboardResult {
  totalCompanies: number;
  grandTotals: {
    totalCaMonth: number;
    totalReceivables: number;
    totalStockValuation: number;
    totalEmployees: number;
  };
  companyBreakdown: CompanyConsolidatedKpi[];
}

export const consolidationService = {
  /**
   * Calcule le tableau de bord consolidé du propriétaire (Section 1.4 & M11 de PROJECT.md)
   * Règle d'or : n'accède qu'à des agrégats calculés entreprise par entreprise,
   * uniquement pour les sociétés où l'utilisateur détient le rôle OWNER.
   */
  async getOwnerConsolidatedDashboard(userId: string): Promise<OwnerConsolidatedDashboardResult> {
    // 1. Récupérer toutes les entreprises où l'utilisateur est OWNER actif
    const ownerMemberships = await prisma.membership.findMany({
      where: {
        userId,
        role: 'OWNER',
        isActive: true,
      },
      include: {
        company: {
          include: { license: true },
        },
      },
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 2. Calcul des agrégats indépendants, entreprise par entreprise
    const breakdown: CompanyConsolidatedKpi[] = await Promise.all(
      ownerMemberships.map(async (m) => {
        const cId = m.companyId;

        // Ventes du mois de cette entreprise uniquement
        const monthSales = await prisma.salesDocument.findMany({
          where: {
            companyId: cId,
            type: 'INVOICE',
            status: { in: ['VALIDATED', 'FISCALIZED'] },
            issueDate: { gte: startOfMonth },
          },
          select: { netToPay: true },
        });

        // Créances impayées de cette entreprise uniquement
        const receivables = await prisma.salesDocument.findMany({
          where: {
            companyId: cId,
            status: { in: ['VALIDATED', 'FISCALIZED'] },
            remainingAmount: { gt: 0 },
          },
          select: { remainingAmount: true },
        });

        // Stock valorisé de cette entreprise uniquement
        const products = await prisma.product.findMany({
          where: { companyId: cId, archivedAt: null },
          select: { currentStock: true, costPrice: true },
        });

        // Nombre de salariés
        const employeesCount = await prisma.employee.count({
          where: { companyId: cId, archivedAt: null },
        });

        const caMonth = monthSales.reduce((sum, s) => sum + s.netToPay, 0);
        const totalReceivables = receivables.reduce((sum, r) => sum + r.remainingAmount, 0);
        const stockValuation = products.reduce((sum, p) => sum + Math.max(0, p.currentStock) * Math.max(0, p.costPrice), 0);

        return {
          companyId: cId,
          slug: m.company.slug,
          name: m.company.tradeName || m.company.legalName,
          licenseStatus: m.company.license?.status || 'TRIAL',
          caMonth,
          totalReceivables,
          stockValuation,
          activeEmployees: employeesCount,
        };
      })
    );

    // 3. Somme des agrégats pour les grands totaux
    const grandTotals = breakdown.reduce(
      (acc, item) => ({
        totalCaMonth: acc.totalCaMonth + item.caMonth,
        totalReceivables: acc.totalReceivables + item.totalReceivables,
        totalStockValuation: acc.totalStockValuation + item.stockValuation,
        totalEmployees: acc.totalEmployees + item.activeEmployees,
      }),
      { totalCaMonth: 0, totalReceivables: 0, totalStockValuation: 0, totalEmployees: 0 }
    );

    return {
      totalCompanies: breakdown.length,
      grandTotals,
      companyBreakdown: breakdown,
    };
  },
};
