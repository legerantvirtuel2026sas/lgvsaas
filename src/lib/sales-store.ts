/**
 * Magasin partagé des ventes et factures LGV SaaS (Ventes, Factures, Brouillons, Règlements)
 * Persiste les factures par entreprise (companySlug) dans localStorage avec synchronisation temps réel.
 */

// Ligne d'article dans une facture
export interface InvoiceLineItem {
  id: string;
  articleId: string;
  sku: string;
  name: string;
  taxGroup: 'A' | 'B' | 'C' | 'D';
  quantity: number;
  unitPriceHt: number;
  unitPriceTtc: number;
  unitDiscount: number;
  specificTax: number;
  totalLineHt: number;
  totalLineVat: number;
  totalLineTtc: number;
}

export type SalesDocType = 'INVOICE' | 'EXPORT' | 'PROFORMA' | 'CREDIT_NOTE';

// Échelonnement / Historique des paiements d'une facture
export interface InvoicePaymentInstallment {
  id: string; // Ex: 'ECH-001'
  invoiceId: string;
  documentNumber: string;
  date: string;
  time?: string;
  label: string; // Ex: "Acompte initial à la facturation", "Versement Échéance N°2"
  paymentMode: 'ESPECES' | 'MOBILE_MONEY' | 'CHEQUE' | 'VIREMENT';
  mobileOperator?: 'MTN' | 'MOOV' | 'CELTIIS';
  reference?: string;
  amount: number;
  remainingAfter: number;
  recordedBy?: string;
  notes?: string;
}

// Document de facture de vente / proforma / brouillon
export interface SalesRow extends Record<string, unknown> {
  id: string;
  documentNumber: string;
  date: string;
  time?: string;
  customerId: string;
  customerName: string;
  customerIfu?: string;
  customerPhone?: string;
  customerAddress?: string;
  type: SalesDocType;
  orderReference?: string;
  cashierName?: string;
  items: InvoiceLineItem[];
  // Totaux financiers
  totalGrossHt: number;
  discountAmount: number;
  totalNetHt: number;
  totalVat: number;
  specificTaxTotal: number;
  aibRate: 0 | 1 | 5;
  aibAmount: number;
  totalTtc: number;
  netToPay: number;
  // Règlement
  paymentMode: 'ESPECES' | 'MOBILE_MONEY' | 'CHEQUE' | 'VIREMENT' | 'A_TERME';
  paidAmount: number;
  remainingAmount: number;
  receivedCash?: number;
  changeDue?: number;
  dueDate?: string;
  // Historique des règlements et échelonnements
  installments?: InvoicePaymentInstallment[];
  // Statut : Brouillon (non validé, stock non déduit), Validé (stock déduit, Proforma), Normalisé (stock déduit, Facture de vente certifiée)
  status: 'DRAFT' | 'VALIDATED' | 'FISCALIZED';
  // Normalisation e-MECeF Bénin
  emecefNim?: string;
  emecefCounters?: string;
  emecefCode?: string;
  emecefQrUrl?: string;
  fiscalizedAt?: string;
}

