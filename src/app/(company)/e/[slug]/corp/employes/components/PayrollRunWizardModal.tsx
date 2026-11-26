'use client';

import * as React from 'react';
import {
  X,
  Play,
  Calendar,
  Users,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  ShieldCheck,
  Building2,
  Printer,
  Eye,
  FileCheck2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatFcfa } from '@/server/domain/money';
import { calculatePayslip } from '@/server/domain/payroll';
import { EmployeeItem, PayrollRunItem, PayslipItem } from '@/lib/payroll-store';

interface PayrollRunWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  companySlug: string;
  companyDisplayName: string;
  employees: EmployeeItem[];
  existingRuns: PayrollRunItem[];
  onValidatePayroll: (newRun: PayrollRunItem) => void;
  onOpenRunDetails?: (run: PayrollRunItem) => void;
  onOpenPaymentsForRun?: (run: PayrollRunItem) => void;
  onPrintAllSlipsForRun?: (run: PayrollRunItem) => void;
  onOpenRegularization?: (run: PayrollRunItem) => void;
  onOpenComplementary?: (run: PayrollRunItem) => void;
}

interface VariableEntry {
  employeeId: string;
  baseSalary: number;
  transportAllowance: number;
  mealAllowance: number;
  rendementAllowance: number;
  responsibilityAllowance: number;
  overtime: number;
  commissions: number;
  exceptionalBonus: number;
  advanceDeduction: number;
  otherDeductions: number;
}

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export function PayrollRunWizardModal({
  isOpen,
  onClose,
  companySlug,
  companyDisplayName,
  employees,
  existingRuns,
  onValidatePayroll,
  onOpenRunDetails,
  onOpenPaymentsForRun,
  onPrintAllSlipsForRun,
  onOpenRegularization,
  onOpenComplementary,
}: PayrollRunWizardModalProps) {
  const [step, setStep] = React.useState<1 | 2 | 3 | 4 | 5>(1);

  // Étape 1 : Période
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = React.useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = React.useState<number>(currentDate.getFullYear());
  const [establishment, setEstablishment] = React.useState('Tous les établissements');

  // Étape 2 : Variables par salarié
  const [variables, setVariables] = React.useState<Record<string, VariableEntry>>({});

  // Salariés actifs éligibles
  const activeEmployees = React.useMemo(() => {
    return employees.filter((e) => e.status === 'ACTIF');
  }, [employees]);

  // Vérification de doublon de période
  const periodKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const existingRunForPeriod = React.useMemo(() => {
    return existingRuns.find((r) => r.periodKey === periodKey && (r.status === 'VALIDATED' || r.status === 'PAID'));
  }, [existingRuns, periodKey]);

  // Initialisation des variables à l'ouverture ou au changement d'employés
  React.useEffect(() => {
    if (isOpen) {
      setStep(1);
      const initialVars: Record<string, VariableEntry> = {};
      activeEmployees.forEach((emp) => {
        // Calculer l'avance restant due
        const pendingAdvance = emp.advances?.find((a) => a.amount > a.repaidAmount);
        const advanceDeduct = pendingAdvance
          ? Math.min(pendingAdvance.monthlyDeduction, pendingAdvance.amount - pendingAdvance.repaidAmount)
          : 0;

        initialVars[emp.id] = {
          employeeId: emp.id,
          baseSalary: emp.baseSalary,
          transportAllowance: emp.transportAllowance || 0,
          mealAllowance: emp.mealAllowance || 0,
          rendementAllowance: emp.rendementAllowance || 0,
          responsibilityAllowance: emp.responsibilityAllowance || 0,
          overtime: 0,
          commissions: 0,
          exceptionalBonus: 0,
          advanceDeduction: advanceDeduct,
          otherDeductions: 0,
        };
      });
      setVariables(initialVars);
    }
  }, [isOpen, activeEmployees]);

  // Étape 3 & 4 : Calcul automatique de chaque bulletin
  const computedList = React.useMemo(() => {
    return activeEmployees.map((emp, idx) => {
      const vars = variables[emp.id] || {
        baseSalary: emp.baseSalary,
        transportAllowance: 0,
        mealAllowance: 0,
        rendementAllowance: 0,
        responsibilityAllowance: 0,
        overtime: 0,
        commissions: 0,
        exceptionalBonus: 0,
        advanceDeduction: 0,
        otherDeductions: 0,
      };

      const calc = calculatePayslip({
        baseSalary: vars.baseSalary,
        transportAllowance: vars.transportAllowance,
        mealAllowance: vars.mealAllowance,
        rendementAllowance: vars.rendementAllowance,
        responsibilityAllowance: vars.responsibilityAllowance,
        overtime: vars.overtime,
        commissions: vars.commissions,
        exceptionalBonus: vars.exceptionalBonus,
        advanceDeduction: vars.advanceDeduction,
        otherDeductions: vars.otherDeductions,
      });

      const slipNumber = `BUL-${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(idx + 1).padStart(3, '0')}`;

      const payslip: PayslipItem = {
        id: `payslip_${selectedYear}_${selectedMonth}_${emp.id}`,
        payslipNumber: slipNumber,
        runId: `run_${periodKey}`,
        companySlug,
        employeeId: emp.id,
        employeeName: emp.fullName,
        employeeMatricule: emp.registrationNumber,
        employeeJob: emp.jobTitle,
        employeeDepartment: emp.department,
        employeeCnss: emp.cnssNumber,
        periodMonth: selectedMonth,
        periodYear: selectedYear,
        baseSalary: vars.baseSalary,
        transportAllowance: vars.transportAllowance,
        mealAllowance: vars.mealAllowance,
        rendementAllowance: vars.rendementAllowance,
        responsibilityAllowance: vars.responsibilityAllowance,
        overtimeAmount: vars.overtime,
        commissions: vars.commissions,
        exceptionalBonus: vars.exceptionalBonus,
        totalAllowances: calc.totalAllowances,
        grossSalary: calc.grossSalary,
        cnssEmployee: calc.cnssEmployee,
        cnssEmployer: calc.cnssEmployer,
        cnssEmployerRetirement: calc.cnssEmployerRetirement,
        cnssEmployerFamily: calc.cnssEmployerFamily,
        cnssEmployerAccident: calc.cnssEmployerAccident,
        taxableBase: calc.taxableBase,
        itsAmount: calc.itsAmount,
        advanceDeduction: calc.advanceDeduction,
        otherDeductions: calc.otherDeductions,
        netToPay: calc.netToPay,
        employerTotalCost: calc.employerTotalCost,
        paymentStatus: 'NON_PAYE',
        paidAmount: 0,
        remainingAmount: calc.netToPay,
        createdAt: new Date().toISOString(),
      };

      return {
        employee: emp,
        vars,
        calc,
        payslip,
      };
    });
  }, [activeEmployees, variables, selectedYear, selectedMonth, periodKey, companySlug]);

  // Totaux généraux de la paie
  const totalGross = computedList.reduce((sum, item) => sum + item.calc.grossSalary, 0);
  const totalCnssEmployee = computedList.reduce((sum, item) => sum + item.calc.cnssEmployee, 0);
  const totalCnssEmployer = computedList.reduce((sum, item) => sum + item.calc.cnssEmployer, 0);
  const totalCnss = totalCnssEmployee + totalCnssEmployer;
  const totalIts = computedList.reduce((sum, item) => sum + item.calc.itsAmount, 0);
  const totalAdvancesDeducted = computedList.reduce((sum, item) => sum + item.calc.advanceDeduction, 0);
  const totalNet = computedList.reduce((sum, item) => sum + item.calc.netToPay, 0);
  const totalEmployerCost = totalGross + totalCnssEmployer;

  if (!isOpen) return null;

  // Mise à jour d'un champ variable pour un salarié
  const updateVariable = (employeeId: string, field: keyof VariableEntry, value: number) => {
    setVariables((prev) => ({
      ...prev,
      [employeeId]: {
        ...(prev[employeeId] || {
          employeeId,
          baseSalary: 52000,
          transportAllowance: 0,
          mealAllowance: 0,
          rendementAllowance: 0,
          responsibilityAllowance: 0,
          overtime: 0,
          commissions: 0,
          exceptionalBonus: 0,
          advanceDeduction: 0,
          otherDeductions: 0,
        }),
        [field]: Math.max(0, value),
      },
    }));
  };

  // Validation définitive
  const handleFinalValidation = () => {
    const monthLabel = `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`;
    const newRun: PayrollRunItem = {
      id: `run_${periodKey}_${Date.now()}`,
      periodKey,
      month: selectedMonth,
      year: selectedYear,
      monthLabel,
      establishment,
      status: 'VALIDATED',
      employeeCount: computedList.length,
      totalGross,
      totalCnssEmployee,
      totalCnssEmployer,
      totalCnss,
      totalIts,
      totalNet,
      totalAdvancesDeducted,
      totalEmployerCost,
      totalPaidToEmployees: 0,
      remainingEmployeesPay: totalNet,
      cnssDeclaredAmount: totalCnss,
      cnssPaidAmount: 0,
      cnssPaymentStatus: 'EN_ATTENTE',
      dgiDeclaredAmount: totalIts,
      dgiPaidAmount: 0,
      dgiPaymentStatus: 'EN_ATTENTE',
      validatedAt: new Date().toISOString(),
      validatedBy: 'Direction des Ressources Humaines',
      payslips: computedList.map((c) => c.payslip),
    };

    onValidatePayroll(newRun);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-5xl w-full p-6 shadow-2xl space-y-5 my-auto border border-gray-200 max-h-[95vh] flex flex-col">
        {/* En-tête de l'assistant */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Assistant d'Exécution de la Paie Mensuelle • {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
              </h3>
              <p className="text-xs text-gray-500">
                Processus guidé en 5 étapes pour {companyDisplayName} • Normes CNSS (21%) & CGI Bénin (ITS)
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

        {/* Barre de progression des 5 étapes */}
        <div className="grid grid-cols-5 gap-2 border-b border-gray-200 pb-3 text-center text-xs">
          {[
            { num: 1, label: '1. Période & Effectif' },
            { num: 2, label: '2. Variables & Avances' },
            { num: 3, label: '3. Calcul Automatique' },
            { num: 4, label: '4. Récapitulatif' },
            { num: 5, label: '5. Validation Clôture' },
          ].map((s) => (
            <div
              key={s.num}
              className={`p-2 rounded-xl transition-all ${
                step === s.num
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : step > s.num
                  ? 'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200'
                  : 'bg-gray-50 text-gray-400 font-medium'
              }`}
            >
              <div className="text-[11px] whitespace-nowrap">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Contenu dynamique par étape */}
        <div className="overflow-y-auto flex-1 pr-1 space-y-4 text-xs">
          {/* ========================================================================= */}
          {/* ÉTAPE 1 : SÉLECTION DE LA PÉRIODE & CONTRÔLE DOUBLON */}
          {/* ========================================================================= */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
                <span className="font-bold text-gray-900 text-sm block">Définition de la période de paie :</span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Mois de traitement *</label>
                    <select
                      className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-xs focus:border-blue-500 focus:outline-none"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                    >
                      {MONTH_NAMES.map((name, i) => (
                        <option key={i + 1} value={i + 1}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Année *</label>
                    <select
                      className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-xs focus:border-blue-500 focus:outline-none"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                    >
                      <option value={2025}>2025</option>
                      <option value={2026}>2026</option>
                      <option value={2027}>2027</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Établissement / Site</label>
                    <select
                      className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-xs focus:border-blue-500 focus:outline-none"
                      value={establishment}
                      onChange={(e) => setEstablishment(e.target.value)}
                    >
                      <option value="Tous les établissements">Tous les établissements</option>
                      <option value="Siège Principal Cotonou">Siège Principal Cotonou</option>
                      <option value="Dépôt Akpakpa">Dépôt Akpakpa</option>
                    </select>
                  </div>
                </div>

                {/* Alerte et blocage de réexécution d'une période validée */}
                {existingRunForPeriod && (
                  <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 space-y-3.5 shadow-xs">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-amber-100 rounded-xl text-amber-700 shrink-0 mt-0.5">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                      </div>
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-amber-900">
                            Période déjà clôturée & validée : {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                          </h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                            {existingRunForPeriod.status === 'PAID' ? 'Soldée' : 'Validée'}
                          </span>
                        </div>
                        <p className="text-xs text-amber-800 leading-relaxed font-medium">
                          « Cette période a déjà fait l'objet d'une paie validée. Les bulletins et les résultats de cette période sont protégés contre toute nouvelle exécution normale. Vous pouvez consulter la paie existante ou effectuer une régularisation si nécessaire. »
                        </p>
                        <div className="pt-1 text-[11px] text-amber-700 flex items-center gap-3 flex-wrap">
                          <span>
                            Validation le :{' '}
                            <strong>
                              {existingRunForPeriod.validatedAt
                                ? new Date(existingRunForPeriod.validatedAt).toLocaleDateString('fr-BJ')
                                : '26/11/2026'}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>
                            Salariés traités :{' '}
                            <strong>{existingRunForPeriod.employeeCount || existingRunForPeriod.payslips?.length || 0}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Total Net : <strong>{formatFcfa(existingRunForPeriod.totalNet)}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions directes proposées en remplacement de la réexécution normale */}
                    <div className="pt-2.5 border-t border-amber-200/80 flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          onClose();
                          if (onOpenRunDetails) onOpenRunDetails(existingRunForPeriod);
                        }}
                        className="h-8 px-2.5 text-xs bg-white hover:bg-amber-100 text-amber-900 border-amber-300 font-semibold flex items-center gap-1.5"
                      >
                        <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Livre de paie</span>
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          onClose();
                          if (onPrintAllSlipsForRun) onPrintAllSlipsForRun(existingRunForPeriod);
                        }}
                        className="h-8 px-2.5 text-xs bg-white hover:bg-amber-100 text-amber-900 border-amber-300 font-semibold flex items-center gap-1.5"
                      >
                        <Printer className="w-3.5 h-3.5 text-blue-600" />
                        <span>Bulletins</span>
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          onClose();
                          if (onOpenPaymentsForRun) onOpenPaymentsForRun(existingRunForPeriod);
                        }}
                        className="h-8 px-2.5 text-xs bg-white hover:bg-amber-100 text-amber-900 border-amber-300 font-semibold flex items-center gap-1.5"
                      >
                        <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Règlements</span>
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          onClose();
                          if (onOpenRegularization) onOpenRegularization(existingRunForPeriod);
                        }}
                        className="h-8 px-2.5 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-1.5 shadow-xs"
                      >
                        <Calculator className="w-3.5 h-3.5" />
                        <span>Effectuer une régularisation</span>
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          onClose();
                          if (onOpenComplementary) onOpenComplementary(existingRunForPeriod);
                        }}
                        className="h-8 px-2.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 shadow-xs"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Paie complémentaire (salarié omis)</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Salariés concernés */}
              <div className="border border-gray-200 rounded-xl overflow-hidden space-y-2 p-3 bg-white">
                <div className="flex items-center justify-between pb-2 border-b">
                  <span className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-blue-600" />
                    Salariés actifs inclus dans ce traitement ({activeEmployees.length}) :
                  </span>
                  <span className="text-gray-500 text-[11px]">Les salariés suspendus ou sortis sont automatiquement exclus.</span>
                </div>

                <div className="divide-y divide-gray-100">
                  {activeEmployees.map((emp) => (
                    <div key={emp.id} className="py-2 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-gray-900">{emp.fullName}</span>
                        <span className="text-gray-500 font-mono text-[11px] block">{emp.registrationNumber} • {emp.jobTitle}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-gray-900">{formatFcfa(emp.baseSalary)}</span>
                        <span className="text-[10px] text-gray-400 block">Base contractuelle</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ÉTAPE 2 : PRÉPARATION DES VARIABLES & AVANCES */}
          {/* ========================================================================= */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800">
                Ajustez les éléments variables du mois pour chaque salarié (primes exceptionnelles, commissions, heures supplémentaires, acomptes et retenues d’avances).
              </div>

              <div className="space-y-3">
                {activeEmployees.map((emp) => {
                  const vars = variables[emp.id] || {
                    baseSalary: emp.baseSalary,
                    transportAllowance: 0,
                    mealAllowance: 0,
                    rendementAllowance: 0,
                    responsibilityAllowance: 0,
                    overtime: 0,
                    commissions: 0,
                    exceptionalBonus: 0,
                    advanceDeduction: 0,
                    otherDeductions: 0,
                  };

                  return (
                    <div key={emp.id} className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                      <div className="flex items-center justify-between border-b pb-2">
                        <div>
                          <strong className="text-gray-900 text-xs">{emp.fullName}</strong>
                          <span className="text-gray-500 font-mono text-[11px] ml-2">({emp.registrationNumber})</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-xs font-bold text-gray-800">Salaire base : {formatFcfa(vars.baseSalary)}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <Input
                          label="Prime transport"
                          type="number"
                          value={String(vars.transportAllowance)}
                          onChange={(e) => updateVariable(emp.id, 'transportAllowance', parseInt(e.target.value, 10) || 0)}
                        />
                        <Input
                          label="Prime rendement / panier"
                          type="number"
                          value={String(vars.rendementAllowance)}
                          onChange={(e) => updateVariable(emp.id, 'rendementAllowance', parseInt(e.target.value, 10) || 0)}
                        />
                        <Input
                          label="Heures supplémentaires"
                          type="number"
                          value={String(vars.overtime)}
                          onChange={(e) => updateVariable(emp.id, 'overtime', parseInt(e.target.value, 10) || 0)}
                        />
                        <Input
                          label="Commissions ventes"
                          type="number"
                          value={String(vars.commissions)}
                          onChange={(e) => updateVariable(emp.id, 'commissions', parseInt(e.target.value, 10) || 0)}
                        />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                        <Input
                          label="Primes exceptionnelles"
                          type="number"
                          value={String(vars.exceptionalBonus)}
                          onChange={(e) => updateVariable(emp.id, 'exceptionalBonus', parseInt(e.target.value, 10) || 0)}
                        />
                        <Input
                          label="Retenue avance sur salaire"
                          type="number"
                          value={String(vars.advanceDeduction)}
                          onChange={(e) => updateVariable(emp.id, 'advanceDeduction', parseInt(e.target.value, 10) || 0)}
                        />
                        <Input
                          label="Autres retenues / absences"
                          type="number"
                          value={String(vars.otherDeductions)}
                          onChange={(e) => updateVariable(emp.id, 'otherDeductions', parseInt(e.target.value, 10) || 0)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ÉTAPE 3 : CALCUL AUTOMATIQUE CONFORME CGI & CNSS BÉNIN */}
          {/* ========================================================================= */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Calculs automatiques terminés avec succès selon le Code de Sécurité Sociale (CNSS 21%) et le Code Général des Impôts du Bénin (barème ITS progressif).
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-white rounded-xl border border-gray-200">
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Masse Brute</span>
                  <div className="text-base font-black text-gray-900 font-mono mt-0.5">{formatFcfa(totalGross)}</div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-blue-200">
                  <span className="text-[10px] text-blue-600 uppercase font-bold block">CNSS Totales (21%)</span>
                  <div className="text-base font-black text-blue-700 font-mono mt-0.5">{formatFcfa(totalCnss)}</div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-purple-200">
                  <span className="text-[10px] text-purple-600 uppercase font-bold block">ITS DGI à Déclarer</span>
                  <div className="text-base font-black text-purple-700 font-mono mt-0.5">{formatFcfa(totalIts)}</div>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-300">
                  <span className="text-[10px] text-emerald-800 uppercase font-bold block">Salaires Nets à Payer</span>
                  <div className="text-base font-black text-emerald-800 font-mono mt-0.5">{formatFcfa(totalNet)}</div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 font-bold text-gray-700 uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Salarié</th>
                      <th className="p-2.5 text-right">Brut</th>
                      <th className="p-2.5 text-right">CNSS Salarié (3,6%)</th>
                      <th className="p-2.5 text-right">ITS DGI</th>
                      <th className="p-2.5 text-right">Retenue Avance</th>
                      <th className="p-2.5 text-right">Net à Payer</th>
                      <th className="p-2.5 text-right">CNSS Patronale (17,4%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white font-mono">
                    {computedList.map((c) => (
                      <tr key={c.employee.id} className="hover:bg-gray-50">
                        <td className="p-2.5 font-sans font-semibold text-gray-900">{c.employee.fullName}</td>
                        <td className="p-2.5 text-right font-bold text-gray-900">{formatFcfa(c.calc.grossSalary)}</td>
                        <td className="p-2.5 text-right text-blue-700">-{formatFcfa(c.calc.cnssEmployee)}</td>
                        <td className="p-2.5 text-right text-purple-700">-{formatFcfa(c.calc.itsAmount)}</td>
                        <td className="p-2.5 text-right text-rose-700">{c.calc.advanceDeduction > 0 ? `-${formatFcfa(c.calc.advanceDeduction)}` : '—'}</td>
                        <td className="p-2.5 text-right font-black text-emerald-700">{formatFcfa(c.calc.netToPay)}</td>
                        <td className="p-2.5 text-right text-blue-900">+{formatFcfa(c.calc.cnssEmployer)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ÉTAPE 4 : RÉCAPITULATIF DÉTAILLÉ (LIVRE DE PAIE) */}
          {/* ========================================================================= */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">Livre de Paie Préparatoire • {MONTH_NAMES[selectedMonth - 1]} {selectedYear}</h4>
                  <p className="text-[11px] text-gray-500">Examinez le détail complet avant validation définitive.</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.print()}
                  className="h-8 px-3 text-xs flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimer état préparatoire</span>
                </Button>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-x-auto shadow-xs">
                <table className="w-full text-left text-xs min-w-[750px]">
                  <thead className="bg-gray-100 font-bold text-gray-700 uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Matricule & Salarié</th>
                      <th className="p-2.5 text-right">Salaire Brut</th>
                      <th className="p-2.5 text-right">CNSS Salarié</th>
                      <th className="p-2.5 text-right">Retenue ITS</th>
                      <th className="p-2.5 text-right">Avances</th>
                      <th className="p-2.5 text-right">Net à Payer</th>
                      <th className="p-2.5 text-right">Charges Patronales</th>
                      <th className="p-2.5 text-right">Coût Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white font-mono">
                    {computedList.map((c) => (
                      <tr key={c.employee.id} className="hover:bg-gray-50">
                        <td className="p-2.5 font-sans">
                          <span className="font-bold text-gray-900 block">{c.employee.fullName}</span>
                          <span className="text-[10px] text-gray-400 font-mono">{c.employee.registrationNumber} • {c.employee.jobTitle}</span>
                        </td>
                        <td className="p-2.5 text-right font-bold text-gray-900">{formatFcfa(c.calc.grossSalary)}</td>
                        <td className="p-2.5 text-right text-blue-700 font-semibold">-{formatFcfa(c.calc.cnssEmployee)}</td>
                        <td className="p-2.5 text-right text-purple-700 font-bold">-{formatFcfa(c.calc.itsAmount)}</td>
                        <td className="p-2.5 text-right text-rose-700">{c.calc.advanceDeduction > 0 ? `-${formatFcfa(c.calc.advanceDeduction)}` : '0'}</td>
                        <td className="p-2.5 text-right font-black text-emerald-700 text-sm">{formatFcfa(c.calc.netToPay)}</td>
                        <td className="p-2.5 text-right text-blue-900 font-semibold">+{formatFcfa(c.calc.cnssEmployer)}</td>
                        <td className="p-2.5 text-right font-bold text-gray-900">{formatFcfa(c.calc.employerTotalCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-bold border-t-2 border-gray-300 font-mono">
                    <tr>
                      <td className="p-3 font-sans uppercase text-gray-900">TOTAUX GÉNÉRAUX</td>
                      <td className="p-3 text-right text-gray-900">{formatFcfa(totalGross)}</td>
                      <td className="p-3 text-right text-blue-700">-{formatFcfa(totalCnssEmployee)}</td>
                      <td className="p-3 text-right text-purple-700">-{formatFcfa(totalIts)}</td>
                      <td className="p-3 text-right text-rose-700">-{formatFcfa(totalAdvancesDeducted)}</td>
                      <td className="p-3 text-right text-emerald-700 text-sm">={formatFcfa(totalNet)}</td>
                      <td className="p-3 text-right text-blue-900">+{formatFcfa(totalCnssEmployer)}</td>
                      <td className="p-3 text-right text-gray-900">{formatFcfa(totalEmployerCost)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ÉTAPE 5 : VALIDATION DÉFINITIVE & CLÔTURE */}
          {/* ========================================================================= */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  <h4 className="font-bold text-blue-950 text-sm">
                    Synthèse Financière Finale • {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                  </h4>
                </div>
                <p className="text-xs text-blue-800">
                  Vérifiez attentivement les 6 agrégats financiers avant de procéder à la validation officielle de la paie :
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="p-3 bg-white rounded-lg border border-blue-100">
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">1. Masse Salariale Brute</span>
                    <strong className="text-base font-black text-gray-900 font-mono block mt-0.5">{formatFcfa(totalGross)}</strong>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-blue-100">
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">2. CNSS Salarié (3,6%)</span>
                    <strong className="text-base font-black text-blue-700 font-mono block mt-0.5">{formatFcfa(totalCnssEmployee)}</strong>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-blue-100">
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">3. CNSS Employeur (17,4%)</span>
                    <strong className="text-base font-black text-blue-900 font-mono block mt-0.5">{formatFcfa(totalCnssEmployer)}</strong>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-blue-100">
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">4. Total ITS à Déclarer (DGI)</span>
                    <strong className="text-base font-black text-purple-700 font-mono block mt-0.5">{formatFcfa(totalIts)}</strong>
                  </div>

                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-300">
                    <span className="text-[10px] text-emerald-800 uppercase font-bold block">5. Salaires Nets à Payer</span>
                    <strong className="text-base font-black text-emerald-800 font-mono block mt-0.5">{formatFcfa(totalNet)}</strong>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-blue-100">
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">6. Coût Global Employeur</span>
                    <strong className="text-base font-black text-gray-900 font-mono block mt-0.5">{formatFcfa(totalEmployerCost)}</strong>
                  </div>
                </div>
              </div>

              {/* Règle d'or : Séparation validation et paiement */}
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 space-y-1.5">
                <p className="font-bold text-gray-900 flex items-center gap-1.5">
                  <FileCheck2 className="w-4 h-4 text-emerald-600" />
                  Effets immédiats de la validation :
                </p>
                <ul className="list-disc pl-5 space-y-1 text-[11px] text-gray-600">
                  <li>Les {computedList.length} bulletins de paie individuels officiels sont générés et archivés.</li>
                  <li>Les créances des salariés sont inscrites dans le module de suivi des règlements avec le statut « Non payé ».</li>
                  <li>Les échéances de reversement envers la CNSS ({formatFcfa(totalCnss)}) et la DGI ({formatFcfa(totalIts)}) sont enregistrées.</li>
                  <li>Les mensualités d’avances déduites ({formatFcfa(totalAdvancesDeducted)}) sont amorties dans les fiches salariés.</li>
                  <li><strong>Important :</strong> La validation fige les calculs légaux mais n’opère aucun décaissement automatique de trésorerie. Les paiements effectifs seront consignés dans le module des règlements.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Barre d'action inférieure (navigation entre étapes) */}
        <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            disabled={step === 1}
            onClick={() => setStep((s) => (s > 1 ? ((s - 1) as any) : s))}
            className="flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Précédent</span>
          </Button>

          <div className="flex items-center gap-2">
            {step === 1 && existingRunForPeriod && (
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                ⛔ Période protégée : réexécution normale verrouillée
              </span>
            )}
            {step < 5 ? (
              <Button
                type="button"
                disabled={step === 1 && !!existingRunForPeriod}
                onClick={() => setStep((s) => (s < 5 ? ((s + 1) as any) : s))}
                className={`font-bold flex items-center gap-1.5 ${
                  step === 1 && !!existingRunForPeriod
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed hover:bg-gray-200'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
                title={
                  step === 1 && !!existingRunForPeriod
                    ? 'Cette période est déjà validée. Utilisez les options de régularisation ou de paie complémentaire ci-dessus.'
                    : undefined
                }
              >
                <span>Suivant</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleFinalValidation}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-sm px-6"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmer et Clôturer la Paie</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
