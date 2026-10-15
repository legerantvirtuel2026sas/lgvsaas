'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DataTable, ColumnDef } from '@/components/data-table/data-table';
import { formatFcfa } from '@/server/domain/money';

interface SalesRow extends Record<string, unknown> {
  id: string;
  documentNumber: string;
  date: string;
  customerName: string;
  type: 'PROFORMA' | 'INVOICE' | 'CREDIT_NOTE';
  totalNetHt: number;
  totalVat: number;
  aibAmount: number;
  netToPay: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'DRAFT' | 'VALIDATED' | 'FISCALIZED';
  paymentMode: 'COMPTANT' | 'A_TERME';
}

export default function SalesPage({ params }: { params: { slug: string } }) {
  const companySlug = params.slug;

  const [documents, setDocuments] = React.useState<SalesRow[]>([
    {
      id: 'doc_1',
      documentNumber: 'FAC-2026-0001',
      date: '15/10/2026',
      customerName: 'Société Béninoise d’Import-Export',
      type: 'INVOICE',
      totalNetHt: 350000,
      totalVat: 63000,
      aibAmount: 3500, // AIB 1%
      netToPay: 416500,
      paidAmount: 416500,
      remainingAmount: 0,
      status: 'FISCALIZED',
      paymentMode: 'COMPTANT',
    },
    {
      id: 'doc_2',
      documentNumber: 'FAC-2026-0002',
      date: '15/10/2026',
      customerName: 'Établissements Alafia & Fils',
      type: 'INVOICE',
      totalNetHt: 185000,
      totalVat: 33300,
      aibAmount: 1850,
      netToPay: 220150,
      paidAmount: 0,
      remainingAmount: 220150,
      status: 'VALIDATED',
      paymentMode: 'A_TERME',
    },
    {
      id: 'doc_3',
      documentNumber: 'PRO-2026-0001',
      date: '15/10/2026',
      customerName: 'Jean-Baptiste ADANHO',
      type: 'PROFORMA',
      totalNetHt: 65000,
      totalVat: 11700,
      aibAmount: 0,
      netToPay: 76700,
      paidAmount: 0,
      remainingAmount: 76700,
      status: 'DRAFT',
      paymentMode: 'COMPTANT',
    },
  ]);

  const [showAddModal, setShowAddModal] = React.useState(false);
  const [customerName, setCustomerName] = React.useState('');
  const [docType, setDocType] = React.useState<'INVOICE' | 'PROFORMA'>('INVOICE');
  const [quantity, setQuantity] = React.useState('10');
  const [unitPriceHt, setUnitPriceHt] = React.useState('3500');
  const [aibRate, setAibRate] = React.useState<'0' | '1' | '5'>('1');
  const [paymentMode, setPaymentMode] = React.useState<'COMPTANT' | 'A_TERME'>('COMPTANT');

  const handleCreateDocument = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantity, 10) || 1;
    const price = parseInt(unitPriceHt, 10) || 0;
    const netHt = qty * price;
    const vat = Math.round(netHt * 0.18);
    const aib = Math.round((netHt * parseInt(aibRate, 10)) / 100);
    const netToPay = netHt + vat + aib;

    const prefix = docType === 'PROFORMA' ? 'PRO' : 'FAC';
    const newDoc: SalesRow = {
      id: `doc_${Date.now()}`,
      documentNumber: `${prefix}-2026-000${documents.length + 1}`,
      date: '15/10/2026',
      customerName: customerName.trim() || 'Client Comptant',
      type: docType,
      totalNetHt: netHt,
      totalVat: vat,
      aibAmount: aib,
      netToPay,
      paidAmount: 0,
      remainingAmount: netToPay,
      status: 'DRAFT',
      paymentMode,
    };

    setDocuments([newDoc, ...documents]);
    setShowAddModal(false);
    setCustomerName('');
  };

  const handleValidate = (id: string) => {
    setDocuments(
      documents.map((d) => {
        if (d.id !== id) return d;
        const isComptant = d.paymentMode === 'COMPTANT';
        return {
          ...d,
          status: 'VALIDATED',
          paidAmount: isComptant ? d.netToPay : 0,
          remainingAmount: isComptant ? 0 : d.netToPay,
        };
      })
    );
    alert('Facture validée : Sortie de stock effectuée et marge brute figée.');
  };

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
    },
    {
      id: 'customerName',
      header: 'Client',
      accessorKey: 'customerName',
      sortable: true,
    },
    {
      id: 'type',
      header: 'Type',
      accessorKey: 'type',
      cell: (row) => (
        <Badge variant={row.type === 'INVOICE' ? 'default' : 'secondary'}>
          {row.type === 'INVOICE' ? 'Facture' : row.type === 'PROFORMA' ? 'Proforma' : 'Avoir'}
        </Badge>
      ),
    },
    {
      id: 'netToPay',
      header: 'Net à Payer',
      accessorKey: 'netToPay',
      sortable: true,
      type: 'number',
      cell: (row) => <span className="font-bold text-blue-600">{formatFcfa(row.netToPay)}</span>,
    },
    {
      id: 'status',
      header: 'Statut',
      accessorKey: 'status',
      cell: (row) => {
        if (row.status === 'FISCALIZED') return <Badge variant="success">Normalisée e-MCF</Badge>;
        if (row.status === 'VALIDATED') return <Badge variant="default">Validée</Badge>;
        return <Badge variant="warning">Brouillon</Badge>;
      },
    },
    {
      id: 'remainingAmount',
      header: 'Reste à payer',
      accessorKey: 'remainingAmount',
      type: 'number',
      cell: (row) => (
        <span className={`text-xs font-semibold ${row.remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
          {row.remainingAmount > 0 ? formatFcfa(row.remainingAmount) : 'Soldée'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center space-x-2">
          {row.status === 'DRAFT' && (
            <Button size="sm" onClick={() => handleValidate(row.id)} className="text-xs">
              Valider facture
            </Button>
          )}
          {row.status === 'VALIDATED' && (
            <Link href={`/e/${companySlug}/commerce/ventes/${row.id}/normalisation`}>
              <Button size="sm" variant="outline" className="text-xs border-green-600 text-green-700 hover:bg-green-50">
                Normaliser e-MECeF
              </Button>
            </Link>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ventes, Facturation & Proformas</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gestion complète des proformas, factures de vente (TVA 18%, AIB 0/1/5%), règlements et normalisation e-MECeF.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={() => setShowAddModal(true)}>+ Nouvelle vente / Proforma</Button>
        </div>
      </div>

      <DataTable columns={columns} data={documents} />

      {/* Modal création de facture / proforma */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Créer une facture ou proforma</h3>
            <form onSubmit={handleCreateDocument} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Type de document</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value as 'INVOICE' | 'PROFORMA')}
                    className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm bg-white"
                  >
                    <option value="INVOICE">Facture de vente (Impact stock)</option>
                    <option value="PROFORMA">Proforma (Devis estimatif)</option>
                  </select>
                </div>

                <Input
                  label="Client *"
                  placeholder="Société Béninoise SARL"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Quantité *"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
                <Input
                  label="Prix de vente unitaire HT (FCFA) *"
                  type="number"
                  value={unitPriceHt}
                  onChange={(e) => setUnitPriceHt(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Taux AIB Bénin</label>
                  <select
                    value={aibRate}
                    onChange={(e) => setAibRate(e.target.value as '0' | '1' | '5')}
                    className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm bg-white"
                  >
                    <option value="1">AIB 1% (Client avec IFU régulier)</option>
                    <option value="5">AIB 5% (Client sans IFU / informel)</option>
                    <option value="0">AIB 0% (Particulier / Non applicable)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Règlement</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as 'COMPTANT' | 'A_TERME')}
                    className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm bg-white"
                  >
                    <option value="COMPTANT">Comptant (Immédiat)</option>
                    <option value="A_TERME">À terme (Créance)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                  Annuler
                </Button>
                <Button type="submit">Créer le document</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