export const DEFAULT_DOCUMENTS: SalesRow[] = [
  {
    id: 'doc_1',
    documentNumber: 'FAC-2026-0001',
    date: '15/10/2026',
    time: '10:30',
    customerId: 'cust_1',
    customerName: 'Société Béninoise d’Import-Export',
    customerIfu: '0202611111111',
    customerPhone: '+229 97 22 33 44',
    customerAddress: 'Zone Industrielle Akpakpa, Cotonou',
    type: 'INVOICE',
    orderReference: 'BC-2026-44',
    cashierName: 'SSEBIO',
    items: [
      {
        id: 'item_1',
        articleId: 'prod_1',
        sku: 'RAM-A4-80G',
        name: 'Rame de papier A4 80g Double A',
        taxGroup: 'B',
        quantity: 100,
        unitPriceHt: 3500,
        unitPriceTtc: 4130,
        unitDiscount: 0,
        specificTax: 0,
        totalLineHt: 350000,
        totalLineVat: 63000,
        totalLineTtc: 413000,
      },
    ],
    totalGrossHt: 350000,
    discountAmount: 0,
    totalNetHt: 350000,
    totalVat: 63000,
    specificTaxTotal: 0,
    aibRate: 1,
    aibAmount: 3500,
    totalTtc: 413000,
    netToPay: 416500,
    paymentMode: 'ESPECES',
    paidAmount: 416500,
    remainingAmount: 0,
    installments: [
      {
        id: 'ECH-001',
        invoiceId: 'doc_1',
        documentNumber: 'FAC-2026-0001',
        date: '15/10/2026',
        time: '10:30',
        label: 'Règlement initial au comptant (Facturation)',
        paymentMode: 'ESPECES',
        amount: 416500,
        remainingAfter: 0,
        recordedBy: 'SSEBIO',
      },
    ],
    status: 'FISCALIZED',
    emecefNim: 'MCF01002026-AB1',
    emecefCounters: '42/189 FV',
    emecefCode: 'EMCF-BJ-2026-X89K2-M37',
    emecefQrUrl: 'https://emcf.dgi.bj/verify/EMCF-BJ-2026-X89K2-M37',
    fiscalizedAt: '15/10/2026 10:31',
  },
  {
    id: 'doc_2',
    documentNumber: 'FAC-2026-0002',
    date: '15/10/2026',
    time: '11:45',
    customerId: 'cust_2',
    customerName: 'Établissements Alafia & Fils',
    customerIfu: '0202622222222',
    customerPhone: '+229 96 55 66 77',
    type: 'INVOICE',
    orderReference: 'BC-ALAFIA-09',
    cashierName: 'SSEBIO',
    items: [
      {
        id: 'item_2',
        articleId: 'prod_2',
        sku: 'TONER-HP-05A',
        name: 'Cartouche de Toner HP LaserJet 05A Noir',
        taxGroup: 'B',
        quantity: 4,
        unitPriceHt: 45000,
        unitPriceTtc: 53100,
        unitDiscount: 0,
        specificTax: 0,
        totalLineHt: 180000,
        totalLineVat: 32400,
        totalLineTtc: 212400,
      },
    ],
    totalGrossHt: 180000,
    discountAmount: 0,
    totalNetHt: 180000,
    totalVat: 32400,
    specificTaxTotal: 0,
    aibRate: 1,
    aibAmount: 1800,
    totalTtc: 212400,
    netToPay: 214200,
    paymentMode: 'A_TERME',
    paidAmount: 0,
    remainingAmount: 214200,
    dueDate: '15/11/2026',
    installments: [],
    status: 'VALIDATED',
  },
  {
    id: 'doc_3',
    documentNumber: 'FAC-2026-0003',
    date: '15/10/2026',
    time: '14:20',
    customerId: 'cust_3',
    customerName: 'Jean-Baptiste ADANHO',
    customerIfu: 'Particulier',
    customerPhone: '+229 95 88 99 00',
    type: 'INVOICE',
    cashierName: 'SSEBIO',
    items: [
      {
        id: 'item_3',
        articleId: 'prod_4',
        sku: 'SOURIS-LOGI-M185',
        name: 'Souris Optique Sans Fil Logitech M185',
        taxGroup: 'B',
        quantity: 5,
        unitPriceHt: 8500,
        unitPriceTtc: 10030,
        unitDiscount: 0,
        specificTax: 0,
        totalLineHt: 42500,
        totalLineVat: 7650,
        totalLineTtc: 50150,
      },
    ],
    totalGrossHt: 42500,
    discountAmount: 0,
    totalNetHt: 42500,
    totalVat: 7650,
    specificTaxTotal: 0,
    aibRate: 0,
    aibAmount: 0,
    totalTtc: 50150,
    netToPay: 50150,
    paymentMode: 'ESPECES',
    paidAmount: 0,
    remainingAmount: 50150,
    dueDate: '30/11/2026',
    installments: [],
    status: 'DRAFT',
  },
  {
    id: 'doc_4',
    documentNumber: 'FAC-2026-0004',
    date: '18/11/2026',
    time: '09:15',
    customerId: 'cust_1',
    customerName: 'Société Béninoise d’Import-Export',
    customerIfu: '0202611111111',
    customerPhone: '+229 97 22 33 44',
    customerAddress: 'Zone Industrielle Akpakpa, Cotonou',
    type: 'INVOICE',
    orderReference: 'BC-2026-92',
    cashierName: 'SSEBIO',
    items: [
      {
        id: 'item_4',
        articleId: 'prod_3',
        sku: 'CLAV-LOGI-K120',
        name: 'Clavier USB Filaire Logitech K120',
        taxGroup: 'B',
        quantity: 15,
        unitPriceHt: 6500,
        unitPriceTtc: 7670,
        unitDiscount: 0,
        specificTax: 0,
        totalLineHt: 97500,
        totalLineVat: 17550,
        totalLineTtc: 115050,
      },
      {
        id: 'item_5',
        articleId: 'prod_1',
        sku: 'RAM-A4-80G',
        name: 'Rame de papier A4 80g Double A',
        taxGroup: 'B',
        quantity: 50,
        unitPriceHt: 3500,
        unitPriceTtc: 4130,
        unitDiscount: 0,
        specificTax: 0,
        totalLineHt: 175000,
        totalLineVat: 31500,
        totalLineTtc: 206500,
      },
    ],
    totalGrossHt: 272500,
    discountAmount: 0,
    totalNetHt: 272500,
    totalVat: 49050,
    specificTaxTotal: 0,
    aibRate: 1,
    aibAmount: 2725,
    totalTtc: 321550,
    netToPay: 324275,
    paymentMode: 'MOBILE_MONEY',
    paidAmount: 324275,
    remainingAmount: 0,
    installments: [
      {
        id: 'ECH-001',
        invoiceId: 'doc_4',
        documentNumber: 'FAC-2026-0004',
        date: '18/11/2026',
        time: '09:15',
        label: 'Règlement intégral Mobile Money (Facturation)',
        paymentMode: 'MOBILE_MONEY',
        mobileOperator: 'MTN',
        reference: 'REF-PAY-FAC20260004-01',
        amount: 324275,
        remainingAfter: 0,
        recordedBy: 'SSEBIO',
      },
    ],
    status: 'FISCALIZED',
    emecefNim: 'MCF01002026-AB1',
    emecefCounters: '43/190 FV',
    emecefCode: 'EMCF-BJ-2026-T58Q1-M92',
    emecefQrUrl: 'https://emcf.dgi.bj/verify/EMCF-BJ-2026-T58Q1-M92',
    fiscalizedAt: '18/11/2026 09:16',
  },
  {
    id: 'doc_5',
    documentNumber: 'FAC-2025-0018',
    date: '20/12/2025',
    time: '15:30',
    customerId: 'cust_2',
    customerName: 'Établissements Alafia & Fils',
    customerIfu: '0202622222222',
    customerPhone: '+229 96 55 66 77',
    type: 'INVOICE',
    orderReference: 'BC-ALAFIA-EX2025',
    cashierName: 'SSEBIO',
    items: [
      {
        id: 'item_6',
        articleId: 'prod_2',
        sku: 'TONER-HP-05A',
        name: 'Cartouche de Toner HP LaserJet 05A Noir',
        taxGroup: 'B',
        quantity: 2,
        unitPriceHt: 45000,
        unitPriceTtc: 53100,
        unitDiscount: 0,
        specificTax: 0,
        totalLineHt: 90000,
        totalLineVat: 16200,
        totalLineTtc: 106200,
      },
    ],
    totalGrossHt: 90000,
    discountAmount: 0,
    totalNetHt: 90000,
    totalVat: 16200,
    specificTaxTotal: 0,
    aibRate: 1,
    aibAmount: 900,
    totalTtc: 106200,
    netToPay: 107100,
    paymentMode: 'VIREMENT',
    paidAmount: 107100,
    remainingAmount: 0,
    installments: [
      {
        id: 'ECH-001',
        invoiceId: 'doc_5',
        documentNumber: 'FAC-2025-0018',
        date: '20/12/2025',
        time: '15:30',
        label: 'Virement bancaire de clôture d’exercice 2025',
        paymentMode: 'VIREMENT',
        reference: 'VIR-BOA-2025-998',
        amount: 107100,
        remainingAfter: 0,
        recordedBy: 'SSEBIO',
      },
    ],
    status: 'FISCALIZED',
    emecefNim: 'MCF01002025-AB1',
    emecefCounters: '18/140 FV',
    emecefCode: 'EMCF-BJ-2025-A11K9-V18',
    emecefQrUrl: 'https://emcf.dgi.bj/verify/EMCF-BJ-2025-A11K9-V18',
    fiscalizedAt: '20/12/2025 15:35',
  },
];

