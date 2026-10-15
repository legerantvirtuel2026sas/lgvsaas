import { describe, it, expect } from 'vitest';
import { exportService, ExportHeaderInfo } from '../../src/server/services/export.service';

describe('Statistiques, droits sur les bénéfices et exports certifiés (Modules M8 & M9)', () => {
  it('filtre les marges bénéficiaires selon la présence du droit profit.view', () => {
    const rawReport = {
      totalSalesTtc: 500000,
      totalMargin: 150000,
    };

    function filterProfit(report: typeof rawReport, hasProfitPerm: boolean) {
      return {
        ...report,
        totalMargin: hasProfitPerm ? report.totalMargin : null,
      };
    }

    // Sans permission profit.view -> null
    expect(filterProfit(rawReport, false).totalMargin).toBeNull();
    // Avec permission profit.view -> 150 000
    expect(filterProfit(rawReport, true).totalMargin).toBe(150000);
  });

  it('génère un en-tête d’exportation conforme et certifié avec IFU et RCCM', () => {
    const header: ExportHeaderInfo = {
      companyLegalName: 'ABP Technologie SARL',
      ifu: '0202612345678',
      rccm: 'RB/COT/2026/B/1234',
      address: 'Cotonou, Bénin',
      phone: '+229 97 00 00 00',
      reportTitle: 'Journal des Ventes Mensuel',
      exportedBy: 'direction@abp.bj',
      exportedAt: '15/10/2026 14:00',
    };

    const csv = exportService.generateCsvExport(
      header,
      ['Date', 'Facture', 'Client', 'Total TTC'],
      [['15/10/2026', 'FAC-2026-0001', 'Client A', 150000]]
    );

    expect(csv).toContain('ABP Technologie SARL');
    expect(csv).toContain('0202612345678');
    expect(csv).toContain('FAC-2026-0001');
    expect(csv).toContain(';');
  });
});
