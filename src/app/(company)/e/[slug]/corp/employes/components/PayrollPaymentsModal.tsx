'use client';

import * as React from 'react';
import {
  X,
  CreditCard,
  Building2,
  Landmark,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck,
  DollarSign,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatFcfa } from '@/server/domain/money';
import { PayrollRunItem, PayslipItem } from '@/lib/payroll-store';

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

  // Modale pour payer un salarié individuel
  const [payingSlip, setPayingSlip] = React.useState<PayslipItem | null>(null);
  const [payAmount, setPayAmount] = React.useState('');
  const [payMethod, setPayMethod] = React.useState<'Virement bancaire' | 'Espèces (Caisse)' | 'Mobile Money' | 'Chèque'>('Virement bancaire');
  const [payDate, setPayDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [payRef, setPayRef] = React.useState('');

  // Formulaire de règlement CNSS
  const [cnssPaidAmount, setCnssPaidAmount] = React.useState('');
  const [cnssPayDate, setCnssPayDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [cnssPayRef, setCnssPayRef] = React.useState('');

  // Formulaire de règlement DGI
  const [dgiPaidAmount, setDgiPaidAmount] = React.useState('');
  const [dgiPayDate, setDgiPayDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [dgiPayRef, setDgiPayRef] = React.useState('');

  React.useEffect(() => {
    if (run) {
      setPayslips(run.payslips || []);
      setCnssPaidAmount(String(run.cnssPaidAmount || run.totalCnss));
      setCnssPayDate(run.cnssPaymentDate || new Date().toISOString().split('T')[0]);
      setCnssPayRef(run.cnssPaymentRef || 'QUIT-CNSS-2026-');

      setDgiPaidAmount(String(run.dgiPaidAmount || run.totalIts));
      setDgiPayDate(run.dgiPaymentDate || new Date().toISOString().split('T')[0]);
      setDgiPayRef(run.dgiPaymentRef || 'QUIT-DGI-ITS-');
    }
  }, [run, isOpen]);

  if (!isOpen || !run) return null;

  // Calculs financiers
  const totalNetDue = payslips.reduce((sum, p) => sum + p.netToPay, 0);
  const totalNetPaid = payslips.reduce((sum, p) => sum + p.paidAmount, 0);
  const totalNetRemaining = totalNetDue - totalNetPaid;

  // Ouvrir modal de paiement pour un salarié
  const openSinglePayment = (slip: PayslipItem) => {
    setPayingSlip(slip);
    setPayAmount(String(slip.remainingAmount > 0 ? slip.remainingAmount : slip.netToPay));
    setPayMethod(slip.paymentMethod as any || 'Virement bancaire');
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayRef(`VIR-${slip.employeeMatricule}-${run.periodKey}`);
  };

  // Enregistrer le paiement individuel
  const handleConfirmSinglePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingSlip) return;

    const amountNum = parseInt(payAmount, 10);
    if (isNaN(amountNum) || amountNum <= 0) return;

    const newPaidAmount = payingSlip.paidAmount + amountNum;
    const newRemaining = Math.max(0, payingSlip.netToPay - newPaidAmount);
    const newStatus = newRemaining === 0 ? 'PAYE' : 'PARTIEL';

    const updated = payslips.map((p) => {
      if (p.id === payingSlip.id) {
        return {
          ...p,
          paidAmount: newPaidAmount,
          remainingAmount: newRemaining,
          paymentStatus: newStatus as any,
          paymentDate: payDate,
          paymentMethod: payMethod,
          paymentReference: payRef.trim(),
        };
      }
      return p;
    });

    setPayslips(updated);
    setPayingSlip(null);
    onUpdateRunPayments(run.id, updated);
  };

  // Payer tous les salariés en masse (Paiement collectif)
  const handlePayAllEmployees = () => {
    if (!confirm(`Confirmez-vous le paiement groupé de tous les salariés pour ${run.monthLabel} (Montant total restant : ${formatFcfa(totalNetRemaining)}) ?`)) {
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const updated = payslips.map((p) => ({
      ...p,
      paidAmount: p.netToPay,
      remainingAmount: 0,
      paymentStatus: 'PAYE' as const,
      paymentDate: p.paymentDate || today,
      paymentMethod: p.paymentMethod || 'Virement bancaire',
      paymentReference: p.paymentReference || `VIR-MASSE-${run.periodKey}`,
    }));

    setPayslips(updated);
    onUpdateRunPayments(run.id, updated);
  };

  // Enregistrer le règlement CNSS
  const handleSaveCnssPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseInt(cnssPaidAmount, 10) || 0;
    onUpdateRunPayments(run.id, payslips, {
      paidAmount: amountNum,
      paymentDate: cnssPayDate,
      paymentRef: cnssPayRef.trim(),
    });
    alert('Règlement des cotisations CNSS enregistré avec succès.');
  };

  // Enregistrer le règlement DGI
  const handleSaveDgiPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseInt(dgiPaidAmount, 10) || 0;
    onUpdateRunPayments(run.id, payslips, undefined, {
      paidAmount: amountNum,
      paymentDate: dgiPayDate,
      paymentRef: dgiPayRef.trim(),
    });
    alert('Règlement de la retenue ITS auprès de la DGI enregistré avec succès.');
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
                Gérez les décaissements réels des salaires nets et l'acquittement des obligations fiscales (ITS DGI) et sociales (CNSS).
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
              activeTab === 'salaries' ? 'border-emerald-600 text-emerald-700 font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'
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
              activeTab === 'dgi' ? 'border-purple-600 text-purple-700 font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'
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
              {/* Cartes de synthèse des salaires */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-white rounded-xl border border-gray-200">
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Total Salaires Nets Validés</span>
                  <div className="text-base font-black text-gray-900 font-mono mt-0.5">{formatFcfa(totalNetDue)}</div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-emerald-600 uppercase font-bold block">Total Effectivement Versé</span>
                  <div className="text-base font-black text-emerald-700 font-mono mt-0.5">{formatFcfa(totalNetPaid)}</div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-rose-200">
                  <span className="text-[10px] text-rose-600 uppercase font-bold block">Solde Restant à Décaisser</span>
                  <div className="text-base font-black text-rose-700 font-mono mt-0.5">{formatFcfa(totalNetRemaining)}</div>
                </div>
              </div>

              {/* Barre d'action collective */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className="text-xs text-gray-600">
                  Règlements individuels par virement/espèces ou paiement collectif groupé :
                </span>
                {totalNetRemaining > 0 && (
                  <Button
                    size="sm"
                    onClick={handlePayAllEmployees}
                    className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Payer l'ensemble des salariés restants</span>
                  </Button>
                )}
              </div>

              {/* Tableau de paiement des salariés */}
              <div className="border border-gray-200 rounded-xl overflow-x-auto shadow-xs">
                <table className="w-full text-left text-xs min-w-[750px]">
                  <thead className="bg-gray-100 font-bold text-gray-700 uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Matricule & Salarié</th>
                      <th className="p-2.5 text-right">Net à Payer</th>
                      <th className="p-2.5 text-right">Montant Versé</th>
                      <th className="p-2.5 text-right">Solde Dû</th>
                      <th className="p-2.5">Mode & Date Règlement</th>
                      <th className="p-2.5">Référence</th>
                      <th className="p-2.5 text-center">Statut</th>
                      <th className="p-2.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white font-mono">
                    {payslips.map((slip) => {
                      const isPaid = slip.paymentStatus === 'PAYE';
                      return (
                        <tr key={slip.id} className="hover:bg-gray-50">
                          <td className="p-2.5 font-sans">
                            <strong className="text-gray-900 block">{slip.employeeName}</strong>
                            <span className="text-[10px] text-gray-400 font-mono">{slip.employeeMatricule}</span>
                          </td>
                          <td className="p-2.5 text-right font-black text-gray-900">{formatFcfa(slip.netToPay)}</td>
                          <td className="p-2.5 text-right font-bold text-emerald-700">{formatFcfa(slip.paidAmount)}</td>
                          <td className="p-2.5 text-right font-bold text-rose-700">{formatFcfa(slip.remainingAmount)}</td>
                          <td className="p-2.5 font-sans text-[11px] text-gray-600">
                            {slip.paymentMethod || 'Virement bancaire'}
                            {slip.paymentDate && <span className="block text-[10px] text-gray-400">{new Date(slip.paymentDate).toLocaleDateString('fr-BJ')}</span>}
                          </td>
                          <td className="p-2.5 font-mono text-[10px] text-gray-500">
                            {slip.paymentReference || '—'}
                          </td>
                          <td className="p-2.5 text-center font-sans">
                            <span
                              className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {isPaid ? '✓ Réglé' : '● À payer'}
                            </span>
                          </td>
                          <td className="p-2.5 text-center font-sans">
                            {!isPaid ? (
                              <Button
                                size="sm"
                                onClick={() => openSinglePayment(slip)}
                                className="h-7 px-2.5 text-[11px] bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                              >
                                Enregistrer règlement
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openSinglePayment(slip)}
                                className="h-7 px-2.5 text-[10px] text-gray-600"
                              >
                                Modifier
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Modale d'enregistrement de paiement individuel */}
              {payingSlip && (
                <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 border">
                    <div className="flex items-center justify-between border-b pb-2">
                      <strong className="text-gray-900 text-sm">
                        Règlement du salaire : {payingSlip.employeeName}
                      </strong>
                      <button type="button" onClick={() => setPayingSlip(null)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <form onSubmit={handleConfirmSinglePayment} className="space-y-3">
                      <div className="p-3 bg-gray-50 rounded-xl border text-xs flex justify-between">
                        <span>Net total du bulletin :</span>
                        <strong className="font-mono text-gray-900">{formatFcfa(payingSlip.netToPay)}</strong>
                      </div>

                      <Input
                        label="Montant à verser (FCFA) *"
                        type="number"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        required
                      />

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Mode de règlement *</label>
                        <select
                          className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-xs focus:border-blue-500 focus:outline-none"
                          value={payMethod}
                          onChange={(e) => setPayMethod(e.target.value as any)}
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
                          value={payDate}
                          onChange={(e) => setPayDate(e.target.value)}
                          required
                        />
                        <Input
                          label="N° Référence / Quittance"
                          placeholder="VIR-001, BORD-..."
                          value={payRef}
                          onChange={(e) => setPayRef(e.target.value)}
                        />
                      </div>

                      <div className="pt-2 flex justify-end gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setPayingSlip(null)}>
                          Annuler
                        </Button>
                        <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                          Confirmer le versement
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
