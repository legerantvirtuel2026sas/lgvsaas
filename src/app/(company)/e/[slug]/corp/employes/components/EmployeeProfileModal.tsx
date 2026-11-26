'use client';

import * as React from 'react';
import {
  X,
  User,
  Briefcase,
  DollarSign,
  History,
  FileText,
  CreditCard,
  Plus,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Printer,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatFcfa } from '@/server/domain/money';
import { calculatePayslip } from '@/server/domain/payroll';
import { EmployeeItem, EmployeeAdvance, PayslipItem } from '@/lib/payroll-store';

interface EmployeeProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: EmployeeItem | null;
  payslips: PayslipItem[];
  onAddAdvance: (employeeId: string, advance: Omit<EmployeeAdvance, 'id' | 'repaidAmount' | 'status' | 'repayments'>) => void;
  onViewPayslip: (payslip: PayslipItem) => void;
  onEditEmployee: (employee: EmployeeItem) => void;
}

export function EmployeeProfileModal({
  isOpen,
  onClose,
  employee,
  payslips,
  onAddAdvance,
  onViewPayslip,
  onEditEmployee,
}: EmployeeProfileModalProps) {
  const [activeTab, setActiveTab] = React.useState<'profil' | 'salaire' | 'historique' | 'bulletins' | 'avances' | 'paiements'>('profil');

  // Formulaire d'avance
  const [showAdvanceForm, setShowAdvanceForm] = React.useState(false);
  const [advanceAmount, setAdvanceAmount] = React.useState('50000');
  const [advanceMonthly, setAdvanceMonthly] = React.useState('25000');
  const [advanceReason, setAdvanceReason] = React.useState('Avance sur salaire pour urgence familiale');
  const [advanceDate, setAdvanceDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [advanceMethod, setAdvanceMethod] = React.useState<'ESPECES' | 'VIREMENT' | 'MOBILE_MONEY'>('ESPECES');

  React.useEffect(() => {
    setActiveTab('profil');
    setShowAdvanceForm(false);
  }, [employee, isOpen]);

  if (!isOpen || !employee) return null;

  // Calcul du profil estimé
  const payslipEst = calculatePayslip({
    baseSalary: employee.baseSalary,
    transportAllowance: employee.transportAllowance,
    mealAllowance: employee.mealAllowance,
    rendementAllowance: employee.rendementAllowance,
    responsibilityAllowance: employee.responsibilityAllowance,
  });

  // Filtrer les bulletins de cet employé
  const employeePayslips = payslips.filter((p) => p.employeeId === employee.id);

  // Situation financière globale des bulletins
  const totalDue = employeePayslips.reduce((sum, p) => sum + p.netToPay, 0);
  const totalPaid = employeePayslips.reduce((sum, p) => sum + p.paidAmount, 0);
  const totalRemaining = totalDue - totalPaid;

  // Total avances
  const totalAdvancesGranted = employee.advances?.reduce((sum, a) => sum + a.amount, 0) || 0;
  const totalAdvancesRepaid = employee.advances?.reduce((sum, a) => sum + a.repaidAmount, 0) || 0;
  const totalAdvancesRemaining = totalAdvancesGranted - totalAdvancesRepaid;

  const handleCreateAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseInt(advanceAmount, 10);
    const monthlyNum = parseInt(advanceMonthly, 10);
    if (isNaN(amountNum) || amountNum <= 0) return;

    onAddAdvance(employee.id, {
      employeeId: employee.id,
      grantedDate: advanceDate,
      amount: amountNum,
      monthlyDeduction: monthlyNum > 0 ? monthlyNum : amountNum,
      reason: advanceReason.trim() || 'Avance sur salaire',
      paymentMethod: advanceMethod,
    });

    setShowAdvanceForm(false);
    setAdvanceAmount('50000');
    setAdvanceMonthly('25000');
    setAdvanceReason('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-5 my-auto border border-gray-200 max-h-[92vh] flex flex-col">
        {/* En-tête profil */}
        <div className="flex items-start justify-between pb-4 border-b border-gray-200">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg border border-blue-200 shadow-xs">
              {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-gray-900">{employee.fullName}</h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-bold border">
                  {employee.registrationNumber}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    employee.status === 'ACTIF'
                      ? 'bg-emerald-100 text-emerald-800'
                      : employee.status === 'SUSPENDU'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {employee.status === 'ACTIF' ? '🟢 Actif' : employee.status === 'SUSPENDU' ? '🟡 Suspendu' : '🔴 Sorti'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {employee.jobTitle} • {employee.department} • Embauché(e) le {new Date(employee.hireDate).toLocaleDateString('fr-BJ')} ({employee.contractType})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                onClose();
                onEditEmployee(employee);
              }}
              className="text-xs h-8 px-3"
            >
              Modifier la fiche
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barre de navigation des onglets */}
        <div className="flex border-b border-gray-200 overflow-x-auto space-x-2 text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('profil')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'profil' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Identité & Contrat
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('salaire')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'salaire' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            Rémunération & Charges
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('historique')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'historique' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Historique Salarial ({employee.salaryHistory?.length || 1})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bulletins')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'bulletins' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Bulletins de Paie ({employeePayslips.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('avances')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'avances' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            Avances & Prêts ({employee.advances?.length || 0})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('paiements')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'paiements' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Situation des Règlements
          </button>
        </div>

        {/* Corps des onglets */}
        <div className="overflow-y-auto flex-1 pr-1 text-xs space-y-4">
          {/* ONGLET 1 : IDENTITÉ & CONTRAT */}
          {activeTab === 'profil' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2.5">
                <span className="font-bold text-gray-800 text-xs block uppercase border-b pb-1.5">
                  Informations Personnelles
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-gray-400 block">Nom & Prénoms</span>
                    <span className="font-semibold text-gray-900">{employee.fullName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">Genre</span>
                    <span className="font-semibold text-gray-900">{employee.gender === 'M' ? 'Masculin' : 'Féminin'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">Téléphone</span>
                    <span className="font-semibold text-gray-900">{employee.phone}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">Email</span>
                    <span className="font-semibold text-gray-900">{employee.email || 'Non renseigné'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-gray-400 block">Adresse de résidence</span>
                    <span className="font-semibold text-gray-900">{employee.address || 'Cotonou, Bénin'}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2.5">
                <span className="font-bold text-gray-800 text-xs block uppercase border-b pb-1.5">
                  Contrat & Informations Administratives
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-gray-400 block">Matricule interne</span>
                    <span className="font-mono font-bold text-blue-700">{employee.registrationNumber}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">Type de contrat</span>
                    <span className="font-semibold text-gray-900">{employee.contractType}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">Service / Département</span>
                    <span className="font-semibold text-gray-900">{employee.department}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">Établissement</span>
                    <span className="font-semibold text-gray-900">{employee.establishment}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">N° CNSS Salarié</span>
                    <span className="font-mono font-bold text-gray-900">{employee.cnssNumber}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">N° IFU Personnel</span>
                    <span className="font-mono font-semibold text-gray-900">{employee.ifuNumber || 'Non renseigné'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-gray-400 block">Mode de paiement & Banque</span>
                    <span className="font-semibold text-gray-900">
                      {employee.paymentMethod} {employee.bankDetails?.bankName ? `• ${employee.bankDetails.bankName}` : ''}
                      {employee.bankDetails?.ibanOrRib ? ` (${employee.bankDetails.ibanOrRib})` : ''}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ONGLET 2 : RÉMUNÉRATION & CHARGES */}
          {activeTab === 'salaire' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-xs">
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Salaire Brut</span>
                  <div className="text-base font-black text-gray-900 font-mono mt-0.5">
                    {formatFcfa(payslipEst.grossSalary)}
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-blue-200 shadow-xs">
                  <span className="text-[10px] text-blue-600 uppercase font-bold block">CNSS Salarié (3,6%)</span>
                  <div className="text-base font-black text-blue-700 font-mono mt-0.5">
                    -{formatFcfa(payslipEst.cnssEmployee)}
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-purple-200 shadow-xs">
                  <span className="text-[10px] text-purple-600 uppercase font-bold block">Retenue ITS (CGI Bénin)</span>
                  <div className="text-base font-black text-purple-700 font-mono mt-0.5">
                    -{formatFcfa(payslipEst.itsAmount)}
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-300 shadow-xs">
                  <span className="text-[10px] text-emerald-800 uppercase font-bold block">Net Estimé à Payer</span>
                  <div className="text-base font-black text-emerald-800 font-mono mt-0.5">
                    {formatFcfa(payslipEst.netToPay)}
                  </div>
                </div>
              </div>

              {/* Détail complet des rubriques */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 font-bold text-gray-700">
                    <tr>
                      <th className="p-2.5">Rubrique de paie</th>
                      <th className="p-2.5 text-right">Part Salariale</th>
                      <th className="p-2.5 text-right">Part Patronale (Bénin)</th>
                      <th className="p-2.5">Régime fiscal & social</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    <tr>
                      <td className="p-2.5 font-medium">Salaire de base brut</td>
                      <td className="p-2.5 text-right font-mono font-bold text-gray-900">+{formatFcfa(employee.baseSalary)}</td>
                      <td className="p-2.5 text-right text-gray-400">—</td>
                      <td className="p-2.5 text-gray-500">Soumis CNSS & ITS</td>
                    </tr>
                    {employee.transportAllowance > 0 && (
                      <tr>
                        <td className="p-2.5 font-medium">Prime de transport habituelle</td>
                        <td className="p-2.5 text-right font-mono text-gray-900">+{formatFcfa(employee.transportAllowance)}</td>
                        <td className="p-2.5 text-right text-gray-400">—</td>
                        <td className="p-2.5 text-gray-500">Indemnité forfaitaire</td>
                      </tr>
                    )}
                    {employee.rendementAllowance > 0 && (
                      <tr>
                        <td className="p-2.5 font-medium">Prime de rendement</td>
                        <td className="p-2.5 text-right font-mono text-gray-900">+{formatFcfa(employee.rendementAllowance)}</td>
                        <td className="p-2.5 text-right text-gray-400">—</td>
                        <td className="p-2.5 text-gray-500">Prime de performance</td>
                      </tr>
                    )}
                    <tr>
                      <td className="p-2.5 font-medium">CNSS Salarié (3,6%)</td>
                      <td className="p-2.5 text-right font-mono text-blue-700 font-bold">-{formatFcfa(payslipEst.cnssEmployee)}</td>
                      <td className="p-2.5 text-right text-gray-400">—</td>
                      <td className="p-2.5 text-gray-500">Caisse Nationale de Sécurité Sociale</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium">CNSS Employeur (17,4% : Retraite 6.4%, Famille 9%, Accident 2%)</td>
                      <td className="p-2.5 text-right text-gray-400">—</td>
                      <td className="p-2.5 text-right font-mono text-blue-900 font-bold">+{formatFcfa(payslipEst.cnssEmployer)}</td>
                      <td className="p-2.5 text-gray-500">Charges patronales obligatoires</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium">
                        Retenue ITS à la source (DGI Bénin)
                        <span className="block text-[10px] text-gray-400">Assiette imposable : {formatFcfa(payslipEst.taxableBase)}</span>
                      </td>
                      <td className="p-2.5 text-right font-mono text-purple-700 font-bold">-{formatFcfa(payslipEst.itsAmount)}</td>
                      <td className="p-2.5 text-right text-gray-400">—</td>
                      <td className="p-2.5 text-gray-500">Barème progressif 0% à 30%</td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-gray-50 font-bold border-t">
                    <tr>
                      <td className="p-2.5 uppercase">Coût global employeur</td>
                      <td className="p-2.5 text-right font-mono text-emerald-800">Net : {formatFcfa(payslipEst.netToPay)}</td>
                      <td className="p-2.5 text-right font-mono text-blue-900">Total charges : {formatFcfa(payslipEst.cnssEmployer)}</td>
                      <td className="p-2.5 font-mono text-gray-900">Coût total : {formatFcfa(payslipEst.employerTotalCost)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ONGLET 3 : HISTORIQUE SALARIAL */}
          {activeTab === 'historique' && (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800">
                L’historique salarial garantit l’inaltérabilité des rémunérations passées. Chaque révision contractuelle est horodatée avec son motif officiel.
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 font-bold text-gray-700">
                    <tr>
                      <th className="p-2.5">Date d'effet</th>
                      <th className="p-2.5 text-right">Salaire de Base</th>
                      <th className="p-2.5 text-right">Prime Transport</th>
                      <th className="p-2.5">Motif de la révision</th>
                      <th className="p-2.5">Date d'enregistrement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {employee.salaryHistory && employee.salaryHistory.length > 0 ? (
                      employee.salaryHistory.map((h) => (
                        <tr key={h.id} className="hover:bg-gray-50">
                          <td className="p-2.5 font-bold text-gray-900">{new Date(h.effectiveDate).toLocaleDateString('fr-BJ')}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-gray-900">{formatFcfa(h.baseSalary)}</td>
                          <td className="p-2.5 text-right font-mono text-gray-600">{formatFcfa(h.transportAllowance || 0)}</td>
                          <td className="p-2.5 text-gray-700 font-medium">{h.reason}</td>
                          <td className="p-2.5 text-gray-400 font-mono text-[11px]">{new Date(h.recordedAt).toLocaleDateString('fr-BJ')}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="p-2.5 font-bold text-gray-900">{new Date(employee.hireDate).toLocaleDateString('fr-BJ')}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-gray-900">{formatFcfa(employee.baseSalary)}</td>
                        <td className="p-2.5 text-right font-mono text-gray-600">{formatFcfa(employee.transportAllowance || 0)}</td>
                        <td className="p-2.5 text-gray-700">Rémunération initiale à l'embauche</td>
                        <td className="p-2.5 text-gray-400 font-mono text-[11px]">{new Date(employee.hireDate).toLocaleDateString('fr-BJ')}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ONGLET 4 : BULLETINS DE PAIE */}
          {activeTab === 'bulletins' && (
            <div className="space-y-3">
              {employeePayslips.length === 0 ? (
                <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed">
                  <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="font-semibold text-gray-700">Aucun bulletin de paie archivé pour ce salarié</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Les bulletins apparaîtront ici après chaque validation mensuelle de la paie.
                  </p>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-100 font-bold text-gray-700">
                      <tr>
                        <th className="p-2.5">N° Bulletin</th>
                        <th className="p-2.5">Période</th>
                        <th className="p-2.5 text-right">Salaire Brut</th>
                        <th className="p-2.5 text-right">CNSS Salarié</th>
                        <th className="p-2.5 text-right">ITS DGI</th>
                        <th className="p-2.5 text-right">Net à Payer</th>
                        <th className="p-2.5">Statut Règlement</th>
                        <th className="p-2.5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {employeePayslips.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="p-2.5 font-mono font-bold text-blue-700">{p.payslipNumber}</td>
                          <td className="p-2.5 font-semibold text-gray-900">{p.periodMonth}/{p.periodYear}</td>
                          <td className="p-2.5 text-right font-mono">{formatFcfa(p.grossSalary)}</td>
                          <td className="p-2.5 text-right font-mono text-blue-700">-{formatFcfa(p.cnssEmployee)}</td>
                          <td className="p-2.5 text-right font-mono text-purple-700">-{formatFcfa(p.itsAmount)}</td>
                          <td className="p-2.5 text-right font-mono font-black text-emerald-700">{formatFcfa(p.netToPay)}</td>
                          <td className="p-2.5">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                p.paymentStatus === 'PAYE'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : p.paymentStatus === 'PARTIEL'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {p.paymentStatus === 'PAYE' ? 'Payé' : p.paymentStatus === 'PARTIEL' ? 'Partiel' : 'Non payé'}
                            </span>
                          </td>
                          <td className="p-2.5 text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onViewPayslip(p)}
                              className="h-7 px-2.5 text-[11px] flex items-center gap-1 mx-auto"
                            >
                              <Printer className="w-3 h-3" />
                              <span>Consulter</span>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ONGLET 5 : AVANCES & PRÊTS */}
          {activeTab === 'avances' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-gray-900 text-xs">Suivi des Avances & Prêts accordés</h4>
                  <p className="text-[11px] text-gray-500">
                    Les retenues mensuelles définies sont automatiquement précomptées sur le bulletin lors de la préparation de la paie.
                  </p>
                </div>
                {!showAdvanceForm && (
                  <Button
                    size="sm"
                    onClick={() => setShowAdvanceForm(true)}
                    className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nouvelle avance / prêt</span>
                  </Button>
                )}
              </div>

              {/* Formulaire d'enregistrement d'une avance */}
              {showAdvanceForm && (
                <form onSubmit={handleCreateAdvance} className="p-4 bg-gray-50 border border-blue-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-bold text-blue-900 text-xs">Enregistrer une avance ou un prêt remboursable</span>
                    <button
                      type="button"
                      onClick={() => setShowAdvanceForm(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Input
                      label="Montant accordé (FCFA) *"
                      type="number"
                      value={advanceAmount}
                      onChange={(e) => setAdvanceAmount(e.target.value)}
                      required
                    />
                    <Input
                      label="Retenue mensuelle à déduire (FCFA) *"
                      type="number"
                      value={advanceMonthly}
                      onChange={(e) => setAdvanceMonthly(e.target.value)}
                      required
                    />
                    <Input
                      label="Date d'octroi *"
                      type="date"
                      value={advanceDate}
                      onChange={(e) => setAdvanceDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Motif de l'avance / prêt"
                      placeholder="Ex: Avance fête, urgence médicale, prêt d'équipement..."
                      value={advanceReason}
                      onChange={(e) => setAdvanceReason(e.target.value)}
                    />
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Mode de décaissement (Caisse / Banque)</label>
                      <select
                        className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-xs focus:border-blue-500 focus:outline-none"
                        value={advanceMethod}
                        onChange={(e) => setAdvanceMethod(e.target.value as any)}
                      >
                        <option value="ESPECES">Espèces (Décaissement Caisse)</option>
                        <option value="VIREMENT">Virement bancaire</option>
                        <option value="MOBILE_MONEY">Mobile Money</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowAdvanceForm(false)}>
                      Annuler
                    </Button>
                    <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
                      Valider l'avance
                    </Button>
                  </div>
                </form>
              )}

              {/* Tableau des avances */}
              {(!employee.advances || employee.advances.length === 0) ? (
                <div className="p-6 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed">
                  <CreditCard className="w-7 h-7 text-gray-400 mx-auto mb-1.5" />
                  <p className="font-semibold text-gray-700">Aucune avance ou prêt en cours pour ce salarié</p>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-100 font-bold text-gray-700">
                      <tr>
                        <th className="p-2.5">Date octroi</th>
                        <th className="p-2.5">Motif</th>
                        <th className="p-2.5 text-right">Montant accordé</th>
                        <th className="p-2.5 text-right">Échéance mensuelle</th>
                        <th className="p-2.5 text-right">Déjà remboursé</th>
                        <th className="p-2.5 text-right">Solde restant</th>
                        <th className="p-2.5">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {employee.advances.map((a) => {
                        const remaining = a.amount - a.repaidAmount;
                        return (
                          <tr key={a.id} className="hover:bg-gray-50">
                            <td className="p-2.5 font-bold text-gray-900">{new Date(a.grantedDate).toLocaleDateString('fr-BJ')}</td>
                            <td className="p-2.5 text-gray-700">{a.reason}</td>
                            <td className="p-2.5 text-right font-mono font-bold text-gray-900">{formatFcfa(a.amount)}</td>
                            <td className="p-2.5 text-right font-mono text-blue-700 font-semibold">{formatFcfa(a.monthlyDeduction)}/mois</td>
                            <td className="p-2.5 text-right font-mono text-emerald-700">{formatFcfa(a.repaidAmount)}</td>
                            <td className="p-2.5 text-right font-mono font-black text-rose-700">{formatFcfa(remaining)}</td>
                            <td className="p-2.5">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  remaining <= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {remaining <= 0 ? 'Soldé' : 'En cours'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ONGLET 6 : SITUATION DES RÈGLEMENTS */}
          {activeTab === 'paiements' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-white rounded-xl border border-gray-200">
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Total Salaires Nets Émis</span>
                  <div className="text-base font-black text-gray-900 font-mono mt-0.5">
                    {formatFcfa(totalDue)}
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-emerald-600 uppercase font-bold block">Total Effectivement Versé</span>
                  <div className="text-base font-black text-emerald-700 font-mono mt-0.5">
                    {formatFcfa(totalPaid)}
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-rose-200">
                  <span className="text-[10px] text-rose-600 uppercase font-bold block">Reste à Régler au Salarié</span>
                  <div className="text-base font-black text-rose-700 font-mono mt-0.5">
                    {formatFcfa(totalRemaining)}
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                <span className="font-bold text-gray-800 text-xs block">Récapitulatif des avances sur salaire en cours :</span>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Total avances octroyées :</span>
                  <strong className="font-mono text-gray-900">{formatFcfa(totalAdvancesGranted)}</strong>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Total avances amorties / remboursées :</span>
                  <strong className="font-mono text-emerald-700">-{formatFcfa(totalAdvancesRepaid)}</strong>
                </div>
                <div className="flex items-center justify-between text-xs pt-2 border-t">
                  <span className="font-bold text-gray-800">Solde avances restant à retenir :</span>
                  <strong className="font-mono font-black text-rose-700">{formatFcfa(totalAdvancesRemaining)}</strong>
                </div>
              </div>
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
