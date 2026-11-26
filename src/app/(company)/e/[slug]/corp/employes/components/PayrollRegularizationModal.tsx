'use client';

import * as React from 'react';
import {
  X,
  Calculator,
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatFcfa } from '@/server/domain/money';
import { calculateRegularization } from '@/server/domain/payroll';
import { EmployeeItem, PayrollRunItem, PayslipItem } from '@/lib/payroll-store';

interface PayrollRegularizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  companySlug: string;
  companyDisplayName: string;
  runs: PayrollRunItem[];
  employees: EmployeeItem[];
  initialRun?: PayrollRunItem | null;
  onSaveRegularization: (
    targetRun: PayrollRunItem,
    regularizationSlip: PayslipItem
  ) => void;
}

export function PayrollRegularizationModal({
  isOpen,
  onClose,
  companySlug,
  companyDisplayName,
  runs,
  employees,
  initialRun,
  onSaveRegularization,
}: PayrollRegularizationModalProps) {
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

  // Salariés ayant déjà un bulletin dans cette paie
  const availableOriginalSlips = React.useMemo(() => {
    if (!selectedRun) return [];
    // Uniquement les bulletins principaux ou déjà validés
    return (selectedRun.payslips || []).filter(
      (p) => !p.slipType || p.slipType === 'MAIN' || p.slipType === 'COMPLEMENTARY'
    );
  }, [selectedRun]);

  const [selectedSlipId, setSelectedSlipId] = React.useState<string>('');

  React.useEffect(() => {
    if (availableOriginalSlips.length > 0) {
      setSelectedSlipId(availableOriginalSlips[0].id);
    } else {
      setSelectedSlipId('');
    }
  }, [availableOriginalSlips]);

  const targetOriginalSlip = React.useMemo(() => {
    return availableOriginalSlips.find((s) => s.id === selectedSlipId) || availableOriginalSlips[0] || null;
  }, [availableOriginalSlips, selectedSlipId]);

  // Formulaire d'ajustement
  const [adjustmentType, setAdjustmentType] = React.useState<'PRIME' | 'HEURES_SUP' | 'RAPPEL' | 'INDEMNITE' | 'RETENUE'>('PRIME');
  const [adjustmentAmount, setAdjustmentAmount] = React.useState<string>('20000');
  const [reason, setReason] = React.useState<string>('Prime commerciale de novembre oubliée lors de la clôture');
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Calcul d'incidence
  const deltaGrossAmount = parseInt(adjustmentAmount, 10) || 0;
  const isDeduction = adjustmentType === 'RETENUE';
  const effectiveDeltaGross = isDeduction ? -Math.abs(deltaGrossAmount) : Math.abs(deltaGrossAmount);

  const calcResult = React.useMemo(() => {
    if (!targetOriginalSlip) return null;
    return calculateRegularization({
      originalGrossSalary: targetOriginalSlip.grossSalary,
      originalCnssEmployee: targetOriginalSlip.cnssEmployee,
      originalTaxableBase: targetOriginalSlip.taxableBase,
      originalItsAmount: targetOriginalSlip.itsAmount,
      originalNetToPay: targetOriginalSlip.netToPay,
      deltaGross: effectiveDeltaGross,
    });
  }, [targetOriginalSlip, effectiveDeltaGross]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedRun) {
      setErrorMsg('Veuillez sélectionner une période de paie validée.');
      return;
    }

    if (!targetOriginalSlip) {
      setErrorMsg('Veuillez sélectionner le salarié à régulariser.');
      return;
    }

    if (deltaGrossAmount <= 0) {
      setErrorMsg('Le montant de régularisation doit être supérieur à zéro.');
      return;
    }

    if (!reason.trim()) {
      setErrorMsg('Le motif de la régularisation est obligatoire pour la traçabilité comptable et fiscale.');
      return;
    }

    if (!calcResult) {
      setErrorMsg('Erreur de calcul de la régularisation.');
      return;
    }

    // Générer le numéro de régularisation : REG-YYYY-MM-xxx
    const existingRegCount = (selectedRun.payslips || []).filter((p) => p.slipType === 'REGULARIZATION').length;
    const regSeq = String(existingRegCount + 1).padStart(3, '0');
    const regNumber = `REG-${selectedRun.periodKey}-${regSeq}`;

    const regSlip: PayslipItem = {
      id: `reg_${selectedRun.periodKey}_${targetOriginalSlip.employeeId}_${Date.now()}`,
      payslipNumber: regNumber,
      slipType: 'REGULARIZATION',
      originalPayslipId: targetOriginalSlip.id,
      originalPayslipNumber: targetOriginalSlip.payslipNumber,
      regularizationReason: reason.trim(),
      regularizationDetails: {
        originalPayslipId: targetOriginalSlip.id,
        originalPayslipNumber: targetOriginalSlip.payslipNumber,
        reason: reason.trim(),
        adjustmentType,
        grossDelta: calcResult.deltaGross,
        cnssEmployeeDelta: calcResult.deltaCnssEmployee,
        cnssEmployerDelta: calcResult.deltaCnssEmployer,
        itsDelta: calcResult.deltaItsAmount,
        netDelta: calcResult.netDelta,
      },
      runId: selectedRun.id,
      companySlug,
      employeeId: targetOriginalSlip.employeeId,
      employeeName: targetOriginalSlip.employeeName,
      employeeMatricule: targetOriginalSlip.employeeMatricule,
      employeeJob: targetOriginalSlip.employeeJob,
      employeeDepartment: targetOriginalSlip.employeeDepartment,
      employeeCnss: targetOriginalSlip.employeeCnss,
      periodMonth: selectedRun.month,
      periodYear: selectedRun.year,
      baseSalary: 0,
      transportAllowance: 0,
      mealAllowance: 0,
      rendementAllowance: 0,
      responsibilityAllowance: 0,
      overtimeAmount: adjustmentType === 'HEURES_SUP' ? calcResult.deltaGross : 0,
      commissions: 0,
      exceptionalBonus: adjustmentType === 'PRIME' ? calcResult.deltaGross : 0,
      totalAllowances: calcResult.deltaGross,
      grossSalary: calcResult.deltaGross,
      cnssEmployee: calcResult.deltaCnssEmployee,
      cnssEmployer: calcResult.deltaCnssEmployer,
      cnssEmployerRetirement: Math.round(calcResult.deltaGross * 0.064),
      cnssEmployerFamily: Math.round(calcResult.deltaGross * 0.090),
      cnssEmployerAccident: Math.round(calcResult.deltaGross * 0.020),
      taxableBase: calcResult.deltaGross - calcResult.deltaCnssEmployee,
      itsAmount: calcResult.deltaItsAmount,
      advanceDeduction: 0,
      otherDeductions: 0,
      netToPay: calcResult.netDelta,
      employerTotalCost: calcResult.deltaGross + calcResult.deltaCnssEmployer,
      paymentStatus: 'NON_PAYE',
      paidAmount: 0,
      remainingAmount: Math.max(0, calcResult.netDelta),
      overpaidAmount: calcResult.netDelta < 0 ? Math.abs(calcResult.netDelta) : 0,
      transactions: [],
      createdAt: new Date().toISOString(),
    };

    onSaveRegularization(selectedRun, regSlip);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 my-auto border border-gray-200 max-h-[95vh] flex flex-col">
        {/* En-tête */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Régularisation de Paie • Correction Ciblée
              </h3>
              <p className="text-xs text-gray-500">
                Corrigez une omission ou un écart sur un bulletin validé sans altérer l’historique d’origine.
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

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 space-y-4 pr-1 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Sélection de la période et du salarié */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 bg-gray-50 rounded-xl border border-gray-200">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Période de paie validée *
              </label>
              <select
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-xs focus:border-amber-500 focus:outline-none"
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
                Salarié concerné *
              </label>
              <select
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-xs focus:border-amber-500 focus:outline-none"
                value={selectedSlipId}
                onChange={(e) => setSelectedSlipId(e.target.value)}
              >
                {availableOriginalSlips.map((slip) => (
                  <option key={slip.id} value={slip.id}>
                    {slip.employeeName} ({slip.employeeMatricule} - {slip.payslipNumber})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fiche de référence du bulletin initial */}
          {targetOriginalSlip && (
            <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-200 space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-blue-200/60">
                <span className="font-bold text-blue-900 text-xs flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-700" />
                  Bulletin initial de référence : {targetOriginalSlip.payslipNumber}
                </span>
                <span className="text-[10px] text-blue-800 font-semibold bg-blue-100 px-2 py-0.5 rounded">
                  {targetOriginalSlip.employeeJob}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center pt-1 font-mono">
                <div className="p-2 bg-white rounded-lg border border-blue-100">
                  <span className="text-[9px] text-gray-500 uppercase font-bold block">Brut Initial</span>
                  <strong className="text-xs text-gray-900 block mt-0.5">{formatFcfa(targetOriginalSlip.grossSalary)}</strong>
                </div>

                <div className="p-2 bg-white rounded-lg border border-blue-100">
                  <span className="text-[9px] text-blue-700 uppercase font-bold block">CNSS (3,6%)</span>
                  <strong className="text-xs text-blue-700 block mt-0.5">{formatFcfa(targetOriginalSlip.cnssEmployee)}</strong>
                </div>

                <div className="p-2 bg-white rounded-lg border border-blue-100">
                  <span className="text-[9px] text-purple-700 uppercase font-bold block">ITS Initial</span>
                  <strong className="text-xs text-purple-700 block mt-0.5">{formatFcfa(targetOriginalSlip.itsAmount)}</strong>
                </div>

                <div className="p-2 bg-white rounded-lg border border-blue-100">
                  <span className="text-[9px] text-emerald-800 uppercase font-bold block">Net Initial</span>
                  <strong className="text-xs text-emerald-800 font-black block mt-0.5">{formatFcfa(targetOriginalSlip.netToPay)}</strong>
                </div>

                <div className="p-2 bg-white rounded-lg border border-blue-100">
                  <span className="text-[9px] text-gray-500 uppercase font-bold block">Part Patronale (17,4%)</span>
                  <strong className="text-xs text-gray-700 block mt-0.5">{formatFcfa(targetOriginalSlip.cnssEmployer)}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Formulaire de saisie de la régularisation */}
          <div className="space-y-3 p-3.5 bg-white rounded-xl border border-gray-200">
            <h4 className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-amber-600" />
              Éléments d'ajustement de la régularisation :
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nature de la correction / omission *
                </label>
                <select
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-xs focus:border-amber-500 focus:outline-none"
                  value={adjustmentType}
                  onChange={(e) => setAdjustmentType(e.target.value as any)}
                >
                  <option value="PRIME">🎁 Prime commerciale / exceptionnelle oubliée (+)</option>
                  <option value="HEURES_SUP">⏱️ Heures supplémentaires non comptabilisées (+)</option>
                  <option value="RAPPEL">📈 Rappel de salaire ou avancement (+)</option>
                  <option value="INDEMNITE">🚗 Indemnité ou commission omise (+)</option>
                  <option value="RETENUE">📉 Trop-perçu à déduire / régulariser (-)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Montant brut de l'ajustement (FCFA) *
                </label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(e.target.value)}
                  placeholder="Ex: 20000"
                  className="h-10 text-xs font-mono font-bold"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Motif obligatoire de régularisation *
              </label>
              <Input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: Prime commerciale de novembre omise lors de la clôture mensuelle"
                className="h-10 text-xs"
                required
              />
              <span className="text-[10px] text-gray-500 mt-0.5 block">
                Ce motif figurera explicitement sur le bulletin de régularisation et le journal d'audit.
              </span>
            </div>
          </div>

          {/* Aperçu live de l'incidence légale */}
          {calcResult && (
            <div className="p-4 bg-amber-50/70 border border-amber-300 rounded-xl space-y-3">
              <span className="text-xs font-bold text-amber-900 block flex items-center gap-1.5">
                <FileCheck2 className="w-4 h-4 text-amber-700" />
                Incidence légale et financière calculée (Normes Bénin) :
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-center">
                <div className="p-2.5 bg-white rounded-lg border border-amber-200">
                  <span className="text-[9px] text-gray-500 uppercase font-bold block">Delta Brut</span>
                  <strong className="text-sm font-bold text-gray-900 block mt-0.5">
                    {effectiveDeltaGross >= 0 ? '+' : ''}{formatFcfa(calcResult.deltaGross)}
                  </strong>
                </div>

                <div className="p-2.5 bg-white rounded-lg border border-amber-200">
                  <span className="text-[9px] text-blue-700 uppercase font-bold block">Delta CNSS (3,6%)</span>
                  <strong className="text-sm font-bold text-blue-700 block mt-0.5">
                    {calcResult.deltaCnssEmployee >= 0 ? '+' : ''}{formatFcfa(calcResult.deltaCnssEmployee)}
                  </strong>
                </div>

                <div className="p-2.5 bg-white rounded-lg border border-amber-200">
                  <span className="text-[9px] text-purple-700 uppercase font-bold block">Delta ITS (DGI)</span>
                  <strong className="text-sm font-bold text-purple-700 block mt-0.5">
                    {calcResult.deltaItsAmount >= 0 ? '+' : ''}{formatFcfa(calcResult.deltaItsAmount)}
                  </strong>
                </div>

                <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-300">
                  <span className="text-[9px] text-emerald-800 uppercase font-bold block">Net Complémentaire</span>
                  <strong className="text-sm font-black text-emerald-800 block mt-0.5">
                    {calcResult.netDelta >= 0 ? '+' : ''}{formatFcfa(calcResult.netDelta)}
                  </strong>
                </div>
              </div>

              <div className="text-[11px] text-amber-800 pt-1 border-t border-amber-200/80 flex items-center justify-between flex-wrap gap-2">
                <span>
                  Part patronale CNSS supplémentaire (17,4%) : <strong>+{formatFcfa(calcResult.deltaCnssEmployer)}</strong>
                </span>
                <span className="text-emerald-800 font-bold">
                  Créance nette à payer générée : {formatFcfa(Math.max(0, calcResult.netDelta))}
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
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-2 px-5 shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Valider le Bulletin de Régularisation</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
