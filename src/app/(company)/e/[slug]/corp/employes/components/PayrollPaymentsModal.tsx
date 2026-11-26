'use client';

import * as React from 'react';
import {
  X,
  CreditCard,
  Building2,
  Landmark,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCheck,
  DollarSign,
  ArrowRight,
  History,
  AlertCircle,
  Plus,
  RotateCcw,
  Check,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatFcfa } from '@/server/domain/money';
import {
  PayrollRunItem,
  PayslipItem,
  PaymentTransaction,
  recomputePayslipTotals,
  recomputeRunTotals,
} from '@/lib/payroll-store';

interface PayrollPaymentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  run: PayrollRunItem | null;
  onUpdateRunPayments: (
    runId: string,
    updatedPayslips: PayslipItem[],
    cnssUpdate?: { paidAmount: number; paymentDate: string; paymentRef: string },
    dgiUpdate?: { paidAmount: number; paymentDate: string; paymentRef: string }
  ) => void;
}

export function PayrollPaymentsModal({
  isOpen,
  onClose,
  run,
  onUpdateRunPayments,
}: PayrollPaymentsModalProps) {
  const [activeTab, setActiveTab] = React.useState<'salaries' | 'cnss' | 'dgi'>('salaries');

  // État local des bulletins du run
  const [payslips, setPayslips] = React.useState<PayslipItem[]>([]);

  // Salarié sélectionné pour la consultation de l'historique et des transactions
  const [detailSlip, setDetailSlip] = React.useState<PayslipItem | null>(null);

  // Formulaire d'ajout d'une nouvelle transaction
  const [showAddTransactionModal, setShowAddTransactionModal] = React.useState(false);
  const [txTargetSlip, setTxTargetSlip] = React.useState<PayslipItem | null>(null);
  const [txAmount, setTxAmount] = React.useState('');
  const [txMethod, setTxMethod] = React.useState<'Virement bancaire' | 'Espèces (Caisse)' | 'Mobile Money' | 'Chèque'>('Virement bancaire');
  const [txDate, setTxDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [txRef, setTxRef] = React.useState('');
  const [txNotes, setTxNotes] = React.useState('');
  const [allowOverpayment, setAllowOverpayment] = React.useState(false);
  const [overpaymentReason, setOverpaymentReason] = React.useState('');

  // Formulaire de règlement CNSS
  const [cnssPaidAmount, setCnssPaidAmount] = React.useState('');
  const [cnssPayDate, setCnssPayDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [cnssPayRef, setCnssPayRef] = React.useState('');

  // Formulaire de règlement DGI
  const [dgiPaidAmount, setDgiPaidAmount] = React.useState('');
  const [dgiPayDate, setDgiPayDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [dgiPayRef, setDgiPayRef] = React.useState('');

  // Initialisation à l'ouverture
  React.useEffect(() => {
    if (run) {
      const computedSlips = (run.payslips || []).map(recomputePayslipTotals);
      setPayslips(computedSlips);

      setCnssPaidAmount(String(run.cnssPaidAmount || run.totalCnss));
      setCnssPayDate(run.cnssPaymentDate || new Date().toISOString().split('T')[0]);
      setCnssPayRef(run.cnssPaymentRef || `QUIT-CNSS-${run.periodKey}`);

      setDgiPaidAmount(String(run.dgiPaidAmount || run.totalIts));
      setDgiPayDate(run.dgiPaymentDate || new Date().toISOString().split('T')[0]);
      setDgiPayRef(run.dgiPaymentRef || `QUIT-DGI-ITS-${run.periodKey}`);

      // Rafraîchir le detailSlip si ouvert
      if (detailSlip) {
        const found = computedSlips.find((s) => s.id === detailSlip.id);
        setDetailSlip(found || null);
      }
    }
  }, [run, isOpen]);

  if (!isOpen || !run) return null;

  // =========================================================================
  // CALCULS FINANCIERS STRICTS ET SÉCURISÉS (RÈGLES D'OR DU CAHIER DES CHARGES)
  // =========================================================================
  // 1. Total net à payer : somme des bulletins validés
  const totalNetDue = payslips.reduce((sum, p) => sum + p.netToPay, 0);

  // 2. Total effectivement payé : somme des règlements effectivement validés
  const totalNetPaid = payslips.reduce((sum, p) => sum + p.paidAmount, 0);

  // 3. Total restant à payer : somme des soldes positifs uniquement !
  const totalRemainingToPay = payslips.reduce((sum, p) => sum + p.remainingAmount, 0);

  // 4. Total des trop-perçus : somme des excédents individuels uniquement !
  const totalOverpaid = payslips.reduce((sum, p) => sum + (p.overpaidAmount || 0), 0);

  // Mise à jour et propagation des bulletins
  const propagatePayslipsUpdate = (updated: PayslipItem[]) => {
    const recomputed = updated.map(recomputePayslipTotals);
    setPayslips(recomputed);
    if (detailSlip) {
      const refreshed = recomputed.find((s) => s.id === detailSlip.id);
      setDetailSlip(refreshed || null);
    }
    onUpdateRunPayments(run.id, recomputed);
  };

  // Ouvrir modal de paiement direct pour un salarié
  const openPaymentForSlip = (slip: PayslipItem) => {
    setTxTargetSlip(slip);
    // Pré-remplir avec le solde restant réel
    const initialAmount = slip.remainingAmount > 0 ? slip.remainingAmount : 0;
    setTxAmount(String(initialAmount));
    setTxMethod(slip.paymentMethod as any || 'Virement bancaire');
    setTxDate(new Date().toISOString().split('T')[0]);
    setTxRef(`VIR-${slip.employeeMatricule}-${run.periodKey}`);
    setTxNotes('Règlement salaire');
    setAllowOverpayment(false);
    setOverpaymentReason('');
    setShowAddTransactionModal(true);
  };

  // Enregistrer une nouvelle transaction de paiement
  const handleCreateTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txTargetSlip) return;

    const amountNum = parseInt(txAmount, 10);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Veuillez saisir un montant de versement valide.');
      return;
    }

    // Vérifier si dépassement du solde restant
    const isExceeding = amountNum > txTargetSlip.remainingAmount;
    if (isExceeding && !allowOverpayment) {
      alert(
        `Le montant saisi (${formatFcfa(amountNum)}) est supérieur au solde restant dû (${formatFcfa(txTargetSlip.remainingAmount)}).\nPour enregistrer un versement excédentaire, veuillez cocher la case d’autorisation exceptionnelle de trop-perçu avec justification.`
      );
      return;
    }

    const newTx: PaymentTransaction = {
      id: `tx_${txTargetSlip.id}_${Date.now()}`,
      date: txDate,
      amount: amountNum,
      paymentMethod: txMethod,
      reference: txRef.trim() || `VIR-${txTargetSlip.employeeMatricule}`,
      notes: isExceeding
        ? `Trop-perçu autorisé : ${overpaymentReason || 'Versement exceptionnel'} (Notes: ${txNotes.trim()})`
        : txNotes.trim() || 'Versement de salaire',
      createdAt: new Date().toISOString(),
      status: 'VALIDATED',
    };

    const updated = payslips.map((p) => {
      if (p.id === txTargetSlip.id) {
        const currentTxs = p.transactions || [];
        const nextTxs = [...currentTxs, newTx];
        return recomputePayslipTotals({
          ...p,
          transactions: nextTxs,
        });
      }
      return p;
    });

    propagatePayslipsUpdate(updated);
    setShowAddTransactionModal(false);
    setTxTargetSlip(null);
  };

  // Annuler / Contrepasser une transaction (avec traçabilité et justification obligatoire)
  const handleCancelTransaction = (slipId: string, txId: string) => {
    const reason = prompt('Motif obligatoire de l’annulation / contrepassation (ex: Doublon de paiement, Saisie erronée) :');
    if (!reason || !reason.trim()) {
      alert('L’annulation nécessite un motif justificatif pour la traçabilité comptable.');
      return;
    }

    const updated = payslips.map((p) => {
      if (p.id === slipId) {
        const nextTxs = (p.transactions || []).map((t) => {
          if (t.id === txId) {
            return {
              ...t,
              status: 'CANCELLED' as const,
              cancelledAt: new Date().toISOString(),
              cancellationReason: reason.trim(),
            };
          }
          return t;
        });

        return recomputePayslipTotals({
          ...p,
          transactions: nextTxs,
        });
      }
      return p;
    });

    propagatePayslipsUpdate(updated);
  };

  // Paiement collectif groupé : NE VERSE QUE LE SOLDE RESTANT RÉEL (ne crée JAMAIS de doublon !)
  const handlePayAllRemaining = () => {
    if (totalRemainingToPay <= 0) {
      alert('Tous les salaires de cette période sont déjà intégralement réglés.');
      return;
    }

    if (
      !confirm(
        `Confirmez-vous le versement groupé des soldes restant dus pour ${run.monthLabel} ?\nMontant total à décaisser : ${formatFcfa(totalRemainingToPay)}.`
      )
    ) {
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const updated = payslips.map((p) => {
      if (p.remainingAmount <= 0) return p;

      const newTx: PaymentTransaction = {
        id: `tx_${p.id}_masse_${Date.now()}`,
        date: today,
        amount: p.remainingAmount,
        paymentMethod: p.paymentMethod || 'Virement bancaire',
        reference: `VIR-MASSE-${run.periodKey}`,
        notes: 'Règlement collectif du solde de paie',
        createdAt: new Date().toISOString(),
        status: 'VALIDATED',
      };

      const currentTxs = p.transactions || [];
      return recomputePayslipTotals({
        ...p,
        transactions: [...currentTxs, newTx],
      });
    });

    propagatePayslipsUpdate(updated);
  };

  // Règlement CNSS
  const handleSaveCnssPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseInt(cnssPaidAmount, 10) || 0;
    onUpdateRunPayments(run.id, payslips, {
      paidAmount: amountNum,
      paymentDate: cnssPayDate,
      paymentRef: cnssPayRef.trim(),
    });
    alert('Règlement des cotisations CNSS enregistré.');
  };

  // Règlement DGI
  const handleSaveDgiPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseInt(dgiPaidAmount, 10) || 0;
    onUpdateRunPayments(run.id, payslips, undefined, {
      paidAmount: amountNum,
      paymentDate: dgiPayDate,
      paymentRef: dgiPayRef.trim(),
    });
    alert('Règlement de la retenue ITS à la DGI enregistré.');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-5xl w-full p-6 shadow-2xl space-y-5 my-auto border border-gray-200 max-h-[92vh] flex flex-col">
        {/* En-tête */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Suivi des Règlements & Paiements • {run.monthLabel}
              </h3>
              <p className="text-xs text-gray-500">
                Traçabilité des décaissements, gestion des transactions individuelles et acquittement des obligations CNSS / DGI.
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

        {/* Onglets */}
        <div className="flex border-b border-gray-200 overflow-x-auto space-x-2 text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('salaries')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'salaries'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            1. Salaires Nets des Employés ({formatFcfa(totalNetDue)})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cnss')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'cnss' ? 'border-blue-600 text-blue-700 font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            2. Cotisations Sociales CNSS ({formatFcfa(run.totalCnss)})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('dgi')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'dgi'
                ? 'border-purple-600 text-purple-700 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            3. Retenues Fiscales ITS / DGI ({formatFcfa(run.totalIts)})
          </button>
        </div>

        {/* Corps des onglets */}
        <div className="overflow-y-auto flex-1 pr-1 text-xs space-y-4">
          {/* ========================================================================= */}
          {/* ONGLET 1 : RÈGLEMENTS DES SALARIÉS */}
          {/* ========================================================================= */}
          {activeTab === 'salaries' && (
            <div className="space-y-4">
              {/* LES 4 INDICATEURS FINANCIERS DISTINCTS (SECTION 3 DU CAHIER DES CHARGES) */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {/* 1. Total net à payer */}
                <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-xs">
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">
                    1. Total Net à Payer
                  </span>
                  <div className="text-base font-black text-gray-900 font-mono mt-0.5">
                    {formatFcfa(totalNetDue)}
                  </div>
                  <span className="text-[10px] text-gray-400 block mt-0.5">Somme bulletins validés</span>
                </div>

                {/* 2. Total effectivement payé */}
                <div className="p-3 bg-white rounded-xl border border-emerald-200 shadow-xs">
                  <span className="text-[10px] text-emerald-700 uppercase font-bold block">
                    2. Total Versé Validé
                  </span>
                  <div className="text-base font-black text-emerald-700 font-mono mt-0.5">
                    {formatFcfa(totalNetPaid)}
                  </div>
                  <span className="text-[10px] text-emerald-600 block mt-0.5">Règlements exécutés</span>
                </div>

                {/* 3. Total restant à payer */}
                <div className="p-3 bg-white rounded-xl border border-blue-200 shadow-xs">
                  <span className="text-[10px] text-blue-700 uppercase font-bold block">
                    3. Reste Réel à Décaisser
                  </span>
                  <div className="text-base font-black text-blue-800 font-mono mt-0.5">
                    {formatFcfa(totalRemainingToPay)}
                  </div>
                  <span className="text-[10px] text-blue-600 block mt-0.5">Somme soldes positifs</span>
                </div>

                {/* 4. Total des trop-perçus */}
                <div
                  className={`p-3 rounded-xl border shadow-xs ${
                    totalOverpaid > 0
                      ? 'bg-purple-50/70 border-purple-300'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-purple-800 uppercase font-bold block">
                      4. Trop-Perçus
                    </span>
                    {totalOverpaid > 0 && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-200 text-purple-900">
                        À régulariser
                      </span>
                    )}
                  </div>
                  <div className="text-base font-black text-purple-800 font-mono mt-0.5">
                    {formatFcfa(totalOverpaid)}
                  </div>
                  <span className="text-[10px] text-purple-700 block mt-0.5">
                    {totalOverpaid > 0 ? 'Excédents à corriger' : 'Aucun trop-perçu'}
                  </span>
                </div>
              </div>

              {/* Barre d'action collective */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div className="text-xs text-gray-700">
                  {totalRemainingToPay > 0 ? (
                    <span>
                      Il reste <strong>{formatFcfa(totalRemainingToPay)}</strong> à verser aux salariés pour solder la période.
                    </span>
                  ) : totalOverpaid > 0 ? (
                    <span className="text-purple-800 font-medium">
                      ⚠️ Tous les salaires dus sont versés, mais un excédent de <strong>{formatFcfa(totalOverpaid)}</strong> est constaté (consultez le détail des paiements pour régulariser ou annuler les doublons).
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <Check className="w-4 h-4 text-emerald-600" />
                      Tous les salaires nets de cette période sont intégralement réglés sans aucun écart.
                    </span>
                  )}
                </div>

                {totalRemainingToPay > 0 && (
                  <Button
                    size="sm"
                    onClick={handlePayAllRemaining}
                    className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shrink-0"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Payer les soldes restants ({formatFcfa(totalRemainingToPay)})</span>
                  </Button>
                )}
              </div>

              {/* TABLEAU DES RÈGLEMENTS SALARIAUX AMÉLIORÉ (SECTION 4 DU CAHIER DES CHARGES) */}
              <div className="border border-gray-200 rounded-xl overflow-x-auto shadow-xs">
                <table className="w-full text-left text-xs min-w-[850px]">
                  <thead className="bg-gray-100 font-bold text-gray-700 uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Matricule & Salarié</th>
                      <th className="p-2.5 text-right">Net à Payer</th>
                      <th className="p-2.5 text-right">Total Versé</th>
                      <th className="p-2.5 text-right">Solde Restant Dû</th>
                      <th className="p-2.5 text-right">Trop-Perçu</th>
                      <th className="p-2.5">Dernier Règlement</th>
                      <th className="p-2.5">Réf. Transaction</th>
                      <th className="p-2.5 text-center">Statut Réel</th>
                      <th className="p-2.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white font-mono">
                    {payslips.map((slip) => {
                      const isOverpaid = (slip.overpaidAmount || 0) > 0;
                      const isFullySettled = slip.remainingAmount === 0 && !isOverpaid;
                      const isPartial = slip.paidAmount > 0 && slip.paidAmount < slip.netToPay;
                      const isUnpaid = slip.paidAmount === 0;

                      return (
                        <tr
                          key={slip.id}
                          className={`hover:bg-gray-50 ${
                            isOverpaid ? 'bg-purple-50/20' : ''
                          }`}
                        >
                          <td className="p-2.5 font-sans">
                            <strong className="text-gray-900 block">{slip.employeeName}</strong>
                            <span className="text-[10px] text-gray-400 font-mono">{slip.employeeMatricule}</span>
                          </td>
                          <td className="p-2.5 text-right font-black text-gray-900">{formatFcfa(slip.netToPay)}</td>
                          <td className="p-2.5 text-right font-bold text-emerald-700">{formatFcfa(slip.paidAmount)}</td>
                          
                          {/* Solde restant dû : MAX(0, Net à payer - Total versé) */}
                          <td className="p-2.5 text-right font-bold">
                            {slip.remainingAmount > 0 ? (
                              <span className="text-rose-700 font-black">{formatFcfa(slip.remainingAmount)}</span>
                            ) : (
                              <span className="text-gray-400 font-normal">0 FCFA</span>
                            )}
                          </td>

                          {/* Trop-perçu éventuel : MAX(0, Total versé - Net à payer) */}
                          <td className="p-2.5 text-right font-mono">
                            {isOverpaid ? (
                              <span className="font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded text-[11px]">
                                +{formatFcfa(slip.overpaidAmount || 0)}
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>

                          <td className="p-2.5 font-sans text-[11px] text-gray-600">
                            {slip.paymentMethod || 'Virement bancaire'}
                            {slip.paymentDate && (
                              <span className="block text-[10px] text-gray-400">
                                {new Date(slip.paymentDate).toLocaleDateString('fr-BJ')}
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 font-mono text-[10px] text-gray-500">
                            {slip.paymentReference || '—'}
                          </td>

                          {/* Statut réel du règlement */}
                          <td className="p-2.5 text-center font-sans">
                            {isOverpaid ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200">
                                <AlertTriangle className="w-3 h-3 text-purple-700 shrink-0" />
                                Trop-perçu à régulariser
                              </span>
                            ) : isFullySettled ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                <Check className="w-3 h-3 text-emerald-700" />
                                Réglé
                              </span>
                            ) : isPartial ? (
                              <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                Partiellement payé
                              </span>
                            ) : (
                              <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                                Non payé
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="p-2.5 text-center font-sans">
                            <div className="flex items-center justify-center gap-1">
                              {slip.remainingAmount > 0 && (
                                <Button
                                  size="sm"
                                  onClick={() => openPaymentForSlip(slip)}
                                  className="h-7 px-2 text-[10px] bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                                  title="Enregistrer un versement"
                                >
                                  Payer
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setDetailSlip(slip)}
                                className="h-7 px-2 text-[10px] text-gray-700 hover:text-blue-700 flex items-center gap-1"
                                title="Voir l'historique complet des versements et régulariser"
                              >
                                <History className="w-3 h-3" />
                                <span>Détail ({slip.transactions?.filter((t) => t.status === 'VALIDATED').length || (slip.paidAmount > 0 ? 1 : 0)})</span>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ========================================================================= */}
              {/* MODALE HISTORIQUE DES TRANSACTIONS D'UN SALARIÉ (ANNULATION & TRAÇABILITÉ) */}
              {/* ========================================================================= */}
              {detailSlip && (
                <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
                  <div className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl space-y-4 border my-auto">
                    <div className="flex items-start justify-between border-b pb-3">
                      <div>
                        <strong className="text-gray-900 text-sm block">
                          Historique des Règlements • {detailSlip.employeeName}
                        </strong>
                        <span className="text-[11px] text-gray-500 font-mono">
                          Matricule : {detailSlip.employeeMatricule} • Période : {run.monthLabel}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDetailSlip(null)}
                        className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Synthèse individuelle */}
                    <div className="p-3 bg-gray-50 rounded-xl border grid grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-gray-400 block uppercase font-bold">Net à Payer</span>
                        <strong className="font-mono text-gray-900">{formatFcfa(detailSlip.netToPay)}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-600 block uppercase font-bold">Total Versé</span>
                        <strong className="font-mono text-emerald-700">{formatFcfa(detailSlip.paidAmount)}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-blue-600 block uppercase font-bold">Solde Restant Dû</span>
                        <strong className="font-mono text-blue-800">{formatFcfa(detailSlip.remainingAmount)}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-purple-600 block uppercase font-bold">Trop-Perçu</span>
                        <strong className="font-mono text-purple-800">
                          {detailSlip.overpaidAmount && detailSlip.overpaidAmount > 0
                            ? `+${formatFcfa(detailSlip.overpaidAmount)}`
                            : '0 FCFA'}
                        </strong>
                      </div>
                    </div>

                    {/* Liste des transactions */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-800 text-xs">Transactions enregistrées :</span>
                        <Button
                          size="sm"
                          onClick={() => {
                            openPaymentForSlip(detailSlip);
                          }}
                          className="h-7 px-2.5 text-[11px] bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Ajouter un versement</span>
                        </Button>
                      </div>

                      {(!detailSlip.transactions || detailSlip.transactions.length === 0) ? (
                        <div className="p-4 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed text-xs">
                          Aucun versement enregistré pour le moment.
                        </div>
                      ) : (
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-gray-100 font-bold text-gray-700 uppercase text-[10px]">
                              <tr>
                                <th className="p-2">Date</th>
                                <th className="p-2 text-right">Montant</th>
                                <th className="p-2">Mode</th>
                                <th className="p-2">Référence / Notes</th>
                                <th className="p-2 text-center">État</th>
                                <th className="p-2 text-center">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 font-mono">
                              {detailSlip.transactions.map((tx) => {
                                const isValid = tx.status === 'VALIDATED';
                                return (
                                  <tr
                                    key={tx.id}
                                    className={`hover:bg-gray-50 ${
                                      !isValid ? 'bg-red-50/40 text-gray-400' : ''
                                    }`}
                                  >
                                    <td className="p-2 font-sans">{new Date(tx.date).toLocaleDateString('fr-BJ')}</td>
                                    <td
                                      className={`p-2 text-right font-bold ${
                                        isValid ? 'text-gray-900' : 'line-through text-gray-400'
                                      }`}
                                    >
                                      {formatFcfa(tx.amount)}
                                    </td>
                                    <td className="p-2 font-sans text-gray-600">{tx.paymentMethod}</td>
                                    <td className="p-2 font-sans text-[11px]">
                                      <span className="font-mono font-bold text-blue-800">{tx.reference}</span>
                                      {tx.notes && <span className="block text-gray-500 text-[10px]">{tx.notes}</span>}
                                      {!isValid && tx.cancellationReason && (
                                        <span className="block text-red-600 text-[10px] font-bold">
                                          Annulé : {tx.cancellationReason}
                                        </span>
                                      )}
                                    </td>
                                    <td className="p-2 text-center font-sans">
                                      <span
                                        className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                          isValid ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                                        }`}
                                      >
                                        {isValid ? 'Validé' : 'Annulé'}
                                      </span>
                                    </td>
                                    <td className="p-2 text-center font-sans">
                                      {isValid && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleCancelTransaction(detailSlip.id, tx.id)}
                                          className="h-6 px-2 text-[10px] text-red-600 hover:text-red-800 hover:bg-red-50 border-red-200"
                                          title="Annuler / contrepasser ce versement avec justification"
                                        >
                                          Annuler
                                        </Button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button type="button" variant="outline" size="sm" onClick={() => setDetailSlip(null)}>
                        Fermer le détail
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* MODALE DE SAISIE D'UN NOUVEAU VERSEMENT SÉCURISÉ */}
              {/* ========================================================================= */}
              {showAddTransactionModal && txTargetSlip && (
                <div className="fixed inset-0 z-70 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 border">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div>
                        <strong className="text-gray-900 text-sm block">
                          Enregistrer un versement • {txTargetSlip.employeeName}
                        </strong>
                        <span className="text-[10px] text-gray-500 font-mono">
                          Matricule : {txTargetSlip.employeeMatricule}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddTransactionModal(false);
                          setTxTargetSlip(null);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <form onSubmit={handleCreateTransaction} className="space-y-3 text-xs">
                      <div className="p-3 bg-gray-50 rounded-xl border grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-gray-500 block">Net total bulletin :</span>
                          <strong className="font-mono text-gray-900">{formatFcfa(txTargetSlip.netToPay)}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-blue-600 block">Solde restant dû :</span>
                          <strong className="font-mono text-blue-700">{formatFcfa(txTargetSlip.remainingAmount)}</strong>
                        </div>
                      </div>

                      <Input
                        label="Montant à verser (FCFA) *"
                        type="number"
                        value={txAmount}
                        onChange={(e) => setTxAmount(e.target.value)}
                        required
                      />

                      {/* Détection automatique de dépassement */}
                      {parseInt(txAmount, 10) > txTargetSlip.remainingAmount && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                          <div className="flex items-start gap-2 text-amber-800 font-bold text-xs">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <span>
                              Attention : Ce versement excède le solde restant de {formatFcfa(parseInt(txAmount, 10) - txTargetSlip.remainingAmount)}.
                            </span>
                          </div>

                          <label className="flex items-start gap-2 text-[11px] text-amber-900 cursor-pointer pt-1">
                            <input
                              type="checkbox"
                              checked={allowOverpayment}
                              onChange={(e) => setAllowOverpayment(e.target.checked)}
                              className="mt-0.5"
                            />
                            <span>
                              Autoriser expressément ce versement supérieur au solde (enregistrera un trop-perçu à régulariser ultérieurement).
                            </span>
                          </label>

                          {allowOverpayment && (
                            <Input
                              label="Justification du dépassement *"
                              placeholder="Ex: Prime exceptionnelle non intégrée au bulletin, acompte mois prochain"
                              value={overpaymentReason}
                              onChange={(e) => setOverpaymentReason(e.target.value)}
                              required
                            />
                          )}
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Mode de règlement *</label>
                        <select
                          className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-xs focus:border-blue-500 focus:outline-none"
                          value={txMethod}
                          onChange={(e) => setTxMethod(e.target.value as any)}
                        >
                          <option value="Virement bancaire">Virement bancaire</option>
                          <option value="Espèces (Caisse)">Espèces (Caisse locale)</option>
                          <option value="Mobile Money">Mobile Money (MTN / Moov / Celtiis)</option>
                          <option value="Chèque">Chèque bancaire</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          label="Date d'exécution *"
                          type="date"
                          value={txDate}
                          onChange={(e) => setTxDate(e.target.value)}
                          required
                        />
                        <Input
                          label="N° Référence / Quittance *"
                          placeholder="VIR-001, BORD-..."
                          value={txRef}
                          onChange={(e) => setTxRef(e.target.value)}
                          required
                        />
                      </div>

                      <Input
                        label="Notes complémentaires"
                        placeholder="Ex: Virement exécuté par BOA Bénin"
                        value={txNotes}
                        onChange={(e) => setTxNotes(e.target.value)}
                      />

                      <div className="pt-2 flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowAddTransactionModal(false);
                            setTxTargetSlip(null);
                          }}
                        >
                          Annuler
                        </Button>
                        <Button
                          type="submit"
                          size="sm"
                          disabled={parseInt(txAmount, 10) > txTargetSlip.remainingAmount && !allowOverpayment}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        >
                          Valider le versement
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* ONGLET 2 : OBLIGATIONS SOCIALES CNSS BÉNIN */}
          {/* ========================================================================= */}
          {activeTab === 'cnss' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-700" />
                  <strong className="text-blue-950 text-sm">Déclaration & Reversement CNSS (Bénin)</strong>
                </div>
                <p className="text-xs text-blue-800">
                  Total des cotisations salariales (3,6%) et patronales (17,4% : Retraite, Prestations familiales, Accidents) exigibles au plus tard le 15 du mois suivant.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-white rounded-xl border border-gray-200">
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Montant Déclaré Exigible</span>
                  <div className="text-base font-black text-blue-700 font-mono mt-0.5">{formatFcfa(run.totalCnss)}</div>
                  <span className="text-[10px] text-gray-400 block mt-0.5">Part Salarié + Employeur</span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-emerald-600 uppercase font-bold block">Montant Reversé à la CNSS</span>
                  <div className="text-base font-black text-emerald-700 font-mono mt-0.5">{formatFcfa(run.cnssPaidAmount || 0)}</div>
                  <span className="text-[10px] text-gray-400 block mt-0.5">Quittance de versement</span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-rose-200">
                  <span className="text-[10px] text-rose-600 uppercase font-bold block">Solde Restant Dû</span>
                  <div className="text-base font-black text-rose-700 font-mono mt-0.5">
                    {formatFcfa(Math.max(0, run.totalCnss - (run.cnssPaidAmount || 0)))}
                  </div>
                  <span className="text-[10px] text-gray-400 block mt-0.5">À régler avant échéance</span>
                </div>
              </div>

              <form onSubmit={handleSaveCnssPayment} className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                <span className="font-bold text-gray-900 text-xs block">Enregistrer le reversement à la CNSS :</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    label="Montant versé (FCFA) *"
                    type="number"
                    value={cnssPaidAmount}
                    onChange={(e) => setCnssPaidAmount(e.target.value)}
                    required
                  />
                  <Input
                    label="Date de versement *"
                    type="date"
                    value={cnssPayDate}
                    onChange={(e) => setCnssPayDate(e.target.value)}
                    required
                  />
                  <Input
                    label="N° Quittance / Bordereau CNSS *"
                    placeholder="QUIT-CNSS-..."
                    value={cnssPayRef}
                    onChange={(e) => setCnssPayRef(e.target.value)}
                    required
                  />
                </div>
                <div className="flex justify-end pt-1">
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9">
                    Enregistrer la quittance CNSS
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ONGLET 3 : OBLIGATIONS FISCALES ITS DGI BÉNIN */}
          {/* ========================================================================= */}
          {activeTab === 'dgi' && (
            <div className="space-y-4">
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-purple-700" />
                  <strong className="text-purple-950 text-sm">Déclaration & Reversement ITS (DGI Bénin)</strong>
                </div>
                <p className="text-xs text-purple-800">
                  Total des retenues à la source opérées au titre de l’Impôt sur le Traitement des Salaires (barème progressif CGI Bénin 0% à 30%).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-white rounded-xl border border-gray-200">
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Montant Total Retenu</span>
                  <div className="text-base font-black text-purple-700 font-mono mt-0.5">{formatFcfa(run.totalIts)}</div>
                  <span className="text-[10px] text-gray-400 block mt-0.5">Barème progressif CGI</span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-emerald-600 uppercase font-bold block">Montant Reversé au Trésor (DGI)</span>
                  <div className="text-base font-black text-emerald-700 font-mono mt-0.5">{formatFcfa(run.dgiPaidAmount || 0)}</div>
                  <span className="text-[10px] text-gray-400 block mt-0.5">Quittance télépaiement DGI</span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-rose-200">
                  <span className="text-[10px] text-rose-600 uppercase font-bold block">Solde Restant Dû</span>
                  <div className="text-base font-black text-rose-700 font-mono mt-0.5">
                    {formatFcfa(Math.max(0, run.totalIts - (run.dgiPaidAmount || 0)))}
                  </div>
                  <span className="text-[10px] text-gray-400 block mt-0.5">À régler avant le 10 du mois suivant</span>
                </div>
              </div>

              <form onSubmit={handleSaveDgiPayment} className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                <span className="font-bold text-gray-900 text-xs block">Enregistrer le reversement de l’ITS à la DGI :</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    label="Montant reversé (FCFA) *"
                    type="number"
                    value={dgiPaidAmount}
                    onChange={(e) => setDgiPaidAmount(e.target.value)}
                    required
                  />
                  <Input
                    label="Date de versement *"
                    type="date"
                    value={dgiPayDate}
                    onChange={(e) => setDgiPayDate(e.target.value)}
                    required
                  />
                  <Input
                    label="N° Quittance DGI / e-MECeF *"
                    placeholder="QUIT-DGI-ITS-..."
                    value={dgiPayRef}
                    onChange={(e) => setDgiPayRef(e.target.value)}
                    required
                  />
                </div>
                <div className="flex justify-end pt-1">
                  <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-9">
                    Enregistrer la quittance DGI
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Pied de page */}
        <div className="pt-3 border-t border-gray-200 flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
}
