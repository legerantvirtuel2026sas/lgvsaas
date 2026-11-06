'use client';

import * as React from 'react';
import {
  Plus,
  Check,
  Printer,
  Receipt,
  FileText,
  Trash2,
  Building2,
  UserPlus,
  Search,
  AlertTriangle,
  X,
  Eye,
  RefreshCw,
  Percent,
  ShieldCheck,
  Download,
  Package,
  Truck,
  ArrowRight,
  Lock,
  Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DataTable, ColumnDef } from '@/components/data-table/data-table';
import { formatFcfa } from '@/server/domain/money';
import {
  loadCustomers,
  saveCustomers,
  DEFAULT_CUSTOMERS,
  CustomerItem,
} from '@/lib/customers-store';
import {
  loadArticles,
  saveArticles,
  DEFAULT_ARTICLES,
  ArticleItem,
} from '@/lib/articles-store';
import {
  loadSalesDocuments,
  saveSalesDocuments,
  DEFAULT_DOCUMENTS,
  generateDocNumber,
  SalesRow,
  InvoiceLineItem,
  SalesDocType,
} from '@/lib/sales-store';

export default function SalesPage({ params }: { params: { slug: string } }) {
  const companySlug = params.slug;
  const companyDisplayName = companySlug.replace(/-/g, ' ').toUpperCase();

  // Chargement des référentiels partagés (Clients, Articles & Factures / Brouillons)
  const [customers, setCustomers] = React.useState<CustomerItem[]>(DEFAULT_CUSTOMERS);
  const [articles, setArticles] = React.useState<ArticleItem[]>(DEFAULT_ARTICLES);
  const [documents, setDocuments] = React.useState<SalesRow[]>(DEFAULT_DOCUMENTS);

  React.useEffect(() => {
    setCustomers(loadCustomers(companySlug));
    setArticles(loadArticles(companySlug));
    setDocuments(loadSalesDocuments(companySlug));

    const handleCustSync = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.companySlug === companySlug && customEvent.detail?.customers) {
        setCustomers(customEvent.detail.customers);
      }
    };

    const handleArtSync = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.companySlug === companySlug && customEvent.detail?.articles) {
        setArticles(customEvent.detail.articles);
      }
    };

    const handleSalesSync = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.companySlug === companySlug && customEvent.detail?.documents) {
        setDocuments(customEvent.detail.documents);
      }
    };

    window.addEventListener('lgv_customers_changed', handleCustSync);
    window.addEventListener('lgv_articles_changed', handleArtSync);
    window.addEventListener('lgv_sales_changed', handleSalesSync);

    return () => {
      window.removeEventListener('lgv_customers_changed', handleCustSync);
      window.removeEventListener('lgv_articles_changed', handleArtSync);
      window.removeEventListener('lgv_sales_changed', handleSalesSync);
    };
  }, [companySlug]);

  // Notifications Toast
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // ==========================================
  // ÉTAT DU MODAL : NOUVELLE VENTE / FACTURATION
  // ==========================================
  const [showInvoiceModal, setShowInvoiceModal] = React.useState(false);
  const [editingDocId, setEditingDocId] = React.useState<string | null>(null);
  const [docType, setDocType] = React.useState<'INVOICE' | 'EXPORT'>('INVOICE');
  const [docNumber, setDocNumber] = React.useState('');
  const [docDate, setDocDate] = React.useState('');
  const [orderReference, setOrderReference] = React.useState('');
  const [selectedCustomerId, setSelectedCustomerId] = React.useState('');
  const [cashierName] = React.useState('SSEBIO (Gérant)');

  // Lignes de facture en cours de construction
  const [invoiceLines, setInvoiceLines] = React.useState<InvoiceLineItem[]>([]);

  // Saisie de ligne d'article
  const [selectedArticleId, setSelectedArticleId] = React.useState('');
  const [lineQty, setLineQty] = React.useState('1');
  const [lineDiscount, setLineDiscount] = React.useState('0');
  const [lineSpecificTax, setLineSpecificTax] = React.useState('0');

  // Paramètres globaux de la facture
  const [aibRate, setAibRate] = React.useState<0 | 1 | 5>(1);
  const [hasAib, setHasAib] = React.useState(true);
  const [paymentMode, setPaymentMode] = React.useState<'ESPECES' | 'MOBILE_MONEY' | 'CHEQUE' | 'VIREMENT' | 'A_TERME'>('ESPECES');
  const [paidAmountInput, setPaidAmountInput] = React.useState('');
  const [receivedCashInput, setReceivedCashInput] = React.useState('');
  const [dueDateInput, setDueDateInput] = React.useState('');

  // Article sélectionné dans la ligne d'ajout
  const currentSelectedArticle = articles.find((a) => a.id === selectedArticleId);

  // Client sélectionné dans la facture
  const currentSelectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Modal rapide de création de client
  const [showQuickCustomerModal, setShowQuickCustomerModal] = React.useState(false);
  const [quickCustName, setQuickCustName] = React.useState('');
  const [quickCustIfu, setQuickCustIfu] = React.useState('');
  const [quickCustPhone, setQuickCustPhone] = React.useState('');
  const [quickCustEmail, setQuickCustEmail] = React.useState('');
  const [quickCustAddress, setQuickCustAddress] = React.useState('');

  // Modal d'aperçu & impression (Facture A4, Ticket caisse, Bordereau)
  const [viewingInvoice, setViewingInvoice] = React.useState<SalesRow | null>(null);
  const [previewTab, setPreviewTab] = React.useState<'INVOICE' | 'RECEIPT' | 'DELIVERY'>('INVOICE');

  // ==========================================
  // CALCULS FINANCIERS DYNAMIQUES DE LA FACTURE
  // ==========================================
  const totalGrossHt = invoiceLines.reduce((acc, it) => acc + it.totalLineHt, 0);
  const discountTotal = invoiceLines.reduce((acc, it) => acc + (it.unitDiscount * it.quantity), 0);
  const totalNetHt = Math.max(0, totalGrossHt - discountTotal);
  const totalVat = invoiceLines.reduce((acc, it) => acc + it.totalLineVat, 0);
  const specificTaxTotal = invoiceLines.reduce((acc, it) => acc + (it.specificTax * it.quantity), 0);
  const totalTtc = totalNetHt + totalVat + specificTaxTotal;

  const effectiveAibRate = hasAib ? aibRate : 0;
  const aibAmount = Math.round((totalNetHt * effectiveAibRate) / 100);
  const netToPay = totalTtc + aibAmount;

  // Calculs de règlement
  // Par défaut égal au Net à Payer (ou 0 pour mode À terme), mais librement modifiable manuellement pour un paiement partiel
  const effectivePaidAmount = paidAmountInput !== ''
    ? Math.max(0, parseInt(paidAmountInput, 10) || 0)
    : (paymentMode === 'A_TERME' ? 0 : netToPay);
  const remainingDebt = Math.max(0, netToPay - effectivePaidAmount);
  const parsedReceivedCash = parseInt(receivedCashInput, 10) || 0;
  const changeDue = Math.max(0, parsedReceivedCash - effectivePaidAmount);

  // Ouverture du modal de création de facture
  const handleOpenNewInvoice = () => {
    setEditingDocId(null);
    const today = new Date().toISOString().slice(0, 10);
    const initialType: 'INVOICE' | 'EXPORT' = 'INVOICE';
    setDocType(initialType);
    const latestDocs = loadSalesDocuments(companySlug);
    setDocuments(latestDocs);
    setDocNumber(generateDocNumber(initialType, latestDocs));
    setDocDate(today);
    setOrderReference('');
    if (!selectedCustomerId && customers.length > 0) {
      setSelectedCustomerId(customers[0].id);
    }
    if (!selectedArticleId && articles.length > 0) {
      setSelectedArticleId(articles[0].id);
    }
    setInvoiceLines([]);
    setPaidAmountInput('');
    setReceivedCashInput('');
    setDueDateInput('');
    setShowInvoiceModal(true);
  };

  // Modification d'un brouillon existant
  const handleEditDraft = (doc: SalesRow) => {
    setEditingDocId(doc.id);
    setDocType((doc.type as 'INVOICE' | 'EXPORT') || 'INVOICE');
    setDocNumber(doc.documentNumber);
    // Formatage de la date pour le champ input type="date" (YYYY-MM-DD)
    const dateParts = doc.date ? doc.date.split('/') : [];
    const formattedInputDate = dateParts.length === 3 ? `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}` : new Date().toISOString().slice(0, 10);
    setDocDate(formattedInputDate);
    setOrderReference(doc.orderReference || '');
    setSelectedCustomerId(doc.customerId);
    setInvoiceLines([...doc.items]);
    setHasAib(doc.aibRate > 0);
    setAibRate((doc.aibRate as 0 | 1 | 5) || 1);
    setPaymentMode(doc.paymentMode);
    setPaidAmountInput(doc.paidAmount > 0 ? String(doc.paidAmount) : '');
    setReceivedCashInput(doc.receivedCash ? String(doc.receivedCash) : '');
    setDueDateInput(doc.dueDate || '');
    setShowInvoiceModal(true);
  };

  // Ajout d'une ligne d'article dans la facture
  const handleAddLine = () => {
    if (!currentSelectedArticle) {
      alert('Veuillez sélectionner un article dans la liste.');
      return;
    }

    const qty = parseInt(lineQty, 10) || 1;
    if (qty <= 0) {
      alert('La quantité doit être supérieure à zéro.');
      return;
    }

    // Avertissement si le stock physique est insuffisant
    if (docType === 'INVOICE' && qty > currentSelectedArticle.currentStock) {
      const confirmExceed = confirm(
        `⚠️ Stock insuffisant : Vous commandez ${qty} unités alors qu'il ne reste que ${currentSelectedArticle.currentStock} unités en magasin.\nSouhaitez-vous quand même ajouter cet article ?`
      );
      if (!confirmExceed) return;
    }

    const unitPriceHt = currentSelectedArticle.salePriceHt;
    const vatRate = currentSelectedArticle.taxGroup === 'B' ? 0.18 : 0;
    const unitPriceTtc = Math.round(unitPriceHt * (1 + vatRate));
    const discount = parseInt(lineDiscount, 10) || 0;
    const specTax = parseInt(lineSpecificTax, 10) || 0;

    const lineNetHt = Math.max(0, (unitPriceHt - discount) * qty);
    const lineVat = Math.round(lineNetHt * vatRate);
    const lineTtc = lineNetHt + lineVat + (specTax * qty);

    const newLine: InvoiceLineItem = {
      id: `line_${Date.now()}_${Math.random()}`,
      articleId: currentSelectedArticle.id,
      sku: currentSelectedArticle.sku,
      name: currentSelectedArticle.name,
      taxGroup: currentSelectedArticle.taxGroup,
      quantity: qty,
      unitPriceHt,
      unitPriceTtc,
      unitDiscount: discount,
      specificTax: specTax,
      totalLineHt: lineNetHt,
      totalLineVat: lineVat,
      totalLineTtc: lineTtc,
    };

    setInvoiceLines([...invoiceLines, newLine]);
    setLineQty('1');
    setLineDiscount('0');
    setLineSpecificTax('0');
  };

  // Suppression d'une ligne d'article
  const handleRemoveLine = (lineId: string) => {
    setInvoiceLines(invoiceLines.filter((l) => l.id !== lineId));
  };

  // Sauvegarde de la facture (Brouillon, Validée, ou Validée & Normalisée e-MECeF)
  const handleSaveInvoice = (status: 'DRAFT' | 'VALIDATED' | 'FISCALIZED') => {
    if (!currentSelectedCustomer) {
      alert('Veuillez choisir un client pour cette facture.');
      return;
    }

    if (invoiceLines.length === 0) {
      alert('Veuillez ajouter au moins un article dans la facture.');
      return;
    }

    const now = new Date();
    const formattedDate = now.toLocaleDateString('fr-BJ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const formattedTime = now.toLocaleTimeString('fr-BJ', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Si validation ou normalisation immédiate : décrémenter le stock des articles
    if (status === 'VALIDATED' || status === 'FISCALIZED') {
      const updatedArticles = articles.map((art) => {
        const line = invoiceLines.find((l) => l.articleId === art.id);
        if (line) {
          const nextStock = Math.max(0, art.currentStock - line.quantity);
          return { ...art, currentStock: nextStock, hasTransactions: true };
        }
        return art;
      });
      setArticles(updatedArticles);
      saveArticles(companySlug, updatedArticles);
    }

    // Si normalisation e-MECeF immédiate
    let emecefNim: string | undefined;
    let emecefCounters: string | undefined;
    let emecefCode: string | undefined;
    let emecefQrUrl: string | undefined;
    let fiscalizedAt: string | undefined;

    if (status === 'FISCALIZED') {
      emecefNim = 'MCF01002026-AB1';
      const tag = docType === 'EXPORT' ? 'EV' : 'FV';
      const seq = documents.filter((d) => d.status === 'FISCALIZED').length + 1;
      emecefCounters = `${seq}/${seq + 85} ${tag}`;
      const randCode = Math.random().toString(36).substring(2, 7).toUpperCase();
      emecefCode = `EMCF-BJ-2026-${randCode}-V${docNumber.replace(/[^0-9]/g, '').slice(-3) || '001'}`;
      emecefQrUrl = `https://emcf.dgi.bj/verify/${emecefCode}`;
      fiscalizedAt = `${formattedDate} à ${formattedTime}`;
    }

    // Si on modifie un brouillon existant
    if (editingDocId) {
      const updatedDoc: SalesRow = {
        id: editingDocId,
        documentNumber: docNumber,
        date: formattedDate,
        time: formattedTime,
        customerId: currentSelectedCustomer.id,
        customerName: currentSelectedCustomer.name,
        customerIfu: currentSelectedCustomer.ifu,
        customerPhone: currentSelectedCustomer.phone,
        customerAddress: currentSelectedCustomer.address,
        type: docType,
        orderReference: orderReference.trim(),
        cashierName,
        items: invoiceLines,
        totalGrossHt,
        discountAmount: discountTotal,
        totalNetHt,
        totalVat,
        specificTaxTotal: 0,
        aibRate: effectiveAibRate,
        aibAmount,
        totalTtc,
        netToPay,
        paymentMode,
        paidAmount: status === 'DRAFT' ? 0 : effectivePaidAmount,
        remainingAmount: status === 'DRAFT' ? netToPay : remainingDebt,
        receivedCash: parsedReceivedCash,
        changeDue,
        dueDate: remainingDebt > 0 ? (dueDateInput || '30 jours') : undefined,
        status,
        emecefNim,
        emecefCounters,
        emecefCode,
        emecefQrUrl,
        fiscalizedAt,
      };

      const updatedDocs = documents.map((d) => (d.id === editingDocId ? updatedDoc : d));
      setDocuments(updatedDocs);
      saveSalesDocuments(companySlug, updatedDocs);
      setShowInvoiceModal(false);
      setEditingDocId(null);

      if (status === 'FISCALIZED') {
        showToast(`Facture ${updatedDoc.documentNumber} validée et normalisée e-MECeF avec succès ! Sortie de stock effectuée.`);
        setViewingInvoice(updatedDoc);
        setPreviewTab('INVOICE');
      } else if (status === 'VALIDATED') {
        showToast(`Facture ${updatedDoc.documentNumber} validée avec succès. Sortie de stock effectuée. Document disponible en Proforma.`);
      } else {
        showToast(`Brouillon ${updatedDoc.documentNumber} mis à jour avec succès (Stock non déduit).`);
      }
      return;
    }

    const newDoc: SalesRow = {
      id: `doc_${Date.now()}`,
      documentNumber: docNumber,
      date: formattedDate,
      time: formattedTime,
      customerId: currentSelectedCustomer.id,
      customerName: currentSelectedCustomer.name,
      customerIfu: currentSelectedCustomer.ifu,
      customerPhone: currentSelectedCustomer.phone,
      customerAddress: currentSelectedCustomer.address,
      type: docType,
      orderReference: orderReference.trim(),
      cashierName,
      items: invoiceLines,
      totalGrossHt,
      discountAmount: discountTotal,
      totalNetHt,
      totalVat,
      specificTaxTotal: 0,
      aibRate: effectiveAibRate,
      aibAmount,
      totalTtc,
      netToPay,
      paymentMode,
      paidAmount: status === 'DRAFT' ? 0 : effectivePaidAmount,
      remainingAmount: status === 'DRAFT' ? netToPay : remainingDebt,
      receivedCash: parsedReceivedCash,
      changeDue,
      dueDate: remainingDebt > 0 ? (dueDateInput || '30 jours') : undefined,
      status,
      emecefNim,
      emecefCounters,
      emecefCode,
      emecefQrUrl,
      fiscalizedAt,
    };

    const nextDocuments = [newDoc, ...documents];
    setDocuments(nextDocuments);
    saveSalesDocuments(companySlug, nextDocuments);
    setShowInvoiceModal(false);

    if (status === 'FISCALIZED') {
      showToast(`Facture ${newDoc.documentNumber} validée et normalisée e-MECeF avec succès ! Sortie de stock effectuée.`);
      setViewingInvoice(newDoc);
      setPreviewTab('INVOICE');
    } else if (status === 'VALIDATED') {
      showToast(`Facture ${newDoc.documentNumber} validée avec succès. Sortie de stock effectuée. Document disponible en Proforma.`);
    } else {
      showToast(`Brouillon ${newDoc.documentNumber} enregistré avec succès (Stock non déduit).`);
    }
  };

  // Normalisation e-MECeF de la DGI Bénin pour facture déjà validée
  const handleFiscalize = (docId: string) => {
    const doc = documents.find((d) => d.id === docId);
    if (!doc) return;

    const nim = 'MCF01002026-AB1';
    const tag = doc.type === 'EXPORT' ? 'EV' : 'FV';
    const seq = documents.filter((d) => d.status === 'FISCALIZED').length + 1;
    const counter = `${seq}/${seq + 85} ${tag}`;
    const randCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    const emecefCode = `EMCF-BJ-2026-${randCode}-V${doc.documentNumber.replace(/[^0-9]/g, '').slice(-3) || '001'}`;
    const qrUrl = `https://emcf.dgi.bj/verify/${emecefCode}`;
    const now = new Date();
    const fiscalizedAt = `${now.toLocaleDateString('fr-BJ')} à ${now.toLocaleTimeString('fr-BJ', { hour: '2-digit', minute: '2-digit' })}`;

    const updated = documents.map((d) => {
      if (d.id === docId) {
        return {
          ...d,
          status: 'FISCALIZED' as const,
          emecefNim: nim,
          emecefCounters: counter,
          emecefCode,
          emecefQrUrl: qrUrl,
          fiscalizedAt,
        };
      }
      return d;
    });

    setDocuments(updated);
    saveSalesDocuments(companySlug, updated);
    showToast(`Facture ${doc.documentNumber} certifiée & normalisée e-MECeF avec succès !`);

    // Ouvrir directement l'aperçu officiel certifié
    const fiscalizedDoc = updated.find((d) => d.id === docId);
    if (fiscalizedDoc) {
      setViewingInvoice(fiscalizedDoc);
      setPreviewTab('INVOICE');
    }
  };

  // Validation d'un brouillon existant (Déduit le stock)
  const handleValidateExistingDraft = (docId: string) => {
    const doc = documents.find((d) => d.id === docId);
    if (!doc) return;

    // Déduire le stock des articles
    const updatedArticles = articles.map((art) => {
      const line = doc.items.find((l) => l.articleId === art.id);
      if (line) {
        const nextStock = Math.max(0, art.currentStock - line.quantity);
        return { ...art, currentStock: nextStock, hasTransactions: true };
      }
      return art;
    });
    setArticles(updatedArticles);
    saveArticles(companySlug, updatedArticles);

    const updated = documents.map((d) => {
      if (d.id === docId) {
        return {
          ...d,
          status: 'VALIDATED' as const,
          paidAmount: d.paymentMode === 'A_TERME' ? 0 : d.netToPay,
          remainingAmount: d.paymentMode === 'A_TERME' ? d.netToPay : 0,
        };
      }
      return d;
    });
    setDocuments(updated);
    saveSalesDocuments(companySlug, updated);
    showToast(`Facture ${doc.documentNumber} validée : Stock déduit. Document disponible en Proforma.`);
  };

  // Validation et normalisation directe d'un brouillon existant (Déduit le stock + normalise)
  const handleValidateAndFiscalizeDraft = (docId: string) => {
    const doc = documents.find((d) => d.id === docId);
    if (!doc) return;

    // Déduire le stock des articles
    const updatedArticles = articles.map((art) => {
      const line = doc.items.find((l) => l.articleId === art.id);
      if (line) {
        const nextStock = Math.max(0, art.currentStock - line.quantity);
        return { ...art, currentStock: nextStock, hasTransactions: true };
      }
      return art;
    });
    setArticles(updatedArticles);
    saveArticles(companySlug, updatedArticles);

    const tag = doc.type === 'EXPORT' ? 'EV' : 'FV';
    const seq = documents.filter((d) => d.status === 'FISCALIZED').length + 1;
    const counter = `${seq}/${seq + 85} ${tag}`;
    const randCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    const emecefCode = `EMCF-BJ-2026-${randCode}-V${doc.documentNumber.replace(/[^0-9]/g, '').slice(-3) || '001'}`;
    const qrUrl = `https://emcf.dgi.bj/verify/${emecefCode}`;
    const now = new Date();
    const fiscalizedAt = `${now.toLocaleDateString('fr-BJ')} à ${now.toLocaleTimeString('fr-BJ', { hour: '2-digit', minute: '2-digit' })}`;

    const updated = documents.map((d) => {
      if (d.id === docId) {
        return {
          ...d,
          status: 'FISCALIZED' as const,
          paidAmount: d.paymentMode === 'A_TERME' ? 0 : d.netToPay,
          remainingAmount: d.paymentMode === 'A_TERME' ? d.netToPay : 0,
          emecefNim: 'MCF01002026-AB1',
          emecefCounters: counter,
          emecefCode,
          emecefQrUrl: qrUrl,
          fiscalizedAt,
        };
      }
      return d;
    });
    setDocuments(updated);
    saveSalesDocuments(companySlug, updated);
    showToast(`Facture ${doc.documentNumber} validée et normalisée e-MECeF ! Stock déduit.`);

    const fiscalizedDoc = updated.find((d) => d.id === docId);
    if (fiscalizedDoc) {
      setViewingInvoice(fiscalizedDoc);
      setPreviewTab('INVOICE');
    }
  };

  // Suppression d'un brouillon
  const handleDeleteDraft = (docId: string) => {
    const doc = documents.find((d) => d.id === docId);
    if (!doc) return;
    if (!confirm(`Supprimer définitivement le brouillon ${doc.documentNumber} ?`)) return;
    const nextDocuments = documents.filter((d) => d.id !== docId);
    setDocuments(nextDocuments);
    saveSalesDocuments(companySlug, nextDocuments);
    showToast(`Brouillon ${doc.documentNumber} supprimé.`);
  };

  // Enregistrement rapide d'un nouveau client
  const handleCreateQuickCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCustName.trim()) {
      alert('Le nom du client est obligatoire.');
      return;
    }

    const newCust: CustomerItem = {
      id: `cust_${Date.now()}`,
      name: quickCustName.trim(),
      type: quickCustIfu.trim() ? 'COMPANY' : 'INDIVIDUAL',
      ifu: quickCustIfu.trim() || 'Particulier',
      phone: quickCustPhone.trim() || '+229 00 00 00 00',
      email: quickCustEmail.trim(),
      address: quickCustAddress.trim(),
      currentDebt: 0,
      creditLimit: 0,
      hasInvoices: false,
    };

    const nextCustomers = [newCust, ...customers];
    setCustomers(nextCustomers);
    saveCustomers(companySlug, nextCustomers);

    setSelectedCustomerId(newCust.id);
    setQuickCustName('');
    setQuickCustIfu('');
    setQuickCustPhone('');
    setQuickCustEmail('');
    setQuickCustAddress('');
    setShowQuickCustomerModal(false);

    showToast(`Client "${newCust.name}" créé dans LGV Corp et sélectionné automatiquement.`);
  };

  // Colonnes du tableau principal de la page
  const columns: ColumnDef<SalesRow>[] = [
    {
      id: 'documentNumber',
      header: 'N° Document',
      accessorKey: 'documentNumber',
      sortable: true,
      cell: (row) => <span className="font-mono text-xs font-bold text-gray-900">{row.documentNumber}</span>,
    },
    {
      id: 'date',
      header: 'Date',
      accessorKey: 'date',
      sortable: true,
      cell: (row) => (
        <span className="text-xs text-gray-600 font-mono">
          {row.date} {row.time ? `à ${row.time}` : ''}
        </span>
      ),
    },
    {
      id: 'customerName',
      header: 'Client',
      accessorKey: 'customerName',
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-semibold text-gray-900 block">{row.customerName}</span>
          <span className="text-[11px] text-gray-400 font-mono">IFU: {row.customerIfu || 'N/A'}</span>
        </div>
      ),
    },
    {
      id: 'type',
      header: 'Type',
      accessorKey: 'type',
      cell: (row) => {
        if (row.type === 'EXPORT') {
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
              Facture d'exportation
            </span>
          );
        }
        if (row.type === 'INVOICE') {
          return (
            <Badge variant="default" className="text-xs">
              Facture de vente
            </Badge>
          );
        }
        return (
          <Badge variant="secondary" className="text-xs">
            Facture Proforma
          </Badge>
        );
      },
    },
    {
      id: 'netToPay',
      header: 'Net à Payer TTC',
      accessorKey: 'netToPay',
      sortable: true,
      type: 'number',
      cell: (row) => <span className="font-bold text-blue-700">{formatFcfa(row.netToPay)}</span>,
    },
    {
      id: 'status',
      header: 'Statut de la facture',
      accessorKey: 'status',
      cell: (row) => {
        if (row.status === 'FISCALIZED') {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Normalisée e-MECeF
            </span>
          );
        }
        if (row.status === 'VALIDATED') {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200" title="Facture validée avec sortie de stock. Titre sur document: Facture Proforma">
              <FileText className="w-3.5 h-3.5 text-amber-600" />
              Proforma (validée)
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200" title="Brouillon en attente de validation. Stock non déduit">
            Brouillon
          </span>
        );
      },
    },
    {
      id: 'remainingAmount',
      header: 'Règlement',
      accessorKey: 'remainingAmount',
      type: 'number',
      cell: (row) => (
        <span className={`text-xs font-semibold ${row.remainingAmount > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
          {row.remainingAmount > 0 ? `Dette: ${formatFcfa(row.remainingAmount)}` : 'Payée'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          {/* Si brouillon : boutons Modifier, Aperçu, Valider, Normaliser et Supprimer */}
          {row.status === 'DRAFT' && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleEditDraft(row)}
                className="text-xs h-7 px-2.5 text-blue-700 border-blue-300 hover:bg-blue-50 font-semibold flex items-center gap-1"
                title="Modifier ce brouillon (articles, remises, client, règlement)"
              >
                <Pencil className="w-3 h-3" />
                <span>Modifier</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setViewingInvoice(row);
                  setPreviewTab('INVOICE');
                }}
                className="text-xs h-7 px-2 text-gray-700 border-gray-300 hover:bg-gray-50 flex items-center gap-1"
                title="Aperçu du brouillon"
              >
                <Eye className="w-3 h-3 text-gray-500" />
                <span>Aperçu</span>
              </Button>
              <Button
                size="sm"
                onClick={() => handleValidateExistingDraft(row.id)}
                className="text-xs h-7 px-2 bg-blue-600 hover:bg-blue-700 font-semibold"
                title="Valider la facture (déduit le stock, titre: Facture Proforma)"
              >
                Valider
              </Button>
              <Button
                size="sm"
                onClick={() => handleValidateAndFiscalizeDraft(row.id)}
                className="text-xs h-7 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 shadow-sm"
                title="Valider et certifier e-MECeF immédiatement"
              >
                <ShieldCheck className="w-3 h-3" />
                Normaliser
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDeleteDraft(row.id)}
                className="text-xs h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                title="Supprimer ce brouillon"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </>
          )}

          {/* Si validée non normalisée : bouton Normaliser e-MECeF et Aperçu Proforma */}
          {row.status === 'VALIDATED' && (
            <>
              <Button
                size="sm"
                onClick={() => handleFiscalize(row.id)}
                className="text-xs h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 shadow-sm"
                title="Certifier et normaliser avec l'e-MECeF DGI Bénin"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Normaliser e-MECeF
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setViewingInvoice(row);
                  setPreviewTab('INVOICE');
                }}
                className="text-xs h-7 px-2 text-amber-800 border-amber-300 hover:bg-amber-50 flex items-center gap-1"
                title="Aperçu du document Proforma"
              >
                <FileText className="w-3.5 h-3.5 text-amber-600" />
                <span>Aperçu Proforma</span>
              </Button>
            </>
          )}

          {/* Si normalisée e-MECeF : Facture A4 et Ticket */}
          {row.status === 'FISCALIZED' && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setViewingInvoice(row);
                  setPreviewTab('INVOICE');
                }}
                className="text-xs h-7 px-2 text-blue-700 border-blue-300 hover:bg-blue-50 flex items-center gap-1 font-semibold"
                title="Facture officielle A4 normalisée e-MECeF"
              >
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Facture A4</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setViewingInvoice(row);
                  setPreviewTab('RECEIPT');
                }}
                className="text-xs h-7 px-2 text-gray-700 hover:bg-gray-100 flex items-center gap-1"
                title="Ticket de caisse thermique 80mm"
              >
                <Receipt className="w-3.5 h-3.5 text-gray-600" />
                <span>Ticket</span>
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-medium flex items-center gap-2 border border-gray-700 animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* En-tête de la page */}
      <div className="border-b border-gray-200 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ventes, Facturation & e-MECeF</h1>
          <p className="mt-1 text-sm text-gray-600">
            Établissez des factures complètes avec panier d'articles, calcul automatique TVA/AIB, tickets de caisse et normalisation DGI Bénin.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={handleOpenNewInvoice} className="flex items-center gap-2 shadow-sm font-semibold">
            <Plus className="w-4 h-4" />
            Nouvelle vente
          </Button>
        </div>
      </div>

      {/* Tableau principal des ventes */}
      <DataTable columns={columns} data={documents} />

      {/* ========================================================================= */}
      {/* MODAL COMPLET : FACTURATION DES VENTES (STYLE POS / LOGICIEL DE FACTURATION) */}
      {/* ========================================================================= */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-5xl w-full p-5 sm:p-6 shadow-2xl space-y-4 my-auto border border-gray-200 max-h-[96vh] flex flex-col">
            
            {/* 1. Entête du modal avec Port MECeF et infos générales */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-200 gap-2 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-black">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {editingDocId ? `Modifier le Projet de Facture (Brouillon ${docNumber})` : 'Facturation des Ventes'}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {editingDocId
                      ? 'Modifiez les articles, remises et conditions avant validation définitive'
                      : 'Saisie assistée des articles, calculs fiscaux et émission de documents officiels'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Port MECeF DGI */}
                <div className="flex items-center gap-2 px-2.5 py-1 bg-amber-50 rounded-lg border border-amber-200 text-xs">
                  <span className="font-bold text-amber-900">Port MECeF: 0</span>
                  <span title="Connecté au système e-MECeF">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Contenu interne défilable */}
            <div className="overflow-y-auto space-y-4 pr-1 flex-1">
              {/* Ligne 1 : Numéro Facture, Date, Utilisateur, Type de facture, BC */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-3 bg-gray-50/80 rounded-xl border border-gray-200 text-xs">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">N° Document (Automatique)</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={docNumber}
                      readOnly
                      disabled
                      className="w-full h-9 px-2.5 pl-8 border border-gray-300 rounded-md bg-gray-100 font-mono font-bold text-gray-800 cursor-not-allowed select-none shadow-inner"
                      title="Numéro généré automatiquement selon le compteur annuel légal"
                    />
                    <Lock className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                  <span className="text-[10px] text-gray-400 mt-0.5 block">Automatique (non modifiable)</span>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Date d'émission</label>
                  <input
                    type="date"
                    value={docDate}
                    onChange={(e) => setDocDate(e.target.value)}
                    className="w-full h-9 px-2.5 border border-gray-300 rounded-md bg-white text-gray-800"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Utilisateur / Caissier</label>
                  <input
                    type="text"
                    value={cashierName}
                    disabled
                    className="w-full h-9 px-2.5 border border-gray-200 rounded-md bg-gray-100 text-gray-700 font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Type de facture *</label>
                  <select
                    value={docType}
                    onChange={(e) => {
                      const newType = e.target.value as 'INVOICE' | 'EXPORT';
                      setDocType(newType);
                      setDocNumber(generateDocNumber(newType, documents));
                    }}
                    className="w-full h-9 px-2.5 border border-gray-300 rounded-md bg-white font-semibold text-gray-900 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="INVOICE">Facture de vente</option>
                    <option value="EXPORT">Facture d'exportation</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Bon de commande N°</label>
                  <input
                    type="text"
                    placeholder="Ex: BC-2026-98"
                    value={orderReference}
                    onChange={(e) => setOrderReference(e.target.value)}
                    className="w-full h-9 px-2.5 border border-gray-300 rounded-md bg-white text-gray-900 placeholder:text-gray-400"
                  />
                </div>
              </div>

              {/* Ligne 2 : Sélection Client depuis LGV Corp avec bouton + */}
              <div className="p-3 bg-blue-50/40 rounded-xl border border-blue-100 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    Client sélectionné (LGV Corp Communs) *
                  </label>
                  <span className="text-[11px] text-gray-500">
                    {customers.length} clients enregistrés
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="flex-1 h-9 px-3 border border-gray-300 rounded-md text-xs bg-white font-semibold text-gray-900 focus:ring-1 focus:ring-blue-500"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.ifu && c.ifu !== 'Particulier' ? `(IFU: ${c.ifu})` : '(Particulier)'}
                      </option>
                    ))}
                  </select>

                  {/* Bouton + pour création rapide de client */}
                  <button
                    type="button"
                    onClick={() => setShowQuickCustomerModal(true)}
                    className="h-9 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold flex items-center gap-1.5 shadow-sm shrink-0 transition-colors"
                    title="Ajouter un nouveau client dans LGV Corp"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nouveau client</span>
                  </button>
                </div>

                {currentSelectedCustomer && (
                  <div className="text-[11px] text-gray-600 flex flex-wrap gap-x-4 gap-y-1 pt-1">
                    <span>IFU : <strong className="text-gray-900 font-mono">{currentSelectedCustomer.ifu}</strong></span>
                    <span>Tél : <strong className="text-gray-900">{currentSelectedCustomer.phone}</strong></span>
                    <span>Adresse : <strong className="text-gray-900">{currentSelectedCustomer.address || 'Cotonou'}</strong></span>
                  </div>
                )}
              </div>

              {/* Ligne 3 : Sélection d'article & Ajout au panier de la facture */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
                  Sélectionner un article du catalogue
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 items-end text-xs">
                  {/* Sélecteur d'article */}
                  <div className="lg:col-span-2">
                    <label className="font-semibold text-gray-700 block mb-1">Article</label>
                    <select
                      value={selectedArticleId}
                      onChange={(e) => setSelectedArticleId(e.target.value)}
                      className="w-full h-9 px-2.5 border border-gray-300 rounded-md bg-white font-medium text-gray-900"
                    >
                      {articles.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} [{a.taxGroup}] - {formatFcfa(a.salePriceHt)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Stock disponible restant */}
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Stock dispo</label>
                    <div className="h-9 px-2.5 bg-white border border-gray-200 rounded-md flex items-center justify-between">
                      <span
                        className={`font-black ${
                          !currentSelectedArticle || currentSelectedArticle.currentStock <= 0
                            ? 'text-red-600'
                            : currentSelectedArticle.currentStock <= currentSelectedArticle.minStockAlert
                            ? 'text-amber-600'
                            : 'text-emerald-700'
                        }`}
                      >
                        {currentSelectedArticle ? `${currentSelectedArticle.currentStock} unités` : '-'}
                      </span>
                    </div>
                  </div>

                  {/* Quantité */}
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Qté</label>
                    <input
                      type="number"
                      min="1"
                      value={lineQty}
                      onChange={(e) => setLineQty(e.target.value)}
                      className="w-full h-9 px-2.5 border border-gray-300 rounded-md bg-white font-bold text-gray-900 text-center"
                    />
                  </div>

                  {/* Remise unitaire */}
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Remise (FCFA)</label>
                    <input
                      type="number"
                      min="0"
                      value={lineDiscount}
                      onChange={(e) => setLineDiscount(e.target.value)}
                      className="w-full h-9 px-2.5 border border-gray-300 rounded-md bg-white text-center"
                    />
                  </div>

                  {/* Bouton Ajouter */}
                  <div>
                    <Button
                      type="button"
                      onClick={handleAddLine}
                      className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Ajouter</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Ligne 4 : Tableau des articles de la facture */}
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-sky-600 text-white uppercase text-[11px] font-bold tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Désignation</th>
                      <th className="py-2.5 px-3 text-center">Qté</th>
                      <th className="py-2.5 px-3 text-right">PU TTC</th>
                      <th className="py-2.5 px-3 text-right">PU TTC Remise</th>
                      <th className="py-2.5 px-3 text-right">Total TTC</th>
                      <th className="py-2.5 px-2 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {invoiceLines.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-400 italic">
                          Aucun article dans la facture. Sélectionnez un article ci-dessus et cliquez sur « Ajouter ».
                        </td>
                      </tr>
                    ) : (
                      invoiceLines.map((line, idx) => (
                        <tr key={line.id || idx} className="hover:bg-blue-50/30 transition-colors">
                          <td className="py-2 px-3 font-medium text-gray-900">
                            {line.name} <span className="font-bold text-blue-700">[{line.taxGroup}]</span>
                          </td>
                          <td className="py-2 px-3 text-center font-bold font-mono">
                            {line.quantity}
                          </td>
                          <td className="py-2 px-3 text-right font-mono">
                            {formatFcfa(line.unitPriceTtc)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-gray-600">
                            {line.unitDiscount > 0 ? formatFcfa(Math.max(0, line.unitPriceTtc - line.unitDiscount)) : formatFcfa(line.unitPriceTtc)}
                          </td>
                          <td className="py-2 px-3 text-right font-bold font-mono text-gray-900">
                            {formatFcfa(line.totalLineTtc)}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(line.id)}
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                              title="Retirer cette ligne"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Ligne 5 : Le Bilan Financier de la Facture (Total Brut, Réduction, TVA, AIB, Net à Payer) */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-700 block border-b pb-1">
                  Bilan de la facture & Totaux légaux
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
                  <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                    <span className="text-gray-500 block text-[11px]">Total Brut HT</span>
                    <span className="font-bold font-mono text-gray-900 text-sm mt-0.5 block">
                      {formatFcfa(totalGrossHt)}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                    <span className="text-gray-500 block text-[11px]">Montant Réduit</span>
                    <span className="font-bold font-mono text-amber-700 text-sm mt-0.5 block">
                      {formatFcfa(discountTotal)}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                    <span className="text-gray-500 block text-[11px]">Total Net HT</span>
                    <span className="font-bold font-mono text-gray-900 text-sm mt-0.5 block">
                      {formatFcfa(totalNetHt)}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                    <span className="text-gray-500 block text-[11px]">Montant TVA (18%)</span>
                    <span className="font-bold font-mono text-blue-700 text-sm mt-0.5 block">
                      {formatFcfa(totalVat)}
                    </span>
                  </div>

                  {/* Interrupteur AIB Bénin */}
                  <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-[11px]">AIB Bénin</span>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hasAib}
                          onChange={(e) => setHasAib(e.target.checked)}
                          className="w-3.5 h-3.5 text-blue-600 rounded"
                        />
                        <span className="text-[10px] font-bold text-gray-700">{hasAib ? 'AVEC' : 'SANS'}</span>
                      </label>
                    </div>
                    {hasAib ? (
                      <div className="flex items-center gap-1 mt-0.5">
                        <select
                          value={aibRate}
                          onChange={(e) => setAibRate(Number(e.target.value) as 0 | 1 | 5)}
                          className="h-6 px-1 border border-gray-300 rounded text-xs bg-white font-bold"
                        >
                          <option value="1">1%</option>
                          <option value="5">5%</option>
                          <option value="0">0%</option>
                        </select>
                        <span className="font-mono font-bold text-gray-900 text-xs truncate">
                          {formatFcfa(aibAmount)}
                        </span>
                      </div>
                    ) : (
                      <span className="font-mono text-gray-400 text-xs mt-1 block">0 FCFA</span>
                    )}
                  </div>

                  {/* Net à Payer Global */}
                  <div className="bg-blue-600 text-white p-2.5 rounded-lg shadow-sm">
                    <span className="text-blue-100 block text-[11px] font-semibold">Net à Payer</span>
                    <span className="font-black font-mono text-base mt-0.5 block">
                      {formatFcfa(netToPay)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ligne 6 : Gestion du Règlement & Encaissement */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b pb-1">
                  <span className="font-bold uppercase tracking-wider text-gray-700 block">
                    Gestion du Règlement & Encaissement
                  </span>
                  <span className="text-[11px] text-gray-500">
                    Net exigible : <strong className="font-mono text-blue-700">{formatFcfa(netToPay)}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Mode de règlement</label>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value as any)}
                      className="w-full h-9 px-2.5 border border-gray-300 rounded-md bg-white font-semibold text-gray-900"
                    >
                      <option value="ESPECES">Espèces (Guichet)</option>
                      <option value="MOBILE_MONEY">Mobile Money (MTN MoMo, Moov, Celtiis)</option>
                      <option value="CHEQUE">Chèque bancaire</option>
                      <option value="VIREMENT">Virement bancaire</option>
                      <option value="A_TERME">À terme (Crédit / Facture échue)</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-gray-700 block">Montant Payé (FCFA) *</label>
                      {paidAmountInput !== '' && (
                        <button
                          type="button"
                          onClick={() => setPaidAmountInput('')}
                          className="text-[10px] text-blue-600 hover:text-blue-800 font-bold hover:underline"
                          title="Rétablir le montant par défaut"
                        >
                          Tout solder
                        </button>
                      )}
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={paidAmountInput !== '' ? paidAmountInput : (paymentMode === 'A_TERME' ? '0' : (netToPay > 0 ? String(netToPay) : ''))}
                      onChange={(e) => setPaidAmountInput(e.target.value)}
                      placeholder={String(paymentMode === 'A_TERME' ? 0 : netToPay)}
                      className="w-full h-9 px-2.5 border border-gray-300 rounded-md bg-white font-mono font-bold text-gray-900 focus:ring-1 focus:ring-blue-500"
                      title="Montant encaissé. Par défaut le montant total, modifiable pour saisir un montant inférieur ou partiel."
                    />
                    <span className="text-[10px] text-gray-400 mt-0.5 block">
                      {paidAmountInput === '' ? 'Par défaut • Modifiable manuellement' : 'Montant saisi manuellement'}
                    </span>
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Reste à payer (Dette)</label>
                    <div className={`h-9 px-2.5 rounded-md flex items-center border ${
                      remainingDebt > 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'
                    }`}>
                      <span className={`font-mono font-bold ${remainingDebt > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                        {formatFcfa(remainingDebt)}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 mt-0.5 block">
                      {remainingDebt > 0 ? 'Créance client restante' : 'Soldé'}
                    </span>
                  </div>

                  {paymentMode === 'ESPECES' ? (
                    <>
                      <div>
                        <label className="font-semibold text-gray-700 block mb-1">Espèces reçus</label>
                        <input
                          type="number"
                          placeholder="Ex: 5000"
                          value={receivedCashInput}
                          onChange={(e) => setReceivedCashInput(e.target.value)}
                          className="w-full h-9 px-2.5 border border-gray-300 rounded-md bg-white font-mono font-bold text-gray-900"
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-gray-700 block mb-1">Reliquat (Monnaie)</label>
                        <div className="h-9 px-2.5 bg-emerald-50 border border-emerald-200 rounded-md flex items-center">
                          <span className="font-mono font-black text-emerald-800 text-sm">
                            {formatFcfa(changeDue)}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="lg:col-span-2">
                      <label className="font-semibold text-gray-700 block mb-1">Date Limite de Règlement</label>
                      <input
                        type="date"
                        value={dueDateInput}
                        onChange={(e) => setDueDateInput(e.target.value)}
                        className="w-full h-9 px-2.5 border border-gray-300 rounded-md bg-white text-gray-900"
                      />
                    </div>
                  )}
                </div>

                {/* Échéancier automatique si paiement partiel en mode espèces */}
                {paymentMode === 'ESPECES' && remainingDebt > 0 && (
                  <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-2">
                    <div className="text-[11px] text-amber-900 flex items-center gap-1.5 font-medium">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        Paiement partiel : Le solde impayé de <strong className="font-mono font-bold text-red-700">{formatFcfa(remainingDebt)}</strong> sera imputé en créance client.
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] font-bold text-gray-700 whitespace-nowrap">Échéance accordée :</label>
                      <input
                        type="date"
                        value={dueDateInput}
                        onChange={(e) => setDueDateInput(e.target.value)}
                        className="h-8 px-2 border border-gray-300 rounded text-xs bg-white text-gray-900 font-medium"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Pied du modal avec actions de sauvegarde */}
            <div className="pt-3 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-gray-500">
                Total articles : <strong>{invoiceLines.length}</strong> • Net à payer : <strong className="text-blue-700 text-sm font-mono">{formatFcfa(netToPay)}</strong>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowInvoiceModal(false)}
                  className="text-xs"
                >
                  Annuler
                </Button>

                {/* Bouton 1 : Enregistrer comme brouillon */}
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => handleSaveInvoice('DRAFT')}
                  className="text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300"
                  title="Enregistre la facture en brouillon. Le stock physique ne sera pas déduit."
                >
                  Enregistrer comme brouillon
                </Button>

                {/* Bouton 2 : Valider la facture */}
                <Button
                  type="button"
                  onClick={() => handleSaveInvoice('VALIDATED')}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold"
                  title="Valide la facture et déduit les articles du stock. Titre sur document: FACTURE PROFORMA."
                >
                  Valider la facture
                </Button>

                {/* Bouton 3 : Valider & Normaliser e-MECeF */}
                <Button
                  type="button"
                  onClick={() => handleSaveInvoice('FISCALIZED')}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-sm"
                  title="Valide la vente, déduit le stock et certifie immédiatement la facture avec l'e-MECeF DGI Bénin. Titre sur document: FACTURE DE VENTE."
                >
                  <ShieldCheck className="w-4 h-4 text-white" />
                  Valider & Normaliser e-MECeF
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL SECONDAIRE : NOUVEAU CLIENT RAPIDE (SUB-MODAL) */}
      {/* ========================================================================= */}
      {showQuickCustomerModal && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-2.5">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                Nouveau Client (LGV Corp)
              </h3>
              <button
                type="button"
                onClick={() => setShowQuickCustomerModal(false)}
                className="text-gray-400 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateQuickCustomer} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Nom / Raison sociale *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Établissements Bon Pasteur"
                  value={quickCustName}
                  onChange={(e) => setQuickCustName(e.target.value)}
                  className="w-full h-9 px-3 border border-gray-300 rounded-md text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">IFU Bénin</label>
                  <input
                    type="text"
                    placeholder="Ex: 0202633333333"
                    value={quickCustIfu}
                    onChange={(e) => setQuickCustIfu(e.target.value)}
                    className="w-full h-9 px-3 border border-gray-300 rounded-md text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Téléphone *</label>
                  <input
                    type="text"
                    required
                    placeholder="+229 97 00 00 00"
                    value={quickCustPhone}
                    onChange={(e) => setQuickCustPhone(e.target.value)}
                    className="w-full h-9 px-3 border border-gray-300 rounded-md text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="contact@client.bj"
                    value={quickCustEmail}
                    onChange={(e) => setQuickCustEmail(e.target.value)}
                    className="w-full h-9 px-3 border border-gray-300 rounded-md text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Ville / Quartier</label>
                  <input
                    type="text"
                    placeholder="Cotonou"
                    value={quickCustAddress}
                    onChange={(e) => setQuickCustAddress(e.target.value)}
                    className="w-full h-9 px-3 border border-gray-300 rounded-md text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowQuickCustomerModal(false)}
                >
                  Fermer
                </Button>
                <Button type="submit">
                  Enregistrer & Sélectionner
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL APERÇU & IMPRESSION (FACTURE A4, TICKET THERMIQUE 80MM, BORDEREAU) */}
      {/* ========================================================================= */}
      {viewingInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-4 my-auto border border-gray-200 max-h-[95vh] flex flex-col">
            
            {/* Barre de navigation des formats d'impression */}
            <div className="flex flex-col sm:flex-row items-center justify-between pb-3 border-b gap-3 shrink-0">
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
                  size="sm"
                  onClick={() => window.print()}
                  className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 font-bold shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimer directement</span>
                </Button>
                <button
                  type="button"
                  onClick={() => setViewingInvoice(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Conteneur imprimable */}
            <div className="overflow-y-auto flex-1 p-4 bg-gray-100 rounded-xl flex justify-center">
              
              {/* VUE 1 : FACTURE OFFICIELLE FORMAT A4 */}
              {previewTab === 'INVOICE' && (
                <div className="bg-white p-8 max-w-2xl w-full rounded-lg shadow-sm text-gray-800 space-y-6 text-xs border border-gray-200 print:border-none print:shadow-none">
                  {/* Entête société & e-MECeF */}
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
                          ? 'FACTURE PROFORMA'
                          : 'FACTURE BROUILLON'}
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
                      {viewingInvoice.status === 'DRAFT' && (
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-300 text-[10px] font-bold">
                            BROUILLON (STOCK NON DÉDUIT)
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

                  {/* Totaux financiers & récapitulation e-MECeF */}
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-2">
                    {/* Bloc bas : Informations officielles e-MECeF DGI uniquement si la facture est validée et normalisée */}
                    {viewingInvoice.status === 'FISCALIZED' ? (
                      <div className="flex-1 space-y-1 p-3 bg-emerald-50/50 rounded-lg border border-emerald-200">
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
                    ) : (
                      <div className="flex-1">
                        {/* Aucun message d'information ou d'alerte en bas pour les factures proforma */}
                      </div>
                    )}

                    {/* Encadré des montants */}
                    <div className="w-64 space-y-1.5 text-right font-mono">
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
                <div className="bg-white p-4 max-w-[320px] w-full rounded shadow-sm text-gray-900 space-y-3 font-mono text-[11px] border border-gray-200">
                  <div className="text-center space-y-0.5 border-b pb-2">
                    <span className="font-black text-sm block tracking-wide">{companyDisplayName}</span>
                    <p className="text-[10px] text-gray-600">BOUTIQUE CENTRALE - COTONOU</p>
                    <p className="text-[10px] text-gray-600">IFU : 0202612345678</p>
                    <p className="text-[10px] text-gray-600">TEL : +229 97 00 00 00</p>
                    <span className="inline-block mt-1 font-bold text-[10px] px-2 py-0.5 bg-gray-100 rounded">
                      {viewingInvoice.status === 'FISCALIZED'
                        ? (viewingInvoice.type === 'EXPORT' ? 'TICKET VENTE EXPORT' : 'TICKET DE VENTE NORMALISÉ')
                        : viewingInvoice.status === 'VALIDATED'
                        ? 'TICKET PROFORMA'
                        : 'TICKET BROUILLON'}
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
                      <div key={idx} className="flex justify-between">
                        <div>
                          <span className="block font-bold">{item.name.slice(0, 22)}</span>
                          <span className="text-[10px] text-gray-500">
                            {item.quantity} x {formatFcfa(item.unitPriceTtc)} [{item.taxGroup}]
                          </span>
                        </div>
                        <span className="font-bold">{formatFcfa(item.totalLineTtc)}</span>
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
                    {viewingInvoice.aibAmount > 0 && (
                      <div className="flex justify-between">
                        <span>AIB ({viewingInvoice.aibRate}%):</span>
                        <span>{formatFcfa(viewingInvoice.aibAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-black text-sm border-t pt-1">
                      <span>TOTAL TTC:</span>
                      <span>{formatFcfa(viewingInvoice.netToPay)}</span>
                    </div>
                  </div>

                  {/* Règlement ticket */}
                  <div className="space-y-0.5 text-[10px] border-b pb-2">
                    <p>
                      Mode : {viewingInvoice.paymentMode === 'MOBILE_MONEY' ? 'Mobile Money (MTN/Moov/Celtiis)' : viewingInvoice.paymentMode}
                    </p>
                    {viewingInvoice.receivedCash && viewingInvoice.receivedCash > 0 && (
                      <>
                        <p>Espèces Reçus : {formatFcfa(viewingInvoice.receivedCash)}</p>
                        <p>Monnaie Rendue : {formatFcfa(viewingInvoice.changeDue || 0)}</p>
                      </>
                    )}
                  </div>

                  {/* Pied e-MECeF */}
                  <div className="text-center text-[9px] text-gray-500 pt-1 space-y-0.5">
                    {viewingInvoice.status === 'FISCALIZED' ? (
                      <>
                        <p className="font-bold text-gray-800">e-MECeF / DGI BÉNIN</p>
                        <p className="font-mono font-bold text-emerald-800">{viewingInvoice.emecefCode}</p>
                        <p className="text-emerald-700 font-bold">FACTURE NORMALISÉE CERTIFIÉE</p>
                      </>
                    ) : viewingInvoice.status === 'VALIDATED' ? (
                      <p className="font-bold text-gray-700">TICKET PROFORMA</p>
                    ) : (
                      <p className="text-gray-400">PROJET BROUILLON</p>
                    )}
                    <p className="pt-1">MERCI DE VOTRE CONFIANCE !</p>
                  </div>
                </div>
              )}

              {/* VUE 3 : BORDEREAU DE LIVRAISON */}
              {previewTab === 'DELIVERY' && (
                <div className="bg-white p-8 max-w-2xl w-full rounded-lg shadow-sm text-gray-800 space-y-6 text-xs border border-gray-200">
                  <div className="flex justify-between border-b pb-3">
                    <div>
                      <span className="text-lg font-black text-gray-900 block">{companyDisplayName}</span>
                      <p className="text-gray-500 text-[11px]">Service Expéditions & Logistique</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-blue-700 block">BORDEREAU DE LIVRAISON</span>
                      <span className="font-mono font-bold text-xs">BL-{viewingInvoice.documentNumber}</span>
                      <p className="text-gray-500 text-[11px]">Date : {viewingInvoice.date}</p>
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 rounded border">
                    <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Destinataire</span>
                    <span className="font-bold text-gray-900 block text-sm">{viewingInvoice.customerName}</span>
                    <p className="text-gray-600">Adresse de livraison : {viewingInvoice.customerAddress || 'Cotonou'}</p>
                    <p className="text-gray-600">Contact : {viewingInvoice.customerPhone || 'N/A'}</p>
                  </div>

                  <table className="w-full text-left text-xs border">
                    <thead className="bg-gray-100 text-gray-700 uppercase text-[10px] font-bold">
                      <tr className="border-b">
                        <th className="p-2">Réf. SKU</th>
                        <th className="p-2">Désignation</th>
                        <th className="p-2 text-center">Quantité Livrée</th>
                        <th className="p-2 text-center">Conformité</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {viewingInvoice.items.map((it, idx) => (
                        <tr key={idx}>
                          <td className="p-2 font-mono font-bold">{it.sku}</td>
                          <td className="p-2 font-medium">{it.name}</td>
                          <td className="p-2 text-center font-bold text-sm">{it.quantity} unités</td>
                          <td className="p-2 text-center text-gray-400">[  ] Conforme</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Signatures */}
                  <div className="grid grid-cols-2 gap-6 pt-6">
                    <div className="border border-dashed p-4 rounded h-24 text-[11px] text-gray-500">
                      Visa du Magasinier / Livreur :
                    </div>
                    <div className="border border-dashed p-4 rounded h-24 text-[11px] text-gray-500">
                      Date & Signature du Client (Reçu conforme) :
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
