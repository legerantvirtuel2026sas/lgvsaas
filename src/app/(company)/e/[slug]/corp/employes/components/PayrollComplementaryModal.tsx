'use client';

import * as React from 'react';
import {
  X,
  Users,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  Building2,
  Calendar,
  AlertTriangle,
  FileCheck2,
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatFcfa } from '@/server/domain/money';
import { calculatePayslip } from '@/server/domain/payroll';
import { EmployeeItem, PayrollRunItem, PayslipItem } from '@/lib/payroll-store';

interface PayrollComplementaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  companySlug: string;
  companyDisplayName: string;
  runs: PayrollRunItem[];
  employees: EmployeeItem[];
  initialRun?: PayrollRunItem | null;
  onSaveComplementaryPayslip: (
    targetRun: PayrollRunItem,
    complementarySlip: PayslipItem
  ) => void;
}

export function PayrollComplementaryModal({
  isOpen,
  onClose,
  companySlug,
  companyDisplayName,
  runs,
  employees,
  initialRun,
  onSaveComplementaryPayslip,
}: PayrollComplementaryModalProps) {
  // Liste des paies validées
  const validatedRuns = React.useMemo(() => {
    return runs.filter((r) => r.status === 'VALIDATED' || r.status === 'PAID');
  }, [runs]);

  // Période sélectionnée
  const [selectedRunId, setSelectedRunId] = React.useState<string>('');

  React.useEffect(() => {
    if (isOpen) {
      if (initialRun) {
        setSelectedRunId(initialRun.id);
      } else if (validatedRuns.length > 0) {
        setSelectedRunId(validatedRuns[0].id);
      }
    }
  }, [isOpen, initialRun, validatedRuns]);

  const selectedRun = React.useMemo(() => {
    return validatedRuns.find((r) => r.id === selectedRunId) || validatedRuns[0] || null;
  }, [validatedRuns, selectedRunId]);

  // Salariés actifs uniquement
  const activeEmployees = React.useMemo(() => {
    return employees.filter((e) => e.status === 'ACTIF');
  }, [employees]);

  // Filtrage strict : Salariés actifs qui n'ont PAS encore de bulletin pour cette période
  const omittedEmployees = React.useMemo(() => {
    if (!selectedRun) return [];
    const processedEmpIds = new Set((selectedRun.payslips || []).map((p) => p.employeeId));
    return activeEmployees.filter((emp) => !processedEmpIds.has(emp.id));
  }, [selectedRun, activeEmployees]);

  const [selectedEmployeeId, setSelectedEmployeeId] = React.useState<string>('');

  React.useEffect(() => {
    if (omittedEmployees.length > 0) {
      setSelectedEmployeeId(omittedEmployees[0].id);
    } else {
      setSelectedEmployeeId('');
    }
  }, [omittedEmployees]);

  const selectedEmployee = React.useMemo(() => {
    return omittedEmployees.find((e) => e.id === selectedEmployeeId) || omittedEmployees[0] || null;
  }, [omittedEmployees, selectedEmployeeId]);

  // Variables du salarié sélectionné
  const [baseSalary, setBaseSalary] = React.useState<number>(0);
  const [transportAllowance, setTransportAllowance] = React.useState<number>(0);
  const [mealAllowance, setMealAllowance] = React.useState<number>(0);
  const [rendementAllowance, setRendementAllowance] = React.useState<number>(0);
  const [responsibilityAllowance, setResponsibilityAllowance] = React.useState<number>(0);
  const [overtime, setOvertime] = React.useState<number>(0);
  const [commissions, setCommissions] = React.useState<number>(0);
  const [exceptionalBonus, setExceptionalBonus] = React.useState<number>(0);
  const [advanceDeduction, setAdvanceDeduction] = React.useState<number>(0);
  const [otherDeductions, setOtherDeductions] = React.useState<number>(0);
  const [justification, setJustification] = React.useState<string>(
    'Salarié actif omis lors de la clôture mensuelle principale'
  );
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Synchronisation des variables quand le salarié sélectionné change
  React.useEffect(() => {
    if (selectedEmployee) {
      setBaseSalary(selectedEmployee.baseSalary);
      setTransportAllowance(selectedEmployee.transportAllowance || 0);
      setMealAllowance(selectedEmployee.mealAllowance || 0);
      setRendementAllowance(selectedEmployee.rendementAllowance || 0);
      setResponsibilityAllowance(selectedEmployee.responsibilityAllowance || 0);
      setOvertime(0);
      setCommissions(0);
      setExceptionalBonus(0);

      // Calculer l'avance restant due
      const pendingAdvance = selectedEmployee.advances?.find((a) => a.amount > a.repaidAmount);
      const advanceDeduct = pendingAdvance
        ? Math.min(pendingAdvance.monthlyDeduction, pendingAdvance.amount - pendingAdvance.repaidAmount)
        : 0;
      setAdvanceDeduction(advanceDeduct);
      setOtherDeductions(0);
    }
  }, [selectedEmployee]);

  // Calcul du bulletin avec le moteur légal
  const calculatedPayslip = React.useMemo(() => {
    if (!selectedEmployee) return null;
    return calculatePayslip({
      baseSalary,
      transportAllowance,
      mealAllowance,
      rendementAllowance,
      responsibilityAllowance,
      overtime,
      commissions,
      exceptionalBonus,
      advanceDeduction,
      otherDeductions,
    });
  }, [
    selectedEmployee,
    baseSalary,
    transportAllowance,
    mealAllowance,
    rendementAllowance,
    responsibilityAllowance,
    overtime,
    commissions,
    exceptionalBonus,
    advanceDeduction,
    otherDeductions,
  ]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedRun) {
      setErrorMsg('Veuillez sélectionner une période de paie validée.');
      return;
    }

    if (!selectedEmployee) {
      setErrorMsg('Aucun salarié omis sélectionné.');
      return;
    }

    if (!calculatedPayslip) {
      setErrorMsg('Erreur de calcul du bulletin de paie.');
      return;
    }

    // Générer le numéro de bulletin complémentaire : BUL-COMP-YYYY-MM-xxx
    const existingCompCount = (selectedRun.payslips || []).filter((p) => p.slipType === 'COMPLEMENTARY').length;
    const compSeq = String(existingCompCount + 1).padStart(3, '0');
    const slipNumber = `BUL-COMP-${selectedRun.periodKey}-${compSeq}`;

    const complementarySlip: PayslipItem = {
      id: `comp_${selectedRun.periodKey}_${selectedEmployee.id}_${Date.now()}`,
      payslipNumber: slipNumber,
      slipType: 'COMPLEMENTARY',
      regularizationReason: justification.trim() || 'Paie complémentaire (salarié omis)',
      runId: selectedRun.id,
      companySlug,
      employeeId: selectedEmployee.id,
      employeeName: selectedEmployee.fullName,
      employeeMatricule: selectedEmployee.registrationNumber,
      employeeJob: selectedEmployee.jobTitle,
      employeeDepartment: selectedEmployee.department,
      employeeCnss: selectedEmployee.cnssNumber,
      periodMonth: selectedRun.month,
      periodYear: selectedRun.year,
      baseSalary: calculatedPayslip.baseSalary,
      transportAllowance,
      mealAllowance,
      rendementAllowance,
      responsibilityAllowance,
      overtimeAmount: overtime,
      commissions,
      exceptionalBonus,
      totalAllowances: calculatedPayslip.totalAllowances,
      grossSalary: calculatedPayslip.grossSalary,
      cnssEmployee: calculatedPayslip.cnssEmployee,
      cnssEmployer: calculatedPayslip.cnssEmployer,
      cnssEmployerRetirement: calculatedPayslip.cnssEmployerRetirement,
      cnssEmployerFamily: calculatedPayslip.cnssEmployerFamily,
      cnssEmployerAccident: calculatedPayslip.cnssEmployerAccident,
      taxableBase: calculatedPayslip.taxableBase,
      itsAmount: calculatedPayslip.itsAmount,
      advanceDeduction: calculatedPayslip.advanceDeduction,
      otherDeductions: calculatedPayslip.otherDeductions,
      netToPay: calculatedPayslip.netToPay,
      employerTotalCost: calculatedPayslip.employerTotalCost,
      paymentStatus: 'NON_PAYE',
      paidAmount: 0,
      remainingAmount: calculatedPayslip.netToPay,
      transactions: [],
      createdAt: new Date().toISOString(),
    };

    onSaveComplementaryPayslip(selectedRun, complementarySlip);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 my-auto border border-gray-200 max-h-[95vh] flex flex-col">
        {/* En-tête */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-800 rounded-xl">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Paie Complémentaire • Traitement d'un Salarié Omis
              </h3>
              <p className="text-xs text-gray-500">
                Générez le bulletin officiel d'un salarié oublié sans modifier ni recalculer les salariés déjà clôturés.
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

        {/* Sélection de période */}
        <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Période de rattachement *
            </label>
            <select
              className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-xs focus:border-blue-500 focus:outline-none"
              value={selectedRun?.id || ''}
              onChange={(e) => setSelectedRunId(e.target.value)}
            >
              {validatedRuns.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.monthLabel} (Validée le {r.validatedAt ? new Date(r.validatedAt).toLocaleDateString('fr-BJ') : '—'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Salarié omis éligible *
            </label>
            {omittedEmployees.length === 0 ? (
              <div className="h-10 px-3 flex items-center bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md font-medium text-xs">
                ✓ Tous les salariés actifs ({activeEmployees.length}) ont déjà leur bulletin.
              </div>
            ) : (
              <select
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-xs focus:border-blue-500 focus:outline-none"
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
              >
                {omittedEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} ({emp.registrationNumber} - {emp.jobTitle})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {omittedEmployees.length === 0 ? (
          <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <p className="font-bold text-gray-800 text-sm">Aucun salarié actif n'a été omis</p>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              L'ensemble des {activeEmployees.length} salariés actifs de l'entreprise dispose déjà d'un bulletin validé pour la période de {selectedRun?.monthLabel}.
            </p>
            <div className="pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Fermer
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 space-y-4 pr-1 text-xs">
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Rémunération et variables */}
            <div className="p-4 bg-white rounded-xl border border-gray-200 space-y-3">
              <h4 className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-blue-600" />
                Rémunération & Éléments du Mois ({selectedEmployee?.fullName}) :
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Salaire de Base Brut (FCFA) *
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={baseSalary}
                    onChange={(e) => setBaseSalary(parseInt(e.target.value, 10) || 0)}
                    className="h-9 text-xs font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Indemnité de transport
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={transportAllowance}
                    onChange={(e) => setTransportAllowance(parseInt(e.target.value, 10) || 0)}
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Prime exceptionnelle / Rendement
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={exceptionalBonus}
                    onChange={(e) => setExceptionalBonus(parseInt(e.target.value, 10) || 0)}
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Heures supplémentaires
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={overtime}
                    onChange={(e) => setOvertime(parseInt(e.target.value, 10) || 0)}
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Retenue avance / acompte
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={advanceDeduction}
                    onChange={(e) => setAdvanceDeduction(parseInt(e.target.value, 10) || 0)}
                    className="h-9 text-xs font-mono text-rose-700 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Autres retenues
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={otherDeductions}
                    onChange={(e) => setOtherDeductions(parseInt(e.target.value, 10) || 0)}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Justification / Note de complément *
                </label>
                <Input
                  type="text"
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Ex: Salarié réintégré en cours de mois, omis lors de la paie principale"
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            {/* Aperçu légal instantané */}
            {calculatedPayslip && (
              <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-3">
                <span className="text-xs font-bold text-blue-900 block flex items-center gap-1.5">
                  <FileCheck2 className="w-4 h-4 text-blue-700" />
                  Résultat du calcul certifié (Normes CNSS & CGI Bénin) :
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-center">
                  <div className="p-2.5 bg-white rounded-lg border border-blue-200">
                    <span className="text-[9px] text-gray-500 uppercase font-bold block">Salaire Brut</span>
                    <strong className="text-sm font-bold text-gray-900 block mt-0.5">
                      {formatFcfa(calculatedPayslip.grossSalary)}
                    </strong>
                  </div>

                  <div className="p-2.5 bg-white rounded-lg border border-blue-200">
                    <span className="text-[9px] text-blue-700 uppercase font-bold block">CNSS Salarié (3,6%)</span>
                    <strong className="text-sm font-bold text-blue-700 block mt-0.5">
                      -{formatFcfa(calculatedPayslip.cnssEmployee)}
                    </strong>
                  </div>

                  <div className="p-2.5 bg-white rounded-lg border border-blue-200">
                    <span className="text-[9px] text-purple-700 uppercase font-bold block">Retenue ITS (DGI)</span>
                    <strong className="text-sm font-bold text-purple-700 block mt-0.5">
                      -{formatFcfa(calculatedPayslip.itsAmount)}
                    </strong>
                  </div>

                  <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-300">
                    <span className="text-[9px] text-emerald-800 uppercase font-bold block">Net à Payer</span>
                    <strong className="text-sm font-black text-emerald-800 block mt-0.5">
                      {formatFcfa(calculatedPayslip.netToPay)}
                    </strong>
                  </div>
                </div>

                <div className="text-[11px] text-blue-900 pt-1 border-t border-blue-200/80 flex items-center justify-between flex-wrap gap-2">
                  <span>
                    CNSS Patronale (17,4%) : <strong>+{formatFcfa(calculatedPayslip.cnssEmployer)}</strong>
                  </span>
                  <span>
                    Coût global employeur : <strong>{formatFcfa(calculatedPayslip.employerTotalCost)}</strong>
                  </span>
                </div>
              </div>
            )}

            {/* Pied de page action */}
            <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
              <Button type="button" variant="outline" onClick={onClose}>
                Annuler
              </Button>

              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2 px-5 shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Valider la Paie Complémentaire</span>
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
