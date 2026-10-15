import { prisma } from '../db/client';
import { assertAuthorized, AuthContext, ForbiddenError } from '../auth/guards';

export interface DateRangeFilter {
  startDate: Date;
  endDate: Date;
}

export const statsService = {
  /**
   * Synthèse pour le tableau de bord commercial d'entreprise.
   */
  async getDashboardKpis(ctx: AuthContext, companyId: string) {
    await assertAuthorized(ctx, 'stats.view');
    if (companyId !== ctx.companyId) throw new ForbiddenError();

    const canViewProfit = ctx.role === 'OWNER' || ctx.role === 'ADMIN' || ctx.permissions.includes('profit.view');

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [todaySales, monthSales, yearSales, unpaidInvoices, stockProducts] = await Promise.all([
      prisma.salesDocument.findMany({
        where: {
          companyId,
          type: 'INVOICE',
          status: { in: ['VALIDATED', 'FISCALIZED'] },
          issueDate: { gte: startOfDay },
        },
        select: { netToPay: true, totalMargin: true, paidAmount: true },
      }),
      prisma.salesDocument.findMany({
        where: {
          companyId,
          type: 'INVOICE',
          status: { in: ['VALIDATED', 'FISCALIZED'] },
          issueDate: { gte: startOfMonth },
        },
        select: { netToPay: true, totalMargin: true, paidAmount: true },
      }),
      prisma.salesDocument.findMany({
        where: {
          companyId,
          type: 'INVOICE',
          status: { in: ['VALIDATED', 'FISCALIZED'] },
          issueDate: { gte: startOfYear },
        },
        select: { netToPay: true, totalMargin: true, paidAmount: true },
      }),
      prisma.salesDocument.findMany({
        where: {
          companyId,
          status: { in: ['VALIDATED', 'FISCALIZED'] },
          remainingAmount: { gt: 0 },
        },
        select: { remainingAmount: true },
      }),
      prisma.product.findMany({
        where: { companyId, archivedAt: null },
        select: { currentStock: true, minStockAlert: true, costPrice: true },
      }),
    ]);

    const caToday = todaySales.reduce((sum, s) => sum + s.netToPay, 0);
    const caMonth = monthSales.reduce((sum, s) => sum + s.netToPay, 0);
    const caYear = yearSales.reduce((sum, s) => sum + s.netToPay, 0);

    const marginMonth = canViewProfit
      ? monthSales.reduce((sum, s) => sum + s.totalMargin, 0)
      : null;

    const totalReceivables = unpaidInvoices.reduce((sum, inv) => sum + inv.remainingAmount, 0);
    const stockAlertCount = stockProducts.filter((p) => p.currentStock <= p.minStockAlert).length;

    return {
      caToday,
      caMonth,
      caYear,
      marginMonth,
      totalReceivables,
      stockAlertCount,
      canViewProfit,
    };
  },

  /**
   * Bilan périodique avec comparaison et achats périodiques par client.
   */
  async getPeriodicReport(ctx: AuthContext, companyId: string, range: DateRangeFilter) {
    await assertAuthorized(ctx, 'stats.view');
    if (companyId !== ctx.companyId) throw new ForbiddenError();

    const canViewProfit = ctx.role === 'OWNER' || ctx.role === 'ADMIN' || ctx.permissions.includes('profit.view');

    const sales = await prisma.salesDocument.findMany({
      where: {
        companyId,
        type: 'INVOICE',
        status: { in: ['VALIDATED', 'FISCALIZED'] },
        issueDate: { gte: range.startDate, lte: range.endDate },
      },
      include: {
        customer: true,
        payments: true,
      },
    });

    const totalSalesTtc = sales.reduce((sum, s) => sum + s.netToPay, 0);
    const totalSalesHt = sales.reduce((sum, s) => sum + s.totalNetHt, 0);
    const totalVat = sales.reduce((sum, s) => sum + s.totalVat, 0);
    const totalAib = sales.reduce((sum, s) => sum + s.aibAmount, 0);
    const totalMargin = canViewProfit
      ? sales.reduce((sum, s) => sum + s.totalMargin, 0)
      : null;

    // Répartition par moyen de paiement
    const paymentMethodsMap: Record<string, number> = {};
    for (const sale of sales) {
      for (const p of sale.payments) {
        paymentMethodsMap[p.paymentMethod] = (paymentMethodsMap[p.paymentMethod] || 0) + p.amount;
      }
    }

    return {
      totalSalesTtc,
      totalSalesHt,
      totalVat,
      totalAib,
      totalMargin,
      invoicesCount: sales.length,
      averageBasket: sales.length > 0 ? Math.round(totalSalesTtc / sales.length) : 0,
      paymentMethodsMap,
    };
  },
};
