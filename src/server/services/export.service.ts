import { prisma } from '../db/client';
import { assertAuthorized, AuthContext, ForbiddenError } from '../auth/guards';
import { recordAuditEvent } from './audit';

export interface ExportHeaderInfo {
  companyLegalName: string;
  ifu: string;
  rccm?: string | null;
  address: string;
  phone: string;
  reportTitle: string;
  exportedBy: string;
  exportedAt: string;
}

export const exportService = {
  /**
   * Construit l'en-tête officiel certifié pour tout export Excel ou PDF.
   */
  async getCertifiedExportHeader(ctx: AuthContext, companyId: string, reportTitle: string): Promise<ExportHeaderInfo> {
    await assertAuthorized(ctx, 'exports.export');
    if (companyId !== ctx.companyId) throw new ForbiddenError();

    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) throw new Error('Entreprise introuvable');

    const nowFormatted = new Date().toLocaleDateString('fr-BJ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    await recordAuditEvent({
      companyId,
      userId: ctx.userId,
      action: 'exports.generated',
      resource: 'export',
      details: { reportTitle },
    });

    return {
      companyLegalName: company.legalName,
      ifu: company.ifu,
      rccm: company.rccm,
      address: company.address,
      phone: company.phone,
      reportTitle,
      exportedBy: ctx.email,
      exportedAt: nowFormatted,
    };
  },

  /**
   * Génère un flux CSV prêt pour l'export Excel avec séparateur point-virgule (standard francophone)
   */
  generateCsvExport(
    header: ExportHeaderInfo,
    columns: string[],
    rows: (string | number)[][]
  ): string {
    const lines: string[] = [];

    // En-tête de société certifié
    lines.push(`"${header.companyLegalName}" - IFU: ${header.ifu} - RCCM: ${header.rccm || 'N/A'}`);
    lines.push(`Adresse: "${header.address}" - Tél: "${header.phone}"`);
    lines.push(`Rapport: "${header.reportTitle}" - Exporté le: ${header.exportedAt} par ${header.exportedBy}`);
    lines.push(''); // Ligne vide

    // Colonnes
    lines.push(columns.map((c) => `"${c.replace(/"/g, '""')}"`).join(';'));

    // Données
    for (const row of rows) {
      lines.push(
        row
          .map((val) => {
            if (typeof val === 'number') return val.toString();
            return `"${String(val ?? '').replace(/"/g, '""')}"`;
          })
          .join(';')
      );
    }

    return lines.join('\r\n');
  },
};
