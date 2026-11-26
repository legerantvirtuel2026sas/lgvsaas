'use client';

import * as React from 'react';
import { X, Printer, FileText, Download, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatFcfa } from '@/server/domain/money';
import { PayslipItem } from '@/lib/payroll-store';

interface PayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  payslip: PayslipItem | null;
  companyDisplayName: string;
}

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export function PayslipModal({
  isOpen,
  onClose,
  payslip,
  companyDisplayName,
}: PayslipModalProps) {
  if (!isOpen || !payslip) return null;

  const monthLabel = `${MONTH_NAMES[payslip.periodMonth - 1]} ${payslip.periodYear}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto print:block">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-auto border border-gray-200 max-h-[95vh] flex flex-col print:max-h-none print:h-auto print:shadow-none print:border-none print:p-0 print:w-full print:max-w-none print:block">
        {/* Barre de navigation modale (masquée à l'impression) */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span className="font-bold text-sm text-gray-900">
              Bulletin de Paie Officiel • {payslip.employeeName} ({payslip.payslipNumber})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => window.print()}
              className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer le Bulletin</span>
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CORPS DU BULLETIN DE PAIE CONFORME CODE DU TRAVAIL & CGI BÉNIN */}
        {/* ========================================================================= */}
        <div className="overflow-y-auto flex-1 space-y-4 text-xs text-gray-800 pr-1 print:overflow-visible print:pr-0">
          
          {/* En-tête employeur & Période */}
          <div className="flex items-start justify-between border-b pb-4">
            <div>
              <span className="text-xl font-black text-blue-700 block tracking-tight">{companyDisplayName}</span>
              <p className="text-[11px] text-gray-600">IFU : 0202612345678 • N° CNSS Employeur : 2026-AB123</p>
              <p className="text-[11px] text-gray-600">Cotonou, République du Bénin • Tél : +229 97 00 00 00</p>
            </div>
            <div className="text-right">
              {payslip.slipType === 'REGULARIZATION' ? (
                <span className="inline-block px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded font-black text-xs uppercase">
                  BULLETIN DE RÉGULARISATION
                </span>
              ) : payslip.slipType === 'COMPLEMENTARY' ? (
                <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded font-black text-xs uppercase">
                  PAIE COMPLÉMENTAIRE
                </span>
              ) : (
                <span className="inline-block px-3 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded font-black text-xs uppercase">
                  BULLETIN DE PAIE
                </span>
              )}
              <p className="text-xs font-bold text-gray-900 mt-1 font-mono">{payslip.payslipNumber}</p>
              <p className="text-xs font-bold text-blue-700 mt-0.5">Période : {monthLabel}</p>
              <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                Règlement : {payslip.paymentMethod || 'Virement bancaire'}
              </p>
            </div>
          </div>

          {/* Bannière de justification si régularisation */}
          {payslip.slipType === 'REGULARIZATION' && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 text-amber-950 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold">
                <span>Régularisation attachée au bulletin n° {payslip.originalPayslipNumber || 'Initial'}</span>
                <span className="text-[10px] uppercase bg-amber-200 px-2 py-0.5 rounded text-amber-900">Ajustement certifié</span>
              </div>
              <p className="text-[11px] text-amber-900 italic">
                Motif : « {payslip.regularizationReason || 'Ajustement de paie'} »
              </p>
            </div>
          )}

          {/* Bannière de justification si paie complémentaire */}
          {payslip.slipType === 'COMPLEMENTARY' && (
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-blue-950 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold">
                <span>Bulletin complémentaire (salarié omis lors de la paie principale)</span>
                <span className="text-[10px] uppercase bg-blue-200 px-2 py-0.5 rounded text-blue-900">Rattachement validé</span>
              </div>
              {payslip.regularizationReason && (
                <p className="text-[11px] text-blue-800 italic">
                  Note : « {payslip.regularizationReason} »
                </p>
              )}
            </div>
          )}

          {/* Coordonnées complètes du salarié */}
          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-bold block mb-0.5">Salarié :</span>
              <strong className="text-sm text-gray-900 block">{payslip.employeeName}</strong>
              <span className="text-gray-600 block">Poste : {payslip.employeeJob}</span>
              <span className="text-gray-500 text-[10px] block">Département : {payslip.employeeDepartment}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-gray-400 uppercase font-bold block mb-0.5">Matricule & Identifiants :</span>
              <span className="font-mono font-bold text-blue-700 block">{payslip.employeeMatricule}</span>
              <span className="text-gray-600 block">N° CNSS : {payslip.employeeCnss}</span>
              <div className="mt-1">
                <span
                  className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    payslip.paymentStatus === 'PAYE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : payslip.paymentStatus === 'PARTIEL'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {payslip.paymentStatus === 'PAYE' ? 'Payé' : payslip.paymentStatus === 'PARTIEL' ? 'Partiellement payé' : 'Non payé'}
                </span>
              </div>
            </div>
          </div>

          {/* Tableau détaillé des rubriques de paie */}
          <table className="w-full text-left text-xs border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-100 text-gray-700 uppercase font-bold text-[10px]">
              <tr className="border-b">
                <th className="p-2.5">Rubriques de paie</th>
                <th className="p-2.5 text-right">Base / Assiette</th>
                <th className="p-2.5 text-center">Taux</th>
                <th className="p-2.5 text-right">Part Salariale</th>
                <th className="p-2.5 text-right">Part Patronale (Bénin)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-mono">
              {/* Salaire de base */}
              <tr>
                <td className="p-2.5 font-sans font-semibold">Salaire de Base Brut</td>
                <td className="p-2.5 text-right">{formatFcfa(payslip.baseSalary)}</td>
                <td className="p-2.5 text-center">—</td>
                <td className="p-2.5 text-right font-bold text-gray-900">+{formatFcfa(payslip.baseSalary)}</td>
                <td className="p-2.5 text-right text-gray-400">—</td>
              </tr>

              {/* Primes habituelles */}
              {payslip.transportAllowance > 0 && (
                <tr>
                  <td className="p-2.5 font-sans">Prime de transport</td>
                  <td className="p-2.5 text-right">{formatFcfa(payslip.transportAllowance)}</td>
                  <td className="p-2.5 text-center">—</td>
                  <td className="p-2.5 text-right font-bold text-gray-900">+{formatFcfa(payslip.transportAllowance)}</td>
                  <td className="p-2.5 text-right text-gray-400">—</td>
                </tr>
              )}
              {payslip.mealAllowance > 0 && (
                <tr>
                  <td className="p-2.5 font-sans">Prime de panier</td>
                  <td className="p-2.5 text-right">{formatFcfa(payslip.mealAllowance)}</td>
                  <td className="p-2.5 text-center">—</td>
                  <td className="p-2.5 text-right font-bold text-gray-900">+{formatFcfa(payslip.mealAllowance)}</td>
                  <td className="p-2.5 text-right text-gray-400">—</td>
                </tr>
              )}
              {payslip.rendementAllowance > 0 && (
                <tr>
                  <td className="p-2.5 font-sans">Prime de rendement</td>
                  <td className="p-2.5 text-right">{formatFcfa(payslip.rendementAllowance)}</td>
                  <td className="p-2.5 text-center">—</td>
                  <td className="p-2.5 text-right font-bold text-gray-900">+{formatFcfa(payslip.rendementAllowance)}</td>
                  <td className="p-2.5 text-right text-gray-400">—</td>
                </tr>
              )}
              {payslip.responsibilityAllowance > 0 && (
                <tr>
                  <td className="p-2.5 font-sans">Prime de responsabilité</td>
                  <td className="p-2.5 text-right">{formatFcfa(payslip.responsibilityAllowance)}</td>
                  <td className="p-2.5 text-center">—</td>
                  <td className="p-2.5 text-right font-bold text-gray-900">+{formatFcfa(payslip.responsibilityAllowance)}</td>
                  <td className="p-2.5 text-right text-gray-400">—</td>
                </tr>
              )}
              {payslip.overtimeAmount > 0 && (
                <tr>
                  <td className="p-2.5 font-sans">Heures supplémentaires</td>
                  <td className="p-2.5 text-right">{formatFcfa(payslip.overtimeAmount)}</td>
                  <td className="p-2.5 text-center">—</td>
                  <td className="p-2.5 text-right font-bold text-gray-900">+{formatFcfa(payslip.overtimeAmount)}</td>
                  <td className="p-2.5 text-right text-gray-400">—</td>
                </tr>
              )}
              {payslip.commissions > 0 && (
                <tr>
                  <td className="p-2.5 font-sans">Commissions sur ventes</td>
                  <td className="p-2.5 text-right">{formatFcfa(payslip.commissions)}</td>
                  <td className="p-2.5 text-center">—</td>
                  <td className="p-2.5 text-right font-bold text-gray-900">+{formatFcfa(payslip.commissions)}</td>
                  <td className="p-2.5 text-right text-gray-400">—</td>
                </tr>
              )}
              {payslip.exceptionalBonus > 0 && (
                <tr>
                  <td className="p-2.5 font-sans">Primes exceptionnelles</td>
                  <td className="p-2.5 text-right">{formatFcfa(payslip.exceptionalBonus)}</td>
                  <td className="p-2.5 text-center">—</td>
                  <td className="p-2.5 text-right font-bold text-gray-900">+{formatFcfa(payslip.exceptionalBonus)}</td>
                  <td className="p-2.5 text-right text-gray-400">—</td>
                </tr>
              )}

              {/* Ligne TOTAL BRUT */}
              <tr className="bg-gray-50/70 font-bold border-y">
                <td className="p-2.5 font-sans text-gray-900 uppercase">Total Salaire Brut</td>
                <td className="p-2.5 text-right text-gray-900">{formatFcfa(payslip.grossSalary)}</td>
                <td className="p-2.5 text-center">—</td>
                <td className="p-2.5 text-right text-gray-900">+{formatFcfa(payslip.grossSalary)}</td>
                <td className="p-2.5 text-right text-gray-400">—</td>
              </tr>

              {/* Cotisations CNSS Salarié (3.6%) et Patronale (17.4%) */}
              <tr>
                <td className="p-2.5 font-sans">
                  Cotisation CNSS Régime Général
                  <span className="block text-[10px] text-gray-500 font-sans">
                    Employeur : Retraite (6.4%) + Famille (9%) + Accidents (2%)
                  </span>
                </td>
                <td className="p-2.5 text-right">{formatFcfa(payslip.grossSalary)}</td>
                <td className="p-2.5 text-center">3,6% / 17,4%</td>
                <td className="p-2.5 text-right text-blue-700 font-bold">-{formatFcfa(payslip.cnssEmployee)}</td>
                <td className="p-2.5 text-right text-blue-900 font-semibold">{formatFcfa(payslip.cnssEmployer)}</td>
              </tr>

              {/* Retenue fiscale ITS */}
              <tr>
                <td className="p-2.5 font-sans">
                  Retenue fiscale ITS (DGI Bénin)
                  <span className="block font-sans text-[10px] text-gray-500 font-normal">
                    Assiette imposable : {formatFcfa(payslip.taxableBase)}
                  </span>
                </td>
                <td className="p-2.5 text-right">{formatFcfa(payslip.taxableBase)}</td>
                <td className="p-2.5 text-center">Barème CGI (0-30%)</td>
                <td className="p-2.5 text-right text-purple-700 font-bold">-{formatFcfa(payslip.itsAmount)}</td>
                <td className="p-2.5 text-right text-gray-400">—</td>
              </tr>

              {/* Retenue avance sur salaire */}
              {payslip.advanceDeduction > 0 && (
                <tr>
                  <td className="p-2.5 font-sans">Remboursement avance sur salaire</td>
                  <td className="p-2.5 text-right">—</td>
                  <td className="p-2.5 text-center">—</td>
                  <td className="p-2.5 text-right text-rose-700 font-bold">-{formatFcfa(payslip.advanceDeduction)}</td>
                  <td className="p-2.5 text-right text-gray-400">—</td>
                </tr>
              )}

              {/* Autres retenues éventuelles */}
              {payslip.otherDeductions > 0 && (
                <tr>
                  <td className="p-2.5 font-sans">Autres retenues / Absences</td>
                  <td className="p-2.5 text-right">—</td>
                  <td className="p-2.5 text-center">—</td>
                  <td className="p-2.5 text-right text-rose-700 font-bold">-{formatFcfa(payslip.otherDeductions)}</td>
                  <td className="p-2.5 text-right text-gray-400">—</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Cadre NET À PAYER */}
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-300 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-emerald-800 uppercase block">NET À PAYER AU SALARIÉ</span>
              <span className="text-[11px] text-emerald-700">Net d'impôt et de cotisations sociales</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-emerald-800 font-mono block">
                {formatFcfa(payslip.netToPay)}
              </span>
            </div>
          </div>

          {/* Charges patronales et coût global employeur */}
          <div className="p-3 bg-gray-50 rounded-lg border text-[11px] flex items-center justify-between text-gray-600">
            <span>Charges patronales CNSS (17,4%) : <strong>{formatFcfa(payslip.cnssEmployer)}</strong></span>
            <span>Coût total entreprise : <strong>{formatFcfa(payslip.employerTotalCost)}</strong></span>
          </div>

          {/* Mentions légales et signature */}
          <div className="pt-4 border-t grid grid-cols-2 gap-4 text-[10px] text-gray-500">
            <div>
              <p className="font-bold">Pour faire valoir ce que de droit.</p>
              <p>Bulletin certifié conforme aux dispositions du Code du Travail et du CGI du Bénin.</p>
              {payslip.paymentDate && (
                <p className="mt-1 font-semibold text-emerald-700">
                  Règlement effectif effectué le {new Date(payslip.paymentDate).toLocaleDateString('fr-BJ')} (Réf : {payslip.paymentReference || 'N/A'})
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="font-bold uppercase">Signature & Cachet de l'Employeur</p>
              <div className="h-10 mt-1 border-b border-dashed border-gray-300"></div>
            </div>
          </div>

        </div>

        {/* Pied de page modal (masqué à l'impression) */}
        <div className="pt-3 border-t border-gray-200 flex justify-end print:hidden">
          <Button type="button" variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
}