const STORAGE_PREFIX = 'lgv_sales_';

export function getSalesStorageKey(companySlug: string): string {
  return `${STORAGE_PREFIX}${companySlug || 'default'}`;
}

export function loadSalesDocuments(companySlug: string): SalesRow[] {
  if (typeof window === 'undefined') {
    return DEFAULT_DOCUMENTS;
  }

  try {
    const raw = localStorage.getItem(getSalesStorageKey(companySlug));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Erreur lecture factures locales :', err);
  }

  saveSalesDocuments(companySlug, DEFAULT_DOCUMENTS);
  return DEFAULT_DOCUMENTS;
}

export function saveSalesDocuments(companySlug: string, documents: SalesRow[]): void {
  if (typeof window === 'undefined') return;

  try {
    const key = getSalesStorageKey(companySlug);
    localStorage.setItem(key, JSON.stringify(documents));
    window.dispatchEvent(
      new CustomEvent('lgv_sales_changed', {
        detail: { companySlug, documents },
      })
    );
  } catch (err) {
    console.error('Erreur sauvegarde factures locales :', err);
  }
}

// Générateur automatique de numéro de document annuel selon les règles de facturation
export function generateDocNumber(type: 'INVOICE' | 'EXPORT', docList: Array<{ documentNumber: string }>): string {
  const currentYear = new Date().getFullYear();
  const prefix = type === 'EXPORT' ? 'EXP' : 'FAC';
  const prefixPattern = `${prefix}-${currentYear}-`;
  
  const seqNumbers = docList
    .map((d) => {
      if (d.documentNumber && d.documentNumber.startsWith(prefixPattern)) {
        const numPart = d.documentNumber.slice(prefixPattern.length);
        const parsed = parseInt(numPart, 10);
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    })
    .filter((n) => n > 0);

  const maxSeq = seqNumbers.length > 0 ? Math.max(...seqNumbers) : 0;
  const nextSeq = maxSeq + 1;
  return `${prefix}-${currentYear}-${String(nextSeq).padStart(4, '0')}`;
}

// Enregistrement d'un nouveau versement / échelonnement pour une facture donnée
export function recordInvoicePayment(
  companySlug: string,
  invoiceId: string,
  paymentData: {
    amount: number;
    paymentMode: 'ESPECES' | 'MOBILE_MONEY' | 'CHEQUE' | 'VIREMENT';
    mobileOperator?: 'MTN' | 'MOOV' | 'CELTIIS';
    reference?: string;
    notes?: string;
    recordedBy?: string;
  }
): { updatedInvoice: SalesRow; newInstallment: InvoicePaymentInstallment } | null {
  const documents = loadSalesDocuments(companySlug);
  const invoiceIndex = documents.findIndex((d) => d.id === invoiceId);
  if (invoiceIndex === -1) return null;

  const invoice = documents[invoiceIndex];
  const paymentAmount = Math.min(paymentData.amount, invoice.remainingAmount);
  if (paymentAmount <= 0) return null;

  const currentInstallments = invoice.installments || [];
  
  // Si la facture avait un paiement initial lors de la vente et aucun historique d'échéance encore tracé :
  const hasInitialPayment = invoice.paidAmount > 0 && currentInstallments.length === 0;
  const initialInstallments: InvoicePaymentInstallment[] = hasInitialPayment
    ? [
        {
          id: 'ECH-001',
          invoiceId: invoice.id,
          documentNumber: invoice.documentNumber,
          date: invoice.date,
          time: invoice.time || '10:00',
          label: 'Acompte initial à la facturation',
          paymentMode: invoice.paymentMode === 'A_TERME' ? 'ESPECES' : invoice.paymentMode,
          amount: invoice.paidAmount,
          remainingAfter: invoice.netToPay - invoice.paidAmount,
          recordedBy: invoice.cashierName || 'SSEBIO',
        },
      ]
    : [...currentInstallments];

  const now = new Date();
  const currentDateStr = now.toLocaleDateString('fr-FR');
  const currentTimeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const nextSeq = initialInstallments.length + 1;
  const newRemaining = Math.max(0, invoice.remainingAmount - paymentAmount);
  const newPaidAmount = invoice.paidAmount + paymentAmount;

  // Référence unique générée automatiquement si non spécifiée manuellement
  const cleanDoc = invoice.documentNumber.replace(/[^A-Za-z0-9]/g, '');
  const autoRef = paymentData.reference?.trim() || `REF-PAY-${cleanDoc}-${String(nextSeq).padStart(2, '0')}`;

  const newInstallment: InvoicePaymentInstallment = {
    id: `ECH-${String(nextSeq).padStart(3, '0')}`,
    invoiceId: invoice.id,
    documentNumber: invoice.documentNumber,
    date: currentDateStr,
    time: currentTimeStr,
    label: `Versement Échéance N°${nextSeq}`,
    paymentMode: paymentData.paymentMode,
    mobileOperator: paymentData.mobileOperator,
    reference: autoRef,
    amount: paymentAmount,
    remainingAfter: newRemaining,
    recordedBy: paymentData.recordedBy || 'SSEBIO',
    notes: paymentData.notes,
  };

  const updatedInvoice: SalesRow = {
    ...invoice,
    paidAmount: newPaidAmount,
    remainingAmount: newRemaining,
    installments: [...initialInstallments, newInstallment],
  };

  documents[invoiceIndex] = updatedInvoice;
  saveSalesDocuments(companySlug, documents);

  return { updatedInvoice, newInstallment };
}
