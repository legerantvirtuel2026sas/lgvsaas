'use client';

import * as React from 'react';
import { X, Calendar, FileText, Printer, CheckCircle2, DollarSign, Clock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatFcfa } from '@/server/domain/money';
import { PayrollRunItem, PayslipItem } from '@/lib/payroll-store';

interface PayrollHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  runs: PayrollRunItem[];
  onOpenRunDetails: (run: PayrollRunItem) => void;
  onOpenPaymentsForRun: (run: PayrollRunItem) => void;
  onPrintAllSlipsForRun: (run: PayrollRunItem) => void;
  onOpenRegularization?: (run: PayrollRunItem) => void;
  onOpenComplementary?: (run: PayrollRunItem) => void;
}

export function PayrollHistoryModal({
  isOpen,
  onClose,
  runs,
  onOpenRunDetails,
  onOpenPaymentsForRun,
  onPrintAllSlipsForRun,
  onOpenRegularization,
  onOpenComplementary,
}: PayrollHistoryModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-5xl w-full p-6 shadow-2xl space-y-5 my-auto border border-gray-200 max-h-[92vh] flex flex-col">
        {/* En-tête */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Historique des Périodes de Paie Traitées</h3>
              <p className="text-xs text-gray-500">
                Consultez les livres de paie clôturés, bulletins émis et le statut des paiements des salariés et organismes.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps */}
        <div className="overflow-y-auto flex-1 pr-1 text-xs space-y-4">
          {runs.length === 0 ? (
            <div className="p-12 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed">
              <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="font-semibold text-gray-700">Aucune paie n'a encore été clôturée dans le système</p>
              <p className="text-xs text-gray-400 mt-1">
                Utilisez le bouton « Exécuter la paie mensuelle » pour lancer le premier traitement de paie.
              </p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-xl overflow-x-auto shadow-xs">
              <table className="w-full text-left text-xs min-w-[800px]">
                <thead className="bg-gray-100 font-bold text-gray-700 uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Période</th>
                    <th className="p-3 text-center">Salariés</th>
                    <th className="p-3 text-right">Masse Brute</th>
                    <th className="p-3 text-right">Cotisations CNSS</th>
                    <th className="p-3 text-right">ITS DGI</th>
                    <th className="p-3 text-right">Net à Payer</th>
                    <th className="p-3 text-right">Montant Réglé</th>
                    <th className="p-3 text-center">Statut</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white font-mono">
                  {runs.map((r) => {
                    const isAllPaid = r.totalPaidToEmployees >= r.totalNet && r.totalNet > 0;
                    const slips = r.payslips || [];
                    const mainCount = slips.filter((s) => !s.slipType || s.slipType === 'MAIN').length;
                    const regCount = slips.filter((s) => s.slipType === 'REGULARIZATION').length;
                    const compCount = slips.filter((s) => s.slipType === 'COMPLEMENTARY').length;

                    return (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="p-3 font-sans">
                          <strong className="text-gray-900 block text-xs">{r.monthLabel}</strong>
                          <span className="text-[10px] text-gray-400 font-mono">
                            Validée le {r.validatedAt ? new Date(r.validatedAt).toLocaleDateString('fr-BJ') : '—'}
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap mt-1">
                            {mainCount > 0 && (
                              <span className="inline-block text-[9px] font-medium px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                {mainCount} standard
                              </span>
                            )}
                            {regCount > 0 && (
                              <span className="inline-block text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300">
                                +{regCount} régularisation{regCount > 1 ? 's' : ''}
                              </span>
                            )}
                            {compCount > 0 && (
                              <span className="inline-block text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                                +{compCount} complémentaire{compCount > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center font-sans">
                          <span className="inline-flex items-center gap-1 font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md text-[11px]">
                            <Users className="w-3 h-3 text-blue-600" />
                            {r.employeeCount}
                          </span>
                        </td>
                        <td className="p-3 text-right font-bold text-gray-900">{formatFcfa(r.totalGross)}</td>
                        <td className="p-3 text-right text-blue-700 font-semibold">{formatFcfa(r.totalCnss)}</td>
                        <td className="p-3 text-right text-purple-700 font-bold">{formatFcfa(r.totalIts)}</td>
                        <td className="p-3 text-right font-black text-emerald-700">{formatFcfa(r.totalNet)}</td>
                        <td className="p-3 text-right font-bold text-emerald-800">
                          {formatFcfa(r.totalPaidToEmployees || 0)}
                        </td>
                        <td className="p-3 text-center font-sans">
                          <span
                            className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full ${
                              isAllPaid
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {isAllPaid ? '✓ Soldé' : '● Clôturé / En cours de règlement'}
                          </span>
                        </td>
                        <td className="p-3 font-sans">
                          <div className="flex flex-col gap-1 items-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onOpenRunDetails(r)}
                                className="h-7 px-2 text-[11px] font-semibold"
                                title="Consulter le livre de paie et récapitulatif"
                              >
                                Livre de paie
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onPrintAllSlipsForRun(r)}
                                className="h-7 px-2 text-[11px] font-semibold flex items-center gap-1 text-blue-700"
                                title="Imprimer tous les bulletins de cette période"
                              >
                                <Printer className="w-3 h-3" />
                                <span>Bulletins</span>
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => onOpenPaymentsForRun(r)}
                                className="h-7 px-2 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                                title="Suivi des règlements et paiements de cette paie"
                              >
                                Règlements
                              </Button>
                            </div>
                            <div className="flex items-center justify-center gap-1 text-[10px]">
                              {onOpenRegularization && (
                                <button
                                  type="button"
                                  onClick={() => onOpenRegularization(r)}
                                  className="text-amber-700 hover:text-amber-900 hover:underline font-semibold"
                                >
                                  + Régulariser
                                </button>
                              )}
                              {onOpenRegularization && onOpenComplementary && (
                                <span className="text-gray-300">•</span>
                              )}
                              {onOpenComplementary && (
                                <button
                                  type="button"
                                  onClick={() => onOpenComplementary(r)}
                                  className="text-blue-700 hover:text-blue-900 hover:underline font-semibold"
                                >
                                  + Salarié omis
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pied de page modal */}
        <div className="pt-3 border-t border-gray-200 flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
}
