'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Calendar,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  TrendingUp,
  Wallet,
  Percent,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  User,
  ShoppingBag,
  ShieldCheck,
  X,
  ArrowUpRight,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatFcfa } from '@/server/domain/money';
import { loadSalesDocuments, SalesRow, InvoiceLineItem } from '@/lib/sales-store';
import { loadArticles, ArticleItem } from '@/lib/articles-store';

type PeriodMode = 'MONTH' | 'QUARTER' | 'YEAR' | 'CUSTOM';

// Helper pour parser une date "DD/MM/YYYY" ou "YYYY-MM-DD"
function parseDocumentDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
        return new Date(y, m, d);
      }
    }
  }
  if (trimmed.includes('-')) {
    const parts = trimmed.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
        return new Date(y, m, d);
      }
    }
  }
  const timestamp = Date.parse(trimmed);
  return isNaN(timestamp) ? null : new Date(timestamp);
}

// Formatage date pour les inputs HTML "YYYY-MM-DD"
function toInputDateFormat(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Formatage d'une date en "DD/MM/YYYY"
function formatDateFr(date: Date): string {
  return date.toLocaleDateString('fr-BJ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function StatisticsPage({ params }: { params: { slug: string } }) {
  const companySlug = params.slug;
  const companyDisplayName = companySlug.replace(/-/g, ' ').toUpperCase();

  // Documents de vente & Articles
  const [documents, setDocuments] = React.useState<SalesRow[]>([]);
  const [articles, setArticles] = React.useState<ArticleItem[]>([]);

  // Modale d'export PDF / Impression officielle
  const [showPdfModal, setShowPdfModal] = React.useState(false);

  // État de la période
  const [periodMode, setPeriodMode] = React.useState<PeriodMode>('YEAR');
  const [startDateStr, setStartDateStr] = React.useState<string>('2026-01-01');
  const [endDateStr, setEndDateStr] = React.useState<string>('2026-12-31');

  // Chargement des données et synchronisation
  const refreshData = React.useCallback(() => {
    const docs = loadSalesDocuments(companySlug);
    const arts = loadArticles(companySlug);
    setDocuments(docs);
    setArticles(arts);
  }, [companySlug]);

  React.useEffect(() => {
    refreshData();
    const handleSalesSync = () => refreshData();
    const handleArticlesSync = () => refreshData();

    window.addEventListener('lgv_sales_changed', handleSalesSync);
    window.addEventListener('lgv_articles_changed', handleArticlesSync);
    return () => {
      window.removeEventListener('lgv_sales_changed', handleSalesSync);
      window.removeEventListener('lgv_articles_changed', handleArticlesSync);
    };
  }, [refreshData]);

  // Gestion des périodes prédéfinies
  const selectPredefinedPeriod = (mode: 'MONTH' | 'QUARTER' | 'YEAR') => {
    setPeriodMode(mode);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    if (mode === 'MONTH') {
      // Mois en cours : du 1er au dernier jour du mois courant (ex: 1er nov au 30 nov)
      const start = new Date(currentYear, currentMonth, 1);
      const end = new Date(currentYear, currentMonth + 1, 0);
      setStartDateStr(toInputDateFormat(start));
      setEndDateStr(toInputDateFormat(end));
    } else if (mode === 'QUARTER') {
      // Trimestre en cours (ex: T4 = 1er oct au 31 déc)
      const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
      const start = new Date(currentYear, quarterStartMonth, 1);
      const end = new Date(currentYear, quarterStartMonth + 3, 0);
      setStartDateStr(toInputDateFormat(start));
      setEndDateStr(toInputDateFormat(end));
    } else if (mode === 'YEAR') {
      // Année en cours (ex: 1er janv au 31 déc)
      const start = new Date(currentYear, 0, 1);
      const end = new Date(currentYear, 11, 31);
      setStartDateStr(toInputDateFormat(start));
      setEndDateStr(toInputDateFormat(end));
    }
  };

  // Dates effectives pour le filtrage
  const filterStartDate = React.useMemo(() => {
    if (!startDateStr) return new Date(2000, 0, 1, 0, 0, 0);
    const [y, m, d] = startDateStr.split('-').map(Number);
    return new Date(y, m - 1, d, 0, 0, 0);
  }, [startDateStr]);

  const filterEndDate = React.useMemo(() => {
    if (!endDateStr) return new Date(2099, 11, 31, 23, 59, 59);
    const [y, m, d] = endDateStr.split('-').map(Number);
    return new Date(y, m - 1, d, 23, 59, 59);
  }, [endDateStr]);

  // Factures filtrées sur la période choisie
  const filteredInvoices = React.useMemo(() => {
    return documents.filter((doc) => {
      // On inclut les factures de vente et d'exportation
      if (doc.type !== 'INVOICE' && doc.type !== 'EXPORT') return false;

      const docDate = parseDocumentDate(doc.date);
      if (!docDate) return true; // Conserver si date inconnue
      return docDate >= filterStartDate && docDate <= filterEndDate;
    });
  }, [documents, filterStartDate, filterEndDate]);

  // Map des coûts d'articles pour calcul de la marge
  const articlesCostMap = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const art of articles) {
      if (art.costPrice && art.costPrice > 0) {
        map.set(art.id, art.costPrice);
        map.set(art.sku, art.costPrice);
      }
    }
    return map;
  }, [articles]);

  // =========================================================================
  // CALCULS STATISTIQUES & INDICATEURS FINANCIERS
  // =========================================================================
  const stats = React.useMemo(() => {
    let totalSalesTtc = 0;
    let totalSalesHt = 0;
    let totalVat = 0;
    let totalAib = 0;
    let totalPaid = 0;
    let totalRemaining = 0;
    let totalMargin = 0;

    // Produits vendus
    const productStatsMap = new Map<
      string,
      {
        sku: string;
        name: string;
        quantity: number;
        totalHt: number;
        totalTtc: number;
        margin: number;
      }
    >();

    // Clients
    const customerStatsMap = new Map<
      string,
      {
        name: string;
        ifu?: string;
        phone?: string;
        invoicesCount: number;
        totalTtc: number;
        totalPaid: number;
        totalRemaining: number;
      }
    >();

    // Modes de paiement
    const paymentModeBreakdown: Record<string, number> = {
      ESPECES: 0,
      MOBILE_MONEY: 0,
      VIREMENT: 0,
      CHEQUE: 0,
      A_TERME: 0,
    };

    for (const inv of filteredInvoices) {
      totalSalesTtc += inv.netToPay;
      totalSalesHt += inv.totalNetHt;
      totalVat += inv.totalVat;
      totalAib += inv.aibAmount;
      totalPaid += inv.paidAmount;
      totalRemaining += inv.remainingAmount;

      // Ventilation modes
      const modeKey = inv.paymentMode || 'ESPECES';
      paymentModeBreakdown[modeKey] = (paymentModeBreakdown[modeKey] || 0) + inv.netToPay;

      // Agrégation par produit
      for (const line of inv.items || []) {
        const costPrice =
          articlesCostMap.get(line.articleId) ||
          articlesCostMap.get(line.sku) ||
          Math.round(line.unitPriceHt * 0.7); // 30% de marge par défaut si non renseigné
        const lineMargin = line.quantity * (line.unitPriceHt - costPrice);
        totalMargin += lineMargin;

        const prodKey = line.sku || line.name;
        const currentProd = productStatsMap.get(prodKey) || {
          sku: line.sku,
          name: line.name,
          quantity: 0,
          totalHt: 0,
          totalTtc: 0,
          margin: 0,
        };

        currentProd.quantity += line.quantity;
        currentProd.totalHt += line.totalLineHt;
        currentProd.totalTtc += line.totalLineTtc;
        currentProd.margin += lineMargin;
        productStatsMap.set(prodKey, currentProd);
      }

      // Agrégation par client
      const custKey = inv.customerId || inv.customerName;
      const currentCust = customerStatsMap.get(custKey) || {
        name: inv.customerName,
        ifu: inv.customerIfu,
        phone: inv.customerPhone,
        invoicesCount: 0,
        totalTtc: 0,
        totalPaid: 0,
        totalRemaining: 0,
      };

      currentCust.invoicesCount += 1;
      currentCust.totalTtc += inv.netToPay;
      currentCust.totalPaid += inv.paidAmount;
      currentCust.totalRemaining += inv.remainingAmount;
      customerStatsMap.set(custKey, currentCust);
    }

    const marginRate = totalSalesHt > 0 ? (totalMargin / totalSalesHt) * 100 : 0;
    const averageBasket = filteredInvoices.length > 0 ? Math.round(totalSalesTtc / filteredInvoices.length) : 0;

    // Classement produits triés par quantité vendue puis par CA
    const topProducts = Array.from(productStatsMap.values()).sort((a, b) => b.quantity - a.quantity || b.totalTtc - a.totalTtc);

    // Classement clients triés par total achats TTC
    const topCustomers = Array.from(customerStatsMap.values()).sort((a, b) => b.totalTtc - a.totalTtc);

    return {
      totalSalesTtc,
      totalSalesHt,
      totalVat,
      totalAib,
      totalPaid,
      totalRemaining,
      totalMargin,
      marginRate,
      averageBasket,
      invoicesCount: filteredInvoices.length,
      topProducts,
      topCustomers,
      paymentModeBreakdown,
    };
  }, [filteredInvoices, articlesCostMap]);

  // =========================================================================
  // EXPORTATION EXCEL / CSV CERTIFIÉE AVEC EN-TÊTE OFFICIEL
  // =========================================================================
  const handleExportExcel = () => {
    const lines: string[] = [];

    // En-tête certifié de la société
    lines.push(`"${companyDisplayName} SARL" - IFU: 0202612345678 - RCCM: RB/COT/2026/B/1234`);
    lines.push(`"Commerce Général, Prestations & Fournitures de Bureau" - Cotonou, République du Bénin - Tél: +229 97 00 00 00`);
    lines.push(`"RAPPORT OFFICIEL : STATISTIQUES ET BILAN D'ACTIVITÉ COMMERCIAL"`);
    lines.push(`"Période analysée : Du ${formatDateFr(filterStartDate)} au ${formatDateFr(filterEndDate)}"`);
    lines.push(`"Exporté le : ${new Date().toLocaleDateString('fr-BJ')} à ${new Date().toLocaleTimeString('fr-BJ', { hour: '2-digit', minute: '2-digit' })} par la Direction Commerciale"`);
    lines.push(''); // Ligne vide

    // 1. Synthèse des indicateurs financiers
    lines.push(`"SYNTHÈSE FINANCIÈRE DE LA PÉRIODE";""`);
    lines.push(`"Indicateur";"Montant (FCFA)"`);
    lines.push(`"Chiffre d'affaires Total TTC";"${stats.totalSalesTtc}"`);
    lines.push(`"Chiffre d'affaires Net HT (Base imposable)";"${stats.totalSalesHt}"`);
    lines.push(`"TVA Collectée (18%)";"${stats.totalVat}"`);
    lines.push(`"AIB Retenu";"${stats.totalAib}"`);
    lines.push(`"Marge brute commerciale";"${stats.totalMargin}"`);
    lines.push(`"Taux de marge brute";"${stats.marginRate.toFixed(1)} %"`);
    lines.push(`"Total Encaissé";"${stats.totalPaid}"`);
    lines.push(`"Créances restant à recouvrer";"${stats.totalRemaining}"`);
    lines.push(`"Nombre de factures émises";"${stats.invoicesCount}"`);
    lines.push(`"Panier moyen par facture";"${stats.averageBasket}"`);
    lines.push('');

    // 2. Classement des meilleurs produits
    lines.push(`"CLASSEMENT DES MEILLEURS PRODUITS VENDUS";"";"";"";""`);
    lines.push(`"Réf. SKU";"Désignation Produit";"Quantité vendue";"Total HT (FCFA)";"Total TTC (FCFA)"`);
    for (const prod of stats.topProducts) {
      lines.push(
        `"${prod.sku}";"${prod.name.replace(/"/g, '""')}";"${prod.quantity}";"${prod.totalHt}";"${prod.totalTtc}"`
      );
    }
    lines.push('');

    // 3. Classement des meilleurs clients
    lines.push(`"CLASSEMENT DES MEILLEURS CLIENTS";"";"";"";""`);
    lines.push(`"Nom du Client";"N° IFU";"Nombre de factures";"Total Achats TTC (FCFA)";"Reste Dû (FCFA)"`);
    for (const cust of stats.topCustomers) {
      lines.push(
        `"${cust.name.replace(/"/g, '""')}";"${cust.ifu || 'Non renseigné'}";"${cust.invoicesCount}";"${cust.totalTtc}";"${cust.totalRemaining}"`
      );
    }
    lines.push('');

    // 4. Journal détaillé des factures de la période
    lines.push(`"JOURNAL DÉTAILLÉ DES FACTURES DE LA PÉRIODE";"";"";"";"";"";"";"";"";""`);
    lines.push(`"N° Facture";"Date";"Client";"Mode Règlement";"Total HT";"TVA 18%";"AIB";"Total TTC";"Payé";"Reste Dû";"Statut e-MECeF"`);
    for (const inv of filteredInvoices) {
      lines.push(
        `"${inv.documentNumber}";"${inv.date}";"${inv.customerName.replace(/"/g, '""')}";"${inv.paymentMode}";"${inv.totalNetHt}";"${inv.totalVat}";"${inv.aibAmount}";"${inv.netToPay}";"${inv.paidAmount}";"${inv.remainingAmount}";"${inv.status}"`
      );
    }

    // Création du blob avec BOM UTF-8 pour ouverture parfaite dans Microsoft Excel
    const csvContent = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanStart = startDateStr || 'debut';
    const cleanEnd = endDateStr || 'fin';
    link.download = `Bilan_Activite_${companyDisplayName.replace(/\s+/g, '_')}_${cleanStart}_au_${cleanEnd}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // =========================================================================
  // EXPORTATION PDF (OUVERTURE DE LA MODALE D'APERÇU IMPRIMABLE CERTIFIÉE)
  // =========================================================================
  const handleExportPdf = () => {
    setShowPdfModal(true);
  };

  return (
    <div className="space-y-8">
      {/* ========================================================================= */}
      {/* EN-TÊTE DE LA PAGE */}
      {/* ========================================================================= */}
      <div className="border-b border-gray-200 pb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Statistiques & Bilan d'Activité
            </h1>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Analyse périodique des ventes, marges bénéficiaires brutes, créances et ventilation fiscale (TVA / AIB) pour {companyDisplayName}.
          </p>
        </div>

        {/* Boutons d'exportation certifiés */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="h-10 px-4 border-emerald-600 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all"
            title="Exporter l'ensemble du bilan au format Excel (.csv certifié)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Exporter Excel</span>
          </Button>

          <Button
            size="sm"
            onClick={handleExportPdf}
            className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all"
            title="Générer et imprimer le rapport PDF officiel certifié"
          >
            <Printer className="w-4 h-4 text-white shrink-0" />
            <span>Exporter PDF</span>
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SÉLECTEUR DE PÉRIODE & CHOIX D'UNE PLAGE DE DATES LIBRE */}
      {/* ========================================================================= */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Boutons de périodes prédéfinies */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1">
              Période :
            </span>
            <Button
              size="sm"
              variant={periodMode === 'MONTH' ? 'default' : 'outline'}
              className={`h-9 text-xs rounded-xl font-bold transition-all ${
                periodMode === 'MONTH'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
              }`}
              onClick={() => selectPredefinedPeriod('MONTH')}
            >
              Mois en cours
            </Button>

            <Button
              size="sm"
              variant={periodMode === 'QUARTER' ? 'default' : 'outline'}
              className={`h-9 text-xs rounded-xl font-bold transition-all ${
                periodMode === 'QUARTER'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
              }`}
              onClick={() => selectPredefinedPeriod('QUARTER')}
            >
              Trimestre
            </Button>

            <Button
              size="sm"
              variant={periodMode === 'YEAR' ? 'default' : 'outline'}
              className={`h-9 text-xs rounded-xl font-bold transition-all ${
                periodMode === 'YEAR'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
              }`}
              onClick={() => selectPredefinedPeriod('YEAR')}
            >
              Année 2026
            </Button>

            <Button
              size="sm"
              variant={periodMode === 'CUSTOM' ? 'default' : 'outline'}
              className={`h-9 text-xs rounded-xl font-bold transition-all ${
                periodMode === 'CUSTOM'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
              }`}
              onClick={() => setPeriodMode('CUSTOM')}
            >
              Période personnalisée
            </Button>
          </div>

          {/* Sélecteur de dates libres : Du ... Au ... */}
          <div className="flex items-center gap-2 bg-gray-50 px-3.5 py-2 rounded-xl border border-gray-300 shrink-0">
            <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-gray-600">Du :</span>
              <input
                type="date"
                value={startDateStr}
                onChange={(e) => {
                  setStartDateStr(e.target.value);
                  setPeriodMode('CUSTOM');
                }}
                className="h-8 px-2.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
              />
              <span className="font-semibold text-gray-600">Au :</span>
              <input
                type="date"
                value={endDateStr}
                onChange={(e) => {
                  setEndDateStr(e.target.value);
                  setPeriodMode('CUSTOM');
                }}
                className="h-8 px-2.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
              />
            </div>
          </div>
        </div>

        {/* Rappel de la période active & nombre de factures détectées */}
        <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Plage sélectionnée :</span>
            <span className="font-bold text-blue-700 font-mono">
              Du {formatDateFr(filterStartDate)} au {formatDateFr(filterEndDate)}
            </span>
          </div>
          <div>
            <Badge variant="outline" className="text-xs font-bold bg-blue-50 text-blue-800 border-blue-200">
              {stats.invoicesCount} facture{stats.invoicesCount > 1 ? 's' : ''} émise{stats.invoicesCount > 1 ? 's' : ''} analysée{stats.invoicesCount > 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4 GRANDES CARTES KPI BILAN FINANCIER */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Chiffre d'affaires Total TTC */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Chiffre d’affaires TTC
              </span>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-gray-900 mt-2 font-mono">
              {formatFcfa(stats.totalSalesTtc)}
            </div>
          </div>
          <div className="pt-2 mt-2 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-500">Encaissé :</span>
            <span className="font-bold text-emerald-700 font-mono">
              {formatFcfa(stats.totalPaid)}
            </span>
          </div>
        </div>

        {/* 2. Chiffre d'affaires Net HT */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Chiffre d’affaires Net HT
              </span>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-gray-900 mt-2 font-mono">
              {formatFcfa(stats.totalSalesHt)}
            </div>
          </div>
          <div className="pt-2 mt-2 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-500">Base imposable</span>
            <span className="font-semibold text-gray-700">
              Panier moyen : {formatFcfa(stats.averageBasket)}
            </span>
          </div>
        </div>

        {/* 3. Ventilation Fiscale (TVA 18% & AIB) */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                TVA Collectée (18%)
              </span>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <Percent className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-700 mt-2 font-mono">
              {formatFcfa(stats.totalVat)}
            </div>
          </div>
          <div className="pt-2 mt-2 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-500">AIB DGI déduit :</span>
            <span className="font-bold text-gray-800 font-mono">
              {formatFcfa(stats.totalAib)}
            </span>
          </div>
        </div>

        {/* 4. Marge brute commerciale / Bénéfice */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Marge Brute / Bénéfice
              </span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-blue-600 mt-2 font-mono">
              {formatFcfa(stats.totalMargin)}
            </div>
          </div>
          <div className="pt-2 mt-2 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-500">Taux de marge :</span>
            <span className="font-bold text-blue-700">
              {stats.marginRate.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SYNTHÈSE DES ENCAISSEMENTS & CRÉANCES */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Total Encaissé */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
              Total Règlements Encaissés (Liquidités)
            </span>
            <div className="text-2xl font-black text-emerald-700 font-mono">
              {formatFcfa(stats.totalPaid)}
            </div>
            <p className="text-xs text-gray-500">
              Fonds réellement recouvrés sur les ventes de cette période
            </p>
          </div>
          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Total Créances / Restes à payer */}
        <div className="bg-white p-5 rounded-2xl border border-red-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-red-800 uppercase tracking-wider block">
              Créances Clients / Reste à Recouvrer
            </span>
            <div className="text-2xl font-black text-red-600 font-mono">
              {formatFcfa(stats.totalRemaining)}
            </div>
            <p className="text-xs text-gray-500">
              Dettes restant dues par les clients sur cette période
            </p>
          </div>
          <div className="p-3 bg-red-100 text-red-700 rounded-2xl">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CLASSEMENTS : TOP PRODUITS & TOP CLIENTS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 1. Classement des Meilleurs Produits */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                Top Produits les plus vendus ({stats.topProducts.length})
              </h2>
            </div>
            <span className="text-xs text-gray-400 font-medium">Classé par volume</span>
          </div>

          {stats.topProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-gray-100">
                <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-2.5">Article</th>
                    <th className="p-2.5 text-center">Qté vendue</th>
                    <th className="p-2.5 text-right">CA TTC</th>
                    <th className="p-2.5 text-right">Marge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stats.topProducts.map((prod, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-2.5">
                        <span className="font-bold text-gray-900 block truncate max-w-[200px]">
                          {prod.name}
                        </span>
                        <span className="text-[10px] font-mono text-gray-400">{prod.sku}</span>
                      </td>
                      <td className="p-2.5 text-center font-bold text-gray-800">
                        <Badge variant="secondary" className="font-mono text-[11px]">
                          {prod.quantity}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-gray-900">
                        {formatFcfa(prod.totalTtc)}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-blue-600">
                        +{formatFcfa(prod.margin)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-400 text-xs">
              Aucun produit vendu sur cette période.
            </div>
          )}
        </div>

        {/* 2. Classement des Meilleurs Clients */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                Top Clients par volume d'achat ({stats.topCustomers.length})
              </h2>
            </div>
            <span className="text-xs text-gray-400 font-medium">Classé par CA TTC</span>
          </div>

          {stats.topCustomers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-gray-100">
                <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-2.5">Client</th>
                    <th className="p-2.5 text-center">Factures</th>
                    <th className="p-2.5 text-right">Total Acheté</th>
                    <th className="p-2.5 text-right">Reste Dû</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stats.topCustomers.map((cust, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-2.5">
                        <span className="font-bold text-gray-900 block truncate max-w-[200px]">
                          {cust.name}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {cust.ifu ? `IFU: ${cust.ifu}` : cust.phone || 'Particulier'}
                        </span>
                      </td>
                      <td className="p-2.5 text-center font-bold text-gray-800">
                        <Badge variant="outline" className="font-mono text-[11px]">
                          {cust.invoicesCount}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-emerald-700">
                        {formatFcfa(cust.totalTtc)}
                      </td>
                      <td className={`p-2.5 text-right font-mono font-bold ${
                        cust.totalRemaining > 0 ? 'text-red-600' : 'text-gray-400'
                      }`}>
                        {formatFcfa(cust.totalRemaining)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-400 text-xs">
              Aucun achat enregistré sur cette période.
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TABLEAU RÉCAPITULATIF DES FACTURES DE LA PÉRIODE */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Détail des factures de la période ({filteredInvoices.length})
            </h2>
          </div>
          <Link href={`/e/${companySlug}/commerce/ventes`}>
            <span className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1">
              <span>Voir dans le Journal des Ventes</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        </div>

        {filteredInvoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-gray-200">
              <thead className="bg-gray-100 text-gray-700 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="p-3">N° Facture</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Client</th>
                  <th className="p-3">Mode</th>
                  <th className="p-3 text-right">Net HT</th>
                  <th className="p-3 text-right">TVA 18%</th>
                  <th className="p-3 text-right">Net TTC</th>
                  <th className="p-3 text-right">Payé</th>
                  <th className="p-3 text-right">Reste Dû</th>
                  <th className="p-3 text-center">Statut e-MECeF</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="p-3 font-mono font-bold text-blue-700 whitespace-nowrap">
                      {inv.documentNumber}
                    </td>
                    <td className="p-3 font-mono text-gray-600 whitespace-nowrap">
                      {inv.date}
                    </td>
                    <td className="p-3 font-semibold text-gray-900">
                      {inv.customerName}
                    </td>
                    <td className="p-3">
                      <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
                        {inv.paymentMode === 'MOBILE_MONEY'
                          ? 'Mobile Money'
                          : inv.paymentMode === 'ESPECES'
                          ? 'Espèces'
                          : inv.paymentMode === 'VIREMENT'
                          ? 'Virement'
                          : inv.paymentMode === 'CHEQUE'
                          ? 'Chèque'
                          : 'À terme'}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono text-gray-700">
                      {formatFcfa(inv.totalNetHt)}
                    </td>
                    <td className="p-3 text-right font-mono text-amber-700">
                      {formatFcfa(inv.totalVat)}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-gray-900">
                      {formatFcfa(inv.netToPay)}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-700">
                      {formatFcfa(inv.paidAmount)}
                    </td>
                    <td className={`p-3 text-right font-mono font-bold ${
                      inv.remainingAmount > 0 ? 'text-red-600' : 'text-emerald-700'
                    }`}>
                      {formatFcfa(inv.remainingAmount)}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      {inv.status === 'FISCALIZED' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          Normalisée
                        </span>
                      ) : inv.status === 'VALIDATED' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                          Validée
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-300">
                          Brouillon
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-gray-400 text-xs">
            Aucune facture n'a été émise sur la plage de dates sélectionnée.
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODALE D'EXPORTATION PDF / RAPPORT OFFICIEL IMPRIMABLE (A4 CERTIFIÉ) */}
      {/* ========================================================================= */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto print:block">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-6 my-auto border border-gray-200 max-h-[95vh] flex flex-col print:max-h-none print:h-auto print:shadow-none print:border-none print:p-0 print:w-full print:max-w-none print:block">
            
            {/* Barre d'actions d'impression (masquée à l'impression) */}
            <div className="flex flex-col sm:flex-row items-center justify-between pb-4 border-b border-gray-200 gap-3 shrink-0 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-bold text-sm text-gray-900">
                    Aperçu officiel avant impression / Export PDF
                  </h3>
                  <p className="text-xs text-gray-500">
                    Bilan d'activité avec l'en-tête officiel de {companyDisplayName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => window.print()}
                  className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimer / Sauvegarder en PDF</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportExcel}
                  className="h-9 px-3.5 border-emerald-600 text-emerald-800 hover:bg-emerald-50 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Excel</span>
                </Button>

                <button
                  type="button"
                  onClick={() => setShowPdfModal(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* FEUILLE OFFICIELLE DU RAPPORT A4 (Visible à l'écran et imprimée) */}
            <div className="overflow-y-auto flex-1 pr-2 print:overflow-visible print:pr-0">
              <div className="bg-white p-6 sm:p-8 rounded-xl border border-gray-200 shadow-xs space-y-6 text-gray-800 text-xs print:border-none print:shadow-none print:p-0">
                
                {/* 1. EN-TÊTE OFFICIEL DE LA STRUCTURE */}
                <div className="flex items-start justify-between border-b-2 border-blue-600 pb-5">
                  <div className="space-y-1">
                    <span className="text-2xl font-black text-blue-700 tracking-tight block">
                      {companyDisplayName}
                    </span>
                    <p className="text-xs font-semibold text-gray-700">
                      Commerce Général, Prestations & Fournitures de Bureau
                    </p>
                    <p className="text-[11px] text-gray-600">
                      <strong>IFU :</strong> 0202612345678 • <strong>RCCM :</strong> RB/COT/2026/B/1234
                    </p>
                    <p className="text-[11px] text-gray-600">
                      Cotonou, République du Bénin • <strong>Tél :</strong> +229 97 00 00 00
                    </p>
                  </div>

                  <div className="text-right space-y-1">
                    <span className="inline-block px-3 py-1 bg-blue-50 text-blue-800 border border-blue-300 rounded-lg text-xs font-black uppercase tracking-wider">
                      RAPPORT DE BILAN COMMERCIAL
                    </span>
                    <p className="text-xs font-bold text-gray-900 mt-1">
                      Période : Du {formatDateFr(filterStartDate)} au {formatDateFr(filterEndDate)}
                    </p>
                    <p className="text-[10px] text-gray-500 font-mono">
                      Édité le {new Date().toLocaleDateString('fr-BJ')} à {new Date().toLocaleTimeString('fr-BJ', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      Document certifié conforme e-MECeF Bénin
                    </p>
                  </div>
                </div>

                {/* 2. SYNTHÈSE DES 4 GRANDS CHIFFRES CLÉS */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-right">
                    <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
                      Chiffre d'Affaires TTC
                    </span>
                    <span className="text-lg font-black text-blue-700 font-mono block">
                      {formatFcfa(stats.totalSalesTtc)}
                    </span>
                    <span className="text-[9px] text-gray-400 block mt-0.5">Total ventes</span>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-right">
                    <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
                      Chiffre Net HT
                    </span>
                    <span className="text-lg font-black text-gray-900 font-mono block">
                      {formatFcfa(stats.totalSalesHt)}
                    </span>
                    <span className="text-[9px] text-gray-400 block mt-0.5">Base imposable</span>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-right">
                    <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
                      TVA Collectée (18%)
                    </span>
                    <span className="text-lg font-black text-amber-700 font-mono block">
                      {formatFcfa(stats.totalVat)}
                    </span>
                    <span className="text-[9px] text-gray-400 block mt-0.5">AIB : {formatFcfa(stats.totalAib)}</span>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-right">
                    <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
                      Marge Brute Estimée
                    </span>
                    <span className="text-lg font-black text-emerald-700 font-mono block">
                      {formatFcfa(stats.totalMargin)}
                    </span>
                    <span className="text-[9px] text-emerald-600 block mt-0.5">Taux : {stats.marginRate.toFixed(1)}%</span>
                  </div>
                </div>

                {/* 3. TABLEAU DE VENTILATION DES RÈGLEMENTS */}
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-gray-900 block">Situation des Recouvrements</span>
                    <span className="text-gray-500 text-[11px]">{stats.invoicesCount} facture(s) émise(s) au total</span>
                  </div>
                  <div className="flex items-center gap-6 text-right font-mono">
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase block">Total Encaissé</span>
                      <strong className="text-emerald-700 text-sm font-black">+{formatFcfa(stats.totalPaid)}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase block">Créances Dues</span>
                      <strong className="text-red-600 text-sm font-black">{formatFcfa(stats.totalRemaining)}</strong>
                    </div>
                  </div>
                </div>

                {/* 4. TABLEAU DES MEILLEURS PRODUITS */}
                <div className="space-y-2">
                  <span className="font-bold text-xs uppercase tracking-wider text-gray-700 block">
                    Top Produits Vendus sur la Période
                  </span>
                  <table className="w-full text-left text-[11px] border border-gray-200">
                    <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-[9px]">
                      <tr className="border-b">
                        <th className="p-2">Réf. SKU</th>
                        <th className="p-2">Désignation</th>
                        <th className="p-2 text-center">Quantité</th>
                        <th className="p-2 text-right">Total HT</th>
                        <th className="p-2 text-right">Total TTC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {stats.topProducts.slice(0, 5).map((p, i) => (
                        <tr key={i}>
                          <td className="p-2 font-mono font-bold">{p.sku}</td>
                          <td className="p-2">{p.name}</td>
                          <td className="p-2 text-center font-bold">{p.quantity}</td>
                          <td className="p-2 text-right font-mono">{formatFcfa(p.totalHt)}</td>
                          <td className="p-2 text-right font-mono font-bold text-blue-700">{formatFcfa(p.totalTtc)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 5. TABLEAU DES MEILLEURS CLIENTS */}
                <div className="space-y-2">
                  <span className="font-bold text-xs uppercase tracking-wider text-gray-700 block">
                    Top Clients de la Période
                  </span>
                  <table className="w-full text-left text-[11px] border border-gray-200">
                    <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-[9px]">
                      <tr className="border-b">
                        <th className="p-2">Nom du Client</th>
                        <th className="p-2">N° IFU</th>
                        <th className="p-2 text-center">Factures</th>
                        <th className="p-2 text-right">Total Achats TTC</th>
                        <th className="p-2 text-right">Reste Dû</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {stats.topCustomers.slice(0, 5).map((c, i) => (
                        <tr key={i}>
                          <td className="p-2 font-bold">{c.name}</td>
                          <td className="p-2 font-mono text-gray-500">{c.ifu || 'N/A'}</td>
                          <td className="p-2 text-center font-bold">{c.invoicesCount}</td>
                          <td className="p-2 text-right font-mono font-bold text-emerald-700">{formatFcfa(c.totalTtc)}</td>
                          <td className="p-2 text-right font-mono font-bold text-red-600">{formatFcfa(c.totalRemaining)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 6. TIMBRE & SIGNATURE OFFICIELLE */}
                <div className="pt-6 border-t border-gray-200 grid grid-cols-2 gap-8 text-[11px]">
                  <div>
                    <span className="font-bold block text-gray-700 uppercase">Le Responsable Comptable & Financier</span>
                    <p className="text-gray-400 mt-0.5">Certifié exact et sincère</p>
                    <div className="h-16 mt-2 border-b border-dashed border-gray-300 flex items-end pb-1 text-gray-400 italic text-[10px]">
                      Mention manuscrite & visa
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-bold block text-gray-700 uppercase">La Direction Générale</span>
                    <p className="text-gray-400 mt-0.5">Cachet officiel de la structure</p>
                    <div className="h-16 mt-2 border-b border-dashed border-gray-300 flex items-end justify-end pb-1 text-gray-400 italic text-[10px]">
                      Cachet officiel & signature
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
