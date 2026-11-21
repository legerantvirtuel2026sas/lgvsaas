'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  CreditCard,
  CheckCircle2,
  Receipt,
  Calendar,
  AlertCircle,
  Clock,
  Printer,
  Eye,
  FileText,
  X,
  ShieldCheck,
  Check,
  Building2,
  Phone,
  User,
  Wallet,
  ArrowRight,
  TrendingUp,
  RotateCcw,
  Sparkles,
  Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatFcfa } from '@/server/domain/money';
import {
  loadSalesDocuments,
  saveSalesDocuments,
  recordInvoicePayment,
  SalesRow,
  InvoicePaymentInstallment,
} from '@/lib/sales-store';

export default function PaymentsAndInstallmentsPage({ params }: { params: { slug: string } }) {
  const companySlug = params.slug;
  const companyDisplayName = companySlug.replace(/-/g, ' ').toUpperCase();

  // Liste globale des factures synchronisée en temps réel
  const [documents, setDocuments] = React.useState<SalesRow[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = React.useState<string>('');
  
  // États du formulaire d'encaissement d'échéance
  const [paymentAmountStr, setPaymentAmountStr] = React.useState<string>('');
  const [paymentMode, setPaymentMode] = React.useState<'ESPECES' | 'MOBILE_MONEY' | 'CHEQUE' | 'VIREMENT'>('ESPECES');
  const [mobileOperator, setMobileOperator] = React.useState<'MTN' | 'MOOV' | 'CELTIIS'>('CELTIIS');
  const [transactionRef, setTransactionRef] = React.useState<string>('');
  const [paymentNotes, setPaymentNotes] = React.useState<string>('');

  // États des modales
  const [showConfirmModal, setShowConfirmModal] = React.useState<boolean>(false);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  
  // Modale d'aperçu de la facture complète (A4, Ticket, Bordereau)
  const [viewingInvoice, setViewingInvoice] = React.useState<SalesRow | null>(null);
  const [previewTab, setPreviewTab] = React.useState<'INVOICE' | 'RECEIPT' | 'DELIVERY'>('INVOICE');

  // Modale d'impression du reçu de versement d'échéance spécifique (Ticket reçu 80mm)
  const [viewingReceiptInstallment, setViewingReceiptInstallment] = React.useState<{
    installment: InvoicePaymentInstallment;
    invoice: SalesRow;
  } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Chargement et synchronisation des factures depuis le store
  const refreshDocuments = React.useCallback(() => {
    const docs = loadSalesDocuments(companySlug);
    setDocuments(docs);
  }, [companySlug]);

  React.useEffect(() => {
    refreshDocuments();

    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.companySlug === companySlug && customEvent.detail?.documents) {
        setDocuments(customEvent.detail.documents);
      }
    };

    window.addEventListener('lgv_sales_changed', handleSync);
    return () => window.removeEventListener('lgv_sales_changed', handleSync);
  }, [companySlug, refreshDocuments]);

  // Filtrer les factures portant un reste à payer
  const invoicesWithDebt = React.useMemo(() => {
    return documents.filter((doc) => doc.remainingAmount > 0);
  }, [documents]);

  // Factures entièrement soldées (pour consultation de l'historique complet)
  const settledInvoices = React.useMemo(() => {
    return documents.filter((doc) => doc.remainingAmount === 0 && (doc.status === 'VALIDATED' || doc.status === 'FISCALIZED'));
  }, [documents]);

  // Sélection automatique de la première facture avec dette au chargement si aucune n'est sélectionnée
  React.useEffect(() => {
    if (invoicesWithDebt.length > 0 && !selectedInvoiceId) {
      setSelectedInvoiceId(invoicesWithDebt[0].id);
    }
  }, [invoicesWithDebt, selectedInvoiceId]);

  // Facture actuellement sélectionnée
  const selectedInvoice = React.useMemo(() => {
    return documents.find((doc) => doc.id === selectedInvoiceId) || null;
  }, [documents, selectedInvoiceId]);

  // Si viewingInvoice est ouvert et que selectedInvoice change, mettre à jour viewingInvoice
  React.useEffect(() => {
    if (viewingInvoice && selectedInvoice && viewingInvoice.id === selectedInvoice.id) {
      setViewingInvoice(selectedInvoice);
    }
  }, [selectedInvoice, viewingInvoice]);

  // Calcul dynamique du nouveau reste à payer lors de la saisie
  const numericPaymentAmount = Math.max(0, parseInt(paymentAmountStr || '0', 10) || 0);
  const projectedRemaining = selectedInvoice
    ? Math.max(0, selectedInvoice.remainingAmount - numericPaymentAmount)
    : 0;

  // Réinitialiser le montant de saisie lors du changement de facture sélectionnée
  const handleSelectInvoice = (id: string) => {
    setSelectedInvoiceId(id);
    setPaymentAmountStr('');
    setTransactionRef('');
    setPaymentNotes('');
  };

  // Raccourci direct pour solder l'intégralité du reste dû en un clic
  const handleDirectSolderTout = () => {
    if (!selectedInvoice || selectedInvoice.remainingAmount <= 0) return;
    setPaymentAmountStr(String(selectedInvoice.remainingAmount));
    setShowConfirmModal(true);
  };

  // Ouverture du dialogue de confirmation pour versement
  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    if (numericPaymentAmount <= 0) {
      alert('Veuillez saisir un montant de versement supérieur à 0 FCFA.');
      return;
    }

    if (numericPaymentAmount > selectedInvoice.remainingAmount) {
      alert(
        `Le montant saisi (${formatFcfa(numericPaymentAmount)}) dépasse le reste à payer actuel (${formatFcfa(
          selectedInvoice.remainingAmount
        )}). Veuillez ajuster le montant.`
      );
      return;
    }

    setShowConfirmModal(true);
  };

  // Validation effective du paiement après confirmation
  const handleExecutePayment = () => {
    if (!selectedInvoice) return;

    const result = recordInvoicePayment(companySlug, selectedInvoice.id, {
      amount: numericPaymentAmount,
      paymentMode,
      mobileOperator: paymentMode === 'MOBILE_MONEY' ? mobileOperator : undefined,
      notes: paymentNotes || undefined,
      recordedBy: selectedInvoice.cashierName || 'SSEBIO',
    });

    if (result) {
      setShowConfirmModal(false);
      setPaymentAmountStr('');
      setTransactionRef('');
      setPaymentNotes('');
      // Proposer immédiatement le reçu thermique pour le paiement effectué
      setViewingReceiptInstallment({
        installment: result.newInstallment,
        invoice: result.updatedInvoice,
      });
      showToast(
        `Règlement enregistré avec succès ! Quittance N° ${result.newInstallment.id} (Réf: ${result.newInstallment.reference}).`
      );
    }
  };

  // Liste des échéances de la facture sélectionnée
  const invoiceInstallments: InvoicePaymentInstallment[] = React.useMemo(() => {
    if (!selectedInvoice) return [];
    
    // Si la facture a déjà des installments stockés :
    if (selectedInvoice.installments && selectedInvoice.installments.length > 0) {
      return selectedInvoice.installments;
    }

    // Si la facture a eu un acompte initial lors de la création mais pas encore tracé :
    if (selectedInvoice.paidAmount > 0) {
      return [
        {
          id: 'ECH-001',
          invoiceId: selectedInvoice.id,
          documentNumber: selectedInvoice.documentNumber,
          date: selectedInvoice.date,
          time: selectedInvoice.time || '10:00',
          label: 'Acompte initial à la facturation',
          paymentMode: (selectedInvoice.paymentMode === 'A_TERME' ? 'ESPECES' : selectedInvoice.paymentMode) as any,
          amount: selectedInvoice.paidAmount,
          remainingAfter: selectedInvoice.netToPay - selectedInvoice.paidAmount,
          recordedBy: selectedInvoice.cashierName || 'SSEBIO',
        },
      ];
    }

    return [];
  }, [selectedInvoice]);

  // Totaux des créances dans le bandeau supérieur
  const totalDebtAmount = React.useMemo(() => {
    return invoicesWithDebt.reduce((sum, doc) => sum + doc.remainingAmount, 0);
  }, [invoicesWithDebt]);

  const totalCollectedAmount = React.useMemo(() => {
    return documents.reduce((sum, doc) => sum + doc.paidAmount, 0);
  }, [documents]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-24 right-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 border border-gray-700 animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* En-tête de la page */}
      <div className="border-b border-gray-200 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <Wallet className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Paiements & Échelonnements des règlements
            </h1>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Enregistrez les encaissements d'échéances sur les factures impayées, suivez l'historique complet des versements et visualisez les factures actualisées.
          </p>
        </div>

        {/* Bouton vers Ventes */}
        <div className="shrink-0">
          <Link href={`/e/${companySlug}/commerce/ventes`} className="inline-block shrink-0">
            <Button
              className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm whitespace-nowrap shrink-0 transition-all border border-blue-600"
            >
              <FileText className="w-4 h-4 shrink-0 text-white" />
              <span className="whitespace-nowrap">Journal des ventes</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Cartes KPI Synthèse */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block">
              Factures à recouvrer
            </span>
            <span className="text-2xl font-black text-gray-900 mt-1 block">
              {invoicesWithDebt.length}
            </span>
          </div>
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block">
              Créances en cours (Dettes)
            </span>
            <span className="text-2xl font-black text-red-600 mt-1 block">
              {formatFcfa(totalDebtAmount)}
            </span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block">
              Total Règlements Encaissés
            </span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">
              {formatFcfa(totalCollectedAmount)}
            </span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION PRINCIPALE : SÉLECTEUR DE FACTURE & SAISIE DU RÈGLEMENT */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
        
        {/* Ligne 1 : Titre + Badge du nombre de factures disponibles */}
        <div className="space-y-2.5 pb-5 border-b border-gray-100">
          <div className="flex flex-wrap items-center gap-2.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Sélectionner une facture portant un reste à payer *
            </label>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 shadow-xs whitespace-nowrap">
              {invoicesWithDebt.length} {invoicesWithDebt.length > 1 ? 'factures disponibles' : 'facture disponible'}
            </span>
          </div>

          {/* Ligne 2 : Combo de sélection + Bouton Aperçu de la facture bien alignés */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              {invoicesWithDebt.length > 0 ? (
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => handleSelectInvoice(e.target.value)}
                  className="w-full h-11 px-3.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-sm"
                >
                  <optgroup label="Factures avec reste à payer (À recouvrer)">
                    {invoicesWithDebt.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.documentNumber} • {inv.customerName} — Reste : {formatFcfa(inv.remainingAmount)} (Net : {formatFcfa(inv.netToPay)})
                      </option>
                    ))}
                  </optgroup>

                  {settledInvoices.length > 0 && (
                    <optgroup label="Factures déjà entièrement soldées (Historique)">
                      {settledInvoices.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          ✓ {inv.documentNumber} • {inv.customerName} (Soldée — {formatFcfa(inv.netToPay)})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              ) : (
                <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Excellente nouvelle ! Toutes les factures émises sont actuellement entièrement soldées.</span>
                </div>
              )}
            </div>

            {/* Bouton Aperçu de la facture sélectionnée */}
            {selectedInvoice && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setViewingInvoice(selectedInvoice);
                  setPreviewTab('INVOICE');
                }}
                className="h-11 px-5 border-blue-600 bg-blue-50/70 hover:bg-blue-100 text-blue-700 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm shrink-0 whitespace-nowrap transition-all"
                title="Consulter l'aperçu officiel A4 ou ticket de cette facture"
              >
                <Eye className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Aperçu de la facture</span>
              </Button>
            )}
          </div>
        </div>

        {selectedInvoice ? (
          <div className="space-y-6">
            
            {/* 1. Carte des informations de la facture (Champs en lecture seule non modifiables) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Détails financiers de la facture sélectionnée (Non modifiables)
                </span>
                <span className="text-xs font-medium text-gray-500">
                  Émise le {selectedInvoice.date} {selectedInvoice.time ? `à ${selectedInvoice.time}` : ''}
                </span>
              </div>

              {/* Bloc client & référence : dynamique en hauteur, sans chevauchement pour les longs noms */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 bg-gray-50/90 rounded-2xl border border-gray-200 text-xs mb-4 items-start">
                {/* 1. Client facturé : 6 colonnes, break-words sans restriction */}
                <div className="md:col-span-6 min-w-0 flex items-start gap-3">
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-xl shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-gray-500 font-semibold text-[11px] uppercase tracking-wider block mb-0.5">
                      Client facturé
                    </span>
                    <div className="text-gray-900 font-bold text-sm leading-snug break-words whitespace-normal">
                      {selectedInvoice.customerName}
                    </div>
                    {selectedInvoice.customerPhone && (
                      <span className="text-gray-500 text-xs mt-1 inline-flex items-center gap-1 font-medium">
                        <Phone className="w-3 h-3 text-gray-400" />
                        {selectedInvoice.customerPhone}
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. IFU Client : 3 colonnes */}
                <div className="md:col-span-3 min-w-0 flex items-start gap-3">
                  <div className="p-2 bg-gray-100 text-gray-700 rounded-xl shrink-0 mt-0.5">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-gray-500 font-semibold text-[11px] uppercase tracking-wider block mb-0.5">
                      N° IFU Client
                    </span>
                    <div className="font-mono text-gray-900 font-bold text-xs break-all">
                      {selectedInvoice.customerIfu && selectedInvoice.customerIfu.trim() !== ''
                        ? selectedInvoice.customerIfu
                        : 'Particulier / Non renseigné'}
                    </div>
                  </div>
                </div>

                {/* 3. Date limite d'échéance : 3 colonnes */}
                <div className="md:col-span-3 min-w-0 flex items-start gap-3">
                  <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0 mt-0.5">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-gray-500 font-semibold text-[11px] uppercase tracking-wider block mb-0.5">
                      Date limite d'échéance
                    </span>
                    <div className="text-gray-900 font-bold text-xs font-mono">
                      {selectedInvoice.dueDate && selectedInvoice.dueDate.trim() !== ''
                        ? selectedInvoice.dueDate
                        : 'Non définie (Facture à terme)'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3 Grands Blocs Financiers en lecture seule */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Net à Payer */}
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-right">
                  <span className="text-xs font-bold text-gray-500 uppercase block mb-1">
                    Net Total à Payer
                  </span>
                  <span className="text-2xl font-black text-blue-700 font-mono block">
                    {formatFcfa(selectedInvoice.netToPay)}
                  </span>
                  <span className="text-[11px] text-gray-400 block mt-1">Montant initial facturé</span>
                </div>

                {/* Déjà Payé */}
                <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 text-right">
                  <span className="text-xs font-bold text-emerald-800 uppercase block mb-1">
                    Montant Déjà Payé
                  </span>
                  <span className="text-2xl font-black text-emerald-700 font-mono block">
                    {formatFcfa(selectedInvoice.paidAmount)}
                  </span>
                  <span className="text-[11px] text-emerald-600 block mt-1">Somme cumulée des acomptes</span>
                </div>

                {/* Reste à Payer Actuel */}
                <div className={`p-4 rounded-xl border text-right ${
                  selectedInvoice.remainingAmount > 0
                    ? 'bg-red-50/70 border-red-200'
                    : 'bg-emerald-50/80 border-emerald-300'
                }`}>
                  <span className={`text-xs font-bold uppercase block mb-1 ${
                    selectedInvoice.remainingAmount > 0 ? 'text-red-700' : 'text-emerald-800'
                  }`}>
                    Reste à Payer Actuel
                  </span>
                  <span className={`text-2xl font-black font-mono block ${
                    selectedInvoice.remainingAmount > 0 ? 'text-red-600' : 'text-emerald-700'
                  }`}>
                    {formatFcfa(selectedInvoice.remainingAmount)}
                  </span>
                  <span className="text-[11px] font-semibold block mt-1 text-gray-600">
                    {selectedInvoice.remainingAmount > 0 ? '⚠️ Dette restant à recouvrer' : '✓ Facture entièrement soldée'}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Formulaire de saisie du nouveau versement (Si la facture a encore un reste à payer) */}
            {selectedInvoice.remainingAmount > 0 ? (
              <form onSubmit={handleOpenConfirm} className="p-5 bg-blue-50/40 rounded-2xl border border-blue-200 space-y-5">
                <div className="flex items-center justify-between border-b border-blue-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-bold text-blue-900 uppercase tracking-wide">
                      Enregistrer un nouveau versement / échéance
                    </span>
                  </div>
                  <span className="text-xs text-blue-700 font-semibold">
                    Facture N° {selectedInvoice.documentNumber}
                  </span>
                </div>

                {/* Deux champs uniquement, parfaitement alignés sur la même ligne */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                  {/* Champ 1 : Montant à verser là tout de suite */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-800 h-6 flex items-center whitespace-nowrap">
                      Montant à verser là tout de suite (FCFA) *
                    </label>

                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max={selectedInvoice.remainingAmount}
                        placeholder="Ex: 50 000"
                        value={paymentAmountStr}
                        onChange={(e) => setPaymentAmountStr(e.target.value)}
                        required
                        className="w-full h-11 pl-3.5 pr-14 bg-white border border-gray-300 rounded-xl text-base font-bold font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 pointer-events-none">
                        FCFA
                      </span>
                    </div>

                    {/* Réajustement dynamique immédiat du reste à payer */}
                    <div className="text-xs pt-1">
                      {numericPaymentAmount > 0 ? (
                        numericPaymentAmount <= selectedInvoice.remainingAmount ? (
                          <div className={`p-2.5 rounded-xl font-medium flex items-center justify-between ${
                            projectedRemaining === 0
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}>
                            <span className="font-semibold">Reste après versement :</span>
                            <strong className="font-mono text-sm font-bold">
                              {projectedRemaining === 0 ? '0 FCFA (Soldé !)' : formatFcfa(projectedRemaining)}
                            </strong>
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-xl bg-red-100 text-red-900 border border-red-300 font-bold flex items-center gap-1.5 text-xs">
                            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                            <span>Montant supérieur au reste à payer ({formatFcfa(selectedInvoice.remainingAmount)}) !</span>
                          </div>
                        )
                      ) : (
                        <span className="text-gray-500 text-[11px] block italic py-1">
                          Le reste à payer sera calculé automatiquement au fur et à mesure de votre saisie.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Champ 2 : Mode de règlement */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-800 h-6 flex items-center whitespace-nowrap">
                      Mode de règlement *
                    </label>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value as any)}
                      className="w-full h-11 px-3.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all"
                    >
                      <option value="ESPECES">Espèces (Guichet / Caisse)</option>
                      <option value="MOBILE_MONEY">Mobile Money (MTN / Moov / Celtiis)</option>
                      <option value="VIREMENT">Virement bancaire</option>
                      <option value="CHEQUE">Chèque bancaire</option>
                    </select>

                    {/* Sous-choix opérateur si Mobile Money */}
                    <div className="text-xs pt-1">
                      {paymentMode === 'MOBILE_MONEY' ? (
                        <div className="flex items-center gap-2 py-0.5">
                          <span className="text-xs font-semibold text-gray-500">Réseau :</span>
                          {(['CELTIIS', 'MTN', 'MOOV'] as const).map((net) => (
                            <button
                              key={net}
                              type="button"
                              onClick={() => setMobileOperator(net)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
                                mobileOperator === net
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                              }`}
                            >
                              {net}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-[11px] block py-1">
                          Une référence de quittance unique sera attribuée automatiquement à ce règlement.
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Totalement en bas après les champs : Boutons d'action dont Solder tout */}
                <div className="pt-4 border-t border-blue-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  {/* Bouton Solder Tout */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDirectSolderTout}
                    className="h-11 px-5 border-emerald-600 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
                    title="Solder l'intégralité du reste à payer en un clic"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Solder tout le reste à payer ({formatFcfa(selectedInvoice.remainingAmount)})</span>
                  </Button>

                  {/* Bouton Valider l'encaissement saisi */}
                  <Button
                    type="submit"
                    disabled={numericPaymentAmount <= 0 || numericPaymentAmount > selectedInvoice.remainingAmount}
                    className="h-11 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <Check className="w-4 h-4 shrink-0" />
                    <span>
                      Valider l'encaissement{' '}
                      {numericPaymentAmount > 0 && numericPaymentAmount <= selectedInvoice.remainingAmount
                        ? `(${formatFcfa(numericPaymentAmount)})`
                        : ''}
                    </span>
                  </Button>
                </div>
              </form>
            ) : (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <strong className="block text-sm">Cette facture est entièrement soldée !</strong>
                    <span>Aucun paiement supplémentaire n'est requis sur ce document.</span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setViewingInvoice(selectedInvoice);
                    setPreviewTab('INVOICE');
                  }}
                  className="bg-white border-emerald-300 text-emerald-800 hover:bg-emerald-100 font-bold"
                >
                  Imprimer la facture soldée
                </Button>
              </div>
            )}

            {/* 3. TABLEAU DES PAIEMENTS ET ÉCHELONNEMENTS EFFECTUÉS SUR CETTE FACTURE */}
            <div className="pt-4 border-t border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-blue-600" />
                  <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                    Historique des règlements & Échelonnements de la facture ({invoiceInstallments.length} ligne{invoiceInstallments.length > 1 ? 's' : ''})
                  </h2>
                </div>
                <span className="text-xs text-gray-500 font-mono">
                  Facture : {selectedInvoice.documentNumber}
                </span>
              </div>

              {invoiceInstallments.length > 0 ? (
                <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
                  <table className="w-full text-left text-xs divide-y divide-gray-200">
                    <thead className="bg-gray-100 text-gray-700 uppercase font-bold text-[10px] tracking-wider">
                      <tr>
                        <th className="p-3">ID Échéance</th>
                        <th className="p-3">Date & Heure</th>
                        <th className="p-3">Libellé / Étape</th>
                        <th className="p-3">Mode de paiement</th>
                        <th className="p-3 text-right">Montant Versé</th>
                        <th className="p-3 text-right">Reste Dû Restant</th>
                        <th className="p-3">Enregistré par</th>
                        <th className="p-3 text-center">Action / Reçu</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {invoiceInstallments.map((inst, index) => (
                        <tr key={inst.id || index} className="hover:bg-gray-50/80 transition-colors">
                          <td className="p-3 font-mono font-bold text-blue-700">
                            {inst.id}
                          </td>
                          <td className="p-3 font-mono text-gray-600 whitespace-nowrap">
                            {inst.date} {inst.time ? `à ${inst.time}` : ''}
                          </td>
                          <td className="p-3 font-semibold text-gray-900">
                            {inst.label}
                            {inst.reference && (
                              <span className="block text-[10px] text-gray-400 font-mono">
                                Réf: {inst.reference}
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-800 border border-gray-200">
                              {inst.paymentMode === 'MOBILE_MONEY'
                                ? `Mobile Money (${inst.mobileOperator || 'CELTIIS'})`
                                : inst.paymentMode === 'ESPECES'
                                ? 'Espèces'
                                : inst.paymentMode === 'VIREMENT'
                                ? 'Virement bancaire'
                                : inst.paymentMode === 'CHEQUE'
                                ? 'Chèque'
                                : inst.paymentMode}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-700 text-sm">
                            +{formatFcfa(inst.amount)}
                          </td>
                          <td className={`p-3 text-right font-mono font-bold text-sm ${
                            inst.remainingAfter > 0 ? 'text-red-600' : 'text-emerald-700'
                          }`}>
                            {formatFcfa(inst.remainingAfter)}
                          </td>
                          <td className="p-3 text-gray-600 font-medium">
                            {inst.recordedBy || 'SSEBIO'}
                          </td>
                          <td className="p-3 text-center">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setViewingReceiptInstallment({
                                  installment: inst,
                                  invoice: selectedInvoice,
                                });
                              }}
                              className="h-7 px-2.5 text-xs text-blue-700 border-blue-200 hover:bg-blue-50 font-semibold flex items-center gap-1 mx-auto"
                              title="Imprimer le reçu de cette échéance (Format ticket 80mm)"
                            >
                              <Printer className="w-3 h-3 text-blue-600" />
                              <span>Reçu</span>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 bg-gray-50 border border-gray-200 rounded-xl text-center text-xs text-gray-500">
                  Aucun versement n'a encore été enregistré pour cette facture à crédit.
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="p-8 text-center text-gray-500 text-sm">
            Aucune facture sélectionnée.
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1 : CONFIRMATION DU PAIEMENT / RÈGLEMENT */}
      {/* ========================================================================= */}
      {showConfirmModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-gray-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-gray-900">
                  Confirmation du versement
                </h3>
                <p className="text-xs text-gray-500">
                  Facture N° {selectedInvoice.documentNumber}
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl space-y-2 text-xs border border-gray-200">
              <div className="flex justify-between items-start gap-2">
                <span className="text-gray-500 shrink-0">Client :</span>
                <strong className="text-gray-900 break-words text-right max-w-[70%]">{selectedInvoice.customerName}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Montant du versement :</span>
                <strong className="text-emerald-700 font-mono text-sm font-bold">
                  +{formatFcfa(numericPaymentAmount)}
                </strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Mode de règlement :</span>
                <strong className="text-gray-900 font-semibold">
                  {paymentMode === 'MOBILE_MONEY'
                    ? `Mobile Money (${mobileOperator})`
                    : paymentMode === 'ESPECES'
                    ? 'Espèces'
                    : paymentMode === 'VIREMENT'
                    ? 'Virement bancaire'
                    : paymentMode === 'CHEQUE'
                    ? 'Chèque bancaire'
                    : paymentMode}
                </strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Référence d'encaissement :</span>
                <span className="text-blue-700 font-mono text-[11px] font-bold">
                  Attribuée automatiquement
                </span>
              </div>
              <div className="flex justify-between items-center border-t pt-2 mt-2">
                <span className="text-gray-700 font-bold">Reste à payer final :</span>
                <strong className={`font-mono text-sm font-black ${
                  projectedRemaining > 0 ? 'text-red-600' : 'text-emerald-700'
                }`}>
                  {projectedRemaining === 0 ? '0 FCFA (Facture entièrement soldée)' : formatFcfa(projectedRemaining)}
                </strong>
              </div>
            </div>

            <p className="text-xs text-gray-600">
              Êtes-vous certain de vouloir valider cet encaissement ? La facture et la caisse seront actualisées en direct.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowConfirmModal(false)}
                className="h-10 text-xs font-semibold"
              >
                Annuler
              </Button>
              <Button
                type="button"
                onClick={handleExecutePayment}
                className="h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
              >
                <Check className="w-4 h-4" />
                <span>Confirmer le règlement</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2 : APERÇU DE LA FACTURE COMPLÈTE (A4, TICKET 80MM, BORDEREAU) */}
      {/* ========================================================================= */}
      {viewingInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto print:block">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-4 my-auto border border-gray-200 max-h-[95vh] flex flex-col print:max-h-none print:h-auto print:shadow-none print:border-none print:p-0 print:w-full print:max-w-none print:block">
            
            {/* Barre de navigation des formats d'impression */}
            <div className="flex flex-col sm:flex-row items-center justify-between pb-3 border-b gap-3 shrink-0 print:hidden">
              <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPreviewTab('INVOICE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                    previewTab === 'INVOICE'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Facture Officielle A4
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewTab('RECEIPT')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                    previewTab === 'RECEIPT'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  Ticket de caisse (80mm)
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewTab('DELIVERY')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                    previewTab === 'DELIVERY'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  Bordereau de livraison
                </button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => window.print()}
                  className="h-10 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 font-bold text-xs sm:text-sm rounded-xl shadow-sm hover:shadow transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimer directement</span>
                </Button>
                <button
                  type="button"
                  onClick={() => setViewingInvoice(null)}
                  className="h-10 w-10 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors"
                  title="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Conteneur imprimable */}
            <div className="overflow-y-auto flex-1 p-4 sm:p-6 bg-gray-100 rounded-xl flex justify-center items-start print:p-0 print:bg-transparent print:overflow-visible print:block">
              
              {/* VUE 1 : FACTURE OFFICIELLE FORMAT A4 */}
              {previewTab === 'INVOICE' && (
                <div className="bg-white p-8 max-w-2xl w-full rounded-lg shadow-sm text-gray-800 space-y-6 text-xs border border-gray-200 h-auto self-start mb-6 print:border-none print:shadow-none print:m-0 print:p-0">
                  {/* Entête société */}
                  <div className="flex items-start justify-between border-b-2 border-blue-600 pb-4">
                    <div>
                      <span className="text-xl font-black text-blue-700 tracking-tight block">
                        {companyDisplayName}
                      </span>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Commerce Général, Prestations & Fournitures de Bureau
                      </p>
                      <p className="text-[11px] text-gray-500">
                        IFU : 0202612345678 • RCCM : RB/COT/2026/B/1234
                      </p>
                      <p className="text-[11px] text-gray-500">
                        Cotonou, République du Bénin • Tél : +229 97 00 00 00
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-black text-gray-900 block tracking-wide">
                        {viewingInvoice.status === 'FISCALIZED'
                          ? viewingInvoice.type === 'EXPORT'
                            ? "FACTURE D'EXPORTATION"
                            : 'FACTURE DE VENTE'
                          : viewingInvoice.status === 'VALIDATED'
                          ? viewingInvoice.type === 'EXPORT'
                            ? "FACTURE D'EXPORTATION"
                            : 'FACTURE DE VENTE'
                          : 'FACTURE PROFORMA'}
                      </span>
                      <span className="font-mono font-bold text-sm text-blue-700 block">
                        N° {viewingInvoice.documentNumber}
                      </span>
                      <span className="text-gray-500 text-[11px]">
                        Date : {viewingInvoice.date} {viewingInvoice.time ? `à ${viewingInvoice.time}` : ''}
                      </span>
                      {viewingInvoice.status === 'FISCALIZED' && (
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            ORIGINALE NORMALISÉE e-MECeF
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Coordonnées Client & Facturation */}
                  <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg border">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                        Facturé à (Client)
                      </span>
                      <span className="font-bold text-sm text-gray-900 block">{viewingInvoice.customerName}</span>
                      <p className="text-gray-600">IFU : {viewingInvoice.customerIfu || 'Non renseigné'}</p>
                      <p className="text-gray-600">Tél : {viewingInvoice.customerPhone || 'N/A'}</p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                        Règlement & Référence
                      </span>
                      <p className="text-gray-700">
                        Mode : <strong>
                          {viewingInvoice.paymentMode === 'MOBILE_MONEY'
                            ? 'Mobile Money (MTN / Moov / Celtiis)'
                            : viewingInvoice.paymentMode === 'ESPECES'
                            ? 'Espèces (Guichet)'
                            : viewingInvoice.paymentMode === 'A_TERME'
                            ? 'À terme'
                            : viewingInvoice.paymentMode}
                        </strong>
                      </p>
                      {viewingInvoice.orderReference && (
                        <p className="text-gray-700">Bon de commande : <strong>{viewingInvoice.orderReference}</strong></p>
                      )}
                      <p className="text-gray-700">Caissier : <strong>{viewingInvoice.cashierName || 'SSEBIO'}</strong></p>
                    </div>
                  </div>

                  {/* Tableau des articles */}
                  <table className="w-full text-left text-xs border">
                    <thead className="bg-gray-100 text-gray-700 uppercase text-[10px] font-bold">
                      <tr className="border-b">
                        <th className="p-2">Désignation</th>
                        <th className="p-2 text-center">Qté</th>
                        <th className="p-2 text-right">PU HT</th>
                        <th className="p-2 text-right">TVA</th>
                        <th className="p-2 text-right">Total HT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {viewingInvoice.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-2 font-medium">
                            {item.name} <span className="font-bold text-blue-700">[{item.taxGroup}]</span>
                          </td>
                          <td className="p-2 text-center font-mono">{item.quantity}</td>
                          <td className="p-2 text-right font-mono">{formatFcfa(item.unitPriceHt)}</td>
                          <td className="p-2 text-right font-mono">{item.taxGroup === 'B' ? '18%' : '0%'}</td>
                          <td className="p-2 text-right font-mono font-bold">{formatFcfa(item.totalLineHt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Totaux financiers & récapitulation e-MECeF & Gestion du paiement */}
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-2">
                    <div className="flex-1 space-y-3 w-full">
                      {/* Bloc e-MECeF si fiscalisée */}
                      {viewingInvoice.status === 'FISCALIZED' && (
                        <div className="space-y-1 p-3 bg-emerald-50/50 rounded-lg border border-emerald-200">
                          <span className="text-[10px] font-bold text-emerald-900 uppercase block">
                            Conformité Fiscale DGI Bénin (e-MECeF)
                          </span>
                          <div className="text-[11px] text-gray-700 space-y-0.5">
                            <p>NIM : <strong className="font-mono">{viewingInvoice.emecefNim}</strong></p>
                            <p>Compteurs : <strong className="font-mono">{viewingInvoice.emecefCounters}</strong></p>
                            <p>Code e-MECeF : <strong className="font-mono text-emerald-800 font-bold">{viewingInvoice.emecefCode}</strong></p>
                            <p className="text-[10px] text-emerald-700 font-semibold pt-1 flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              ✓ Facture originale normalisée et certifiée par la DGI Bénin
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Bloc Situation du Paiement & Reste à Payer (Côté gauche) */}
                      <div className={`p-3 rounded-lg border text-[11px] space-y-1.5 ${
                        viewingInvoice.remainingAmount > 0
                          ? 'bg-amber-50/70 border-amber-300'
                          : 'bg-emerald-50/40 border-emerald-200'
                      }`}>
                        <div className="flex items-center justify-between border-b pb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-700">
                            Situation du Règlement
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            viewingInvoice.remainingAmount > 0
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                            {viewingInvoice.remainingAmount > 0 ? 'Facture non soldée' : 'Facture soldée'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-0.5 text-gray-700">
                          <div>
                            <span className="text-gray-500 block text-[10px]">Montant déjà payé :</span>
                            <strong className="text-emerald-700 font-mono text-xs font-bold block mt-0.5">
                              {formatFcfa(viewingInvoice.paidAmount)}
                            </strong>
                          </div>
                          <div>
                            <span className="text-gray-500 block text-[10px]">Reste à payer :</span>
                            <strong className={`font-mono text-xs font-black block mt-0.5 ${
                              viewingInvoice.remainingAmount > 0 ? 'text-red-600' : 'text-emerald-700'
                            }`}>
                              {formatFcfa(viewingInvoice.remainingAmount)}
                            </strong>
                          </div>
                        </div>
                        {viewingInvoice.remainingAmount > 0 && viewingInvoice.dueDate && (
                          <div className="text-[10px] text-gray-600 border-t pt-1 flex justify-between">
                            <span>Date limite d'échéance :</span>
                            <strong className="text-gray-900">{viewingInvoice.dueDate}</strong>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Encadré des montants (s'arrête au Net à Payer sans répétition) */}
                    <div className="w-64 space-y-1.5 text-right font-mono shrink-0">
                      <div className="flex justify-between text-gray-600">
                        <span>Total Net HT :</span>
                        <span>{formatFcfa(viewingInvoice.totalNetHt)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>TVA (18%) :</span>
                        <span>{formatFcfa(viewingInvoice.totalVat)}</span>
                      </div>
                      {viewingInvoice.aibAmount > 0 && (
                        <div className="flex justify-between text-gray-600">
                          <span>AIB ({viewingInvoice.aibRate}%) :</span>
                          <span>{formatFcfa(viewingInvoice.aibAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-base font-black text-blue-700 border-t pt-1">
                        <span>Net à Payer :</span>
                        <span>{formatFcfa(viewingInvoice.netToPay)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* VUE 2 : TICKET DE CAISSE THERMIQUE (80MM) */}
              {previewTab === 'RECEIPT' && (
                <div className="bg-white p-5 w-full max-w-[340px] rounded-lg shadow-md text-gray-900 space-y-3 font-mono text-[11px] border border-gray-300 h-auto min-h-fit self-start mb-6 print:border-none print:shadow-none print:m-0 print:p-0">
                  <div className="text-center space-y-0.5 border-b pb-2">
                    <span className="font-black text-sm block tracking-wide">{companyDisplayName}</span>
                    <p className="text-[10px] text-gray-600">BOUTIQUE CENTRALE - COTONOU</p>
                    <p className="text-[10px] text-gray-600">IFU : 0202612345678</p>
                    <p className="text-[10px] text-gray-600">TEL : +229 97 00 00 00</p>
                    <span className="inline-block mt-1 font-bold text-[10px] px-2 py-0.5 bg-gray-100 rounded">
                      {viewingInvoice.status === 'FISCALIZED'
                        ? 'TICKET DE VENTE NORMALISÉ'
                        : viewingInvoice.status === 'VALIDATED'
                        ? 'TICKET DE VENTE'
                        : 'TICKET PROFORMA'}
                    </span>
                  </div>

                  <div className="text-[10px] space-y-0.5 border-b pb-2">
                    <p>Ticket N° : <strong>{viewingInvoice.documentNumber}</strong></p>
                    <p>Date : {viewingInvoice.date} {viewingInvoice.time || ''}</p>
                    <p>Client : {viewingInvoice.customerName}</p>
                    <p>Caissier : {viewingInvoice.cashierName || 'SSEBIO'}</p>
                  </div>

                  {/* Lignes d'articles ticket */}
                  <div className="space-y-1.5 border-b pb-2">
                    {viewingInvoice.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="block font-bold break-words">{item.name}</span>
                          <span className="text-[10px] text-gray-500">
                            {item.quantity} x {formatFcfa(item.unitPriceTtc)} [{item.taxGroup}]
                          </span>
                        </div>
                        <span className="font-bold shrink-0">{formatFcfa(item.totalLineTtc)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Totaux ticket */}
                  <div className="space-y-1 border-b pb-2 text-right">
                    <div className="flex justify-between">
                      <span>TOTAL NET HT:</span>
                      <span>{formatFcfa(viewingInvoice.totalNetHt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>TOTAL TVA:</span>
                      <span>{formatFcfa(viewingInvoice.totalVat)}</span>
                    </div>
                    <div className="flex justify-between font-black text-sm border-t pt-1">
                      <span>TOTAL TTC:</span>
                      <span>{formatFcfa(viewingInvoice.netToPay)}</span>
                    </div>

                    {/* Gestion du paiement sur ticket */}
                    <div className="border-t border-dashed border-gray-300 pt-1 space-y-0.5">
                      <div className="flex justify-between text-emerald-800 font-bold">
                        <span>MONTANT PAYÉ:</span>
                        <span>{formatFcfa(viewingInvoice.paidAmount)}</span>
                      </div>
                      <div className={`flex justify-between font-bold ${
                        viewingInvoice.remainingAmount > 0 ? 'text-red-600 font-black' : 'text-emerald-800'
                      }`}>
                        <span>RESTE À PAYER:</span>
                        <span>{formatFcfa(viewingInvoice.remainingAmount)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Règlement ticket */}
                  <div className="space-y-1 text-[10px] border-b pb-2">
                    <p>
                      Mode : <strong>{viewingInvoice.paymentMode === 'MOBILE_MONEY'
                        ? 'Mobile Money (MTN/Moov/Celtiis)'
                        : viewingInvoice.paymentMode === 'A_TERME'
                        ? 'À terme'
                        : viewingInvoice.paymentMode === 'ESPECES'
                        ? 'Espèces'
                        : viewingInvoice.paymentMode}</strong>
                    </p>
                    {viewingInvoice.remainingAmount > 0 ? (
                      <div className="text-red-600 font-bold pt-1 border-t border-dotted">
                        <span>⚠️ STATUT : FACTURE NON SOLDÉE</span>
                        {viewingInvoice.dueDate && (
                          <p className="text-gray-700 font-normal">Échéance : <strong>{viewingInvoice.dueDate}</strong></p>
                        )}
                      </div>
                    ) : (
                      <p className="text-emerald-700 font-bold pt-0.5">
                        ✓ FACTURE ENTIÈREMENT SOLDÉE
                      </p>
                    )}
                  </div>

                  {/* Pied */}
                  <div className="text-center text-[9px] text-gray-500 pt-1 space-y-0.5 break-words">
                    {viewingInvoice.status === 'FISCALIZED' && (
                      <>
                        <p className="font-bold text-gray-800">e-MECeF / DGI BÉNIN</p>
                        <p className="font-mono font-bold text-emerald-800 break-all">{viewingInvoice.emecefCode}</p>
                      </>
                    )}
                    <p className="pt-1">MERCI DE VOTRE CONFIANCE !</p>
                  </div>
                </div>
              )}

              {/* VUE 3 : BORDEREAU DE LIVRAISON */}
              {previewTab === 'DELIVERY' && (
                <div className="bg-white p-8 max-w-2xl w-full rounded-lg shadow-sm text-gray-800 space-y-6 text-xs border border-gray-200 h-auto self-start mb-6 print:border-none print:shadow-none print:m-0 print:p-0">
                  <div className="flex justify-between border-b pb-3">
                    <div>
                      <span className="text-lg font-black text-gray-900 block">{companyDisplayName}</span>
                      <p className="text-gray-500 text-[11px]">Service Expéditions & Logistique</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-blue-700 block">BORDEREAU DE LIVRAISON</span>
                      <span className="font-mono font-bold text-xs">BL-{viewingInvoice.documentNumber}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 rounded border">
                    <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Destinataire</span>
                    <span className="font-bold text-gray-900 block text-sm">{viewingInvoice.customerName}</span>
                    <p className="text-gray-600">Contact : {viewingInvoice.customerPhone || 'N/A'}</p>
                  </div>

                  <table className="w-full text-left text-xs border">
                    <thead className="bg-gray-100 text-gray-700 uppercase text-[10px] font-bold">
                      <tr className="border-b">
                        <th className="p-2">Réf. SKU</th>
                        <th className="p-2">Désignation</th>
                        <th className="p-2 text-center">Quantité</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {viewingInvoice.items.map((it, idx) => (
                        <tr key={idx}>
                          <td className="p-2 font-mono font-bold">{it.sku}</td>
                          <td className="p-2 font-medium">{it.name}</td>
                          <td className="p-2 text-center font-bold text-sm">{it.quantity} unités</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3 : REÇU DE VERSEMENT D'ÉCHÉANCE (TICKET THERMIQUE 80MM) */}
      {/* ========================================================================= */}
      {viewingReceiptInstallment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto print:block">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 my-auto border border-gray-200 print:shadow-none print:border-none print:p-0 print:w-full print:block">
            
            <div className="flex items-center justify-between pb-2 border-b print:hidden">
              <span className="font-bold text-xs text-gray-700">Reçu de versement thermique</span>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  onClick={() => window.print()}
                  className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimer</span>
                </Button>
                <button
                  type="button"
                  onClick={() => setViewingReceiptInstallment(null)}
                  className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Corps du reçu 80mm */}
            <div className="bg-white p-4 w-full rounded shadow-sm text-gray-900 space-y-3 font-mono text-[11px] border border-gray-200 print:border-none print:p-0">
              <div className="text-center space-y-0.5 border-b pb-2">
                <span className="font-black text-sm block tracking-wide">{companyDisplayName}</span>
                <p className="text-[10px] text-gray-600">CAISSE CENTRALE • COTONOU</p>
                <p className="text-[10px] text-gray-600">IFU : 0202612345678</p>
                <span className="inline-block mt-1 font-bold text-[10px] px-2 py-0.5 bg-blue-50 text-blue-800 rounded border border-blue-200">
                  REÇU D'ÉCHÉANCE & ENCAISSEMENT
                </span>
              </div>

              <div className="text-[10px] space-y-0.5 border-b pb-2">
                <p>N° Quittance : <strong>{viewingReceiptInstallment.installment.id}</strong></p>
                <p>Facture liée : <strong>{viewingReceiptInstallment.invoice.documentNumber}</strong></p>
                <p>Date : {viewingReceiptInstallment.installment.date} {viewingReceiptInstallment.installment.time || ''}</p>
                <p>Client : {viewingReceiptInstallment.invoice.customerName}</p>
                <p>Caissier : {viewingReceiptInstallment.installment.recordedBy || 'SSEBIO'}</p>
              </div>

              <div className="p-2.5 bg-gray-50 rounded border space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Motif :</span>
                  <strong className="text-gray-900">{viewingReceiptInstallment.installment.label}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Mode :</span>
                  <strong>
                    {viewingReceiptInstallment.installment.paymentMode === 'MOBILE_MONEY'
                      ? `Mobile Money (${viewingReceiptInstallment.installment.mobileOperator || 'CELTIIS'})`
                      : viewingReceiptInstallment.installment.paymentMode === 'ESPECES'
                      ? 'Espèces'
                      : viewingReceiptInstallment.installment.paymentMode}
                  </strong>
                </div>
                {viewingReceiptInstallment.installment.reference && (
                  <div className="flex justify-between text-[10px] text-gray-500">
                    <span>Réf :</span>
                    <span>{viewingReceiptInstallment.installment.reference}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-emerald-700 border-t pt-1 mt-1">
                  <span>MONTANT PAYÉ :</span>
                  <span>{formatFcfa(viewingReceiptInstallment.installment.amount)}</span>
                </div>
              </div>

              <div className="space-y-0.5 text-[10px] border-b pb-2">
                <div className="flex justify-between text-gray-600">
                  <span>Net Facture TTC :</span>
                  <span>{formatFcfa(viewingReceiptInstallment.invoice.netToPay)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Reste dû après ce reçu :</span>
                  <span className={viewingReceiptInstallment.installment.remainingAfter > 0 ? 'text-red-600' : 'text-emerald-700'}>
                    {formatFcfa(viewingReceiptInstallment.installment.remainingAfter)}
                  </span>
                </div>
              </div>

              <div className="text-center text-[9px] text-gray-500 pt-1 space-y-0.5">
                <p className="font-bold">LGV SAAS • REÇU OFFICIEL DE RÈGLEMENT</p>
                <p>MERCI DE VOTRE CONFIANCE !</p>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
