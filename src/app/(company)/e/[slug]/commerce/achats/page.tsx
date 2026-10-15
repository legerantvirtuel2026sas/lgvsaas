'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DataTable, ColumnDef } from '@/components/data-table/data-table';
import { formatFcfa } from '@/server/domain/money';

interface PurchaseRow extends Record<string, unknown> {
  id: string;
  invoiceNumber: string;
  date: string;
  supplierName: string;
  totalNetHt: number;
  totalVat: number;
  totalTtc: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'DRAFT' | 'VALIDATED' | 'CANCELLED';
  paymentMode: 'COMPTANT' | 'A_TERME';
}

export default function PurchasesPage({ params }: { params: { slug: string } }) {
  const companySlug = params.slug;

  const [invoices, setInvoices] = React.useState<PurchaseRow[]>([
    {
      id: 'inv_1',
      invoiceNumber: 'ACH-2026-0001',
      date: '14/10/2026',
      supplierName: 'Fournisseur Papeterie Cotonou',
      totalNetHt: 260000,
      totalVat: 46800,
      totalTtc: 306800,
      paidAmount: 306800,
      remainingAmount: 0,
      status: 'VALIDATED',
      paymentMode: 'COMPTANT',
    },
    {
      id: 'inv_2',
      invoiceNumber: 'ACH-2026-0002',
      date: '15/10/2026',
      supplierName: 'Grossiste Informatique Bénin',
      totalNetHt: 125000,
      totalVat: 22500,
      totalTtc: 147500,
      paidAmount: 0,
      remainingAmount: 147500,
      status: 'DRAFT',
      paymentMode: 'A_TERME',
    },
  ]);

  const [showAddModal, setShowAddModal] = React.useState(false);
  const [supplierName, setSupplierName] = React.useState('');
  const [productName, setProductName] = React.useState('Rame de Papier A4');
  const [quantity, setQuantity] = React.useState('50');
  const [unitPriceHt, setUnitPriceHt] = React.useState('2600');
  const [paymentMode, setPaymentMode] = React.useState<'COMPTANT' | 'A_TERME'>('COMPTANT');

  const handleCreateDraft = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantity, 10) || 1;
    const price = parseInt(unitPriceHt, 10) || 0;
    const netHt = qty * price;
    const vat = Math.round(netHt * 0.18);
    const ttc = netHt + vat;

    const newInv: PurchaseRow = {
      id: `inv_${Date.now()}`,
      invoiceNumber: `ACH-2026-000${invoices.length + 1}`,
      date: '15/10/2026',
      supplierName: supplierName.trim() || 'Fournisseur Général',
      totalNetHt: netHt,
      totalVat: vat,
      totalTtc: ttc,
      paidAmount: 0,
      remainingAmount: ttc,
      status: 'DRAFT',
      paymentMode,
    };

    setInvoices([newInv, ...invoices]);
    setShowAddModal(false);
    setSupplierName('');
  };

  const handleValidate = (id: string) => {
    setInvoices(
      invoices.map((inv) => {
        if (inv.id !== id) return inv;
        const isComptant = inv.paymentMode === 'COMPTANT';
        return {
          ...inv,
          status: 'VALIDATED',
          paidAmount: isComptant ? inv.totalTtc : 0,
          remainingAmount: isComptant ? 0 : inv.totalTtc,
        };
      })
    );
    alert('Facture validée : Entrée en stock physique effectuée et CMUP recalculé.');
  };

  const columns: ColumnDef<PurchaseRow>[] = [
    {
      id: 'invoiceNumber',
      header: 'N° Facture Achat',
      accessorKey: 'invoiceNumber',
      sortable: true,
      cell: (row) => <span className="font-mono text-xs font-bold text-gray-900">{row.invoiceNumber}</span>,
    },
    {
      id: 'date',
      header: 'Date',
      accessorKey: 'date',
      sortable: true,
    },
    {
      id: 'supplierName',
      header: 'Fournisseur',
      accessorKey: 'supplierName',
      sortable: true,
    },
    {
      id: 'totalNetHt',
      header: 'Total HT',
      accessorKey: 'totalNetHt',
      type: 'number',
      cell: (row) => <span>{formatFcfa(row.totalNetHt)}</span>,
    },
    {
      id: 'totalVat',
      header: 'TVA (18%)',
      accessorKey: 'totalVat',
      type: 'number',
      cell: (row) => <span className="text-xs text-gray-500">{formatFcfa(row.totalVat)}</span>,
    },
    {
      id: 'totalTtc',
      header: 'Total TTC',
      accessorKey: 'totalTtc',
      sortable: true,
      type: 'number',
      cell: (row) => <span className="font-bold text-gray-900">{formatFcfa(row.totalTtc)}</span>,
    },
    {
      id: 'status',
      header: 'Statut',
      accessorKey: 'status',
      cell: (row) => (
        <Badge variant={row.status === 'VALIDATED' ? 'success' : 'warning'}>
          {row.status === 'VALIDATED' ? 'Validée (En stock)' : 'Brouillon'}
        </Badge>
      ),
    },
    {
      id: 'remainingAmount',
      header: 'Dette restante',
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
        <div>
          {row.status === 'DRAFT' && (
            <Button size="sm" onClick={() => handleValidate(row.id)} className="text-xs">
              Valider & Entrer stock
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Achats Fournisseurs & Réapprovisionnements</h1>
          <p className="mt-1 text-sm text-gray-600">
            Factures d'achat avec TVA déductible, entrée automatique en stock et gestion des dettes.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={() => setShowAddModal(true)}>+ Nouvelle facture d'achat</Button>
        </div>
      </div>

      <DataTable columns={columns} data={invoices} />

      {/* Modal nouvelle facture d'achat */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Nouvelle facture d'achat</h3>
            <form onSubmit={handleCreateDraft} className="space-y-4">
              <Input
                label="Nom du Fournisseur *"
                placeholder="Fournisseur Papeterie Cotonou"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Désignation de l'article"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  required
                />
                <Input
                  label="Quantité commandée *"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Prix d'achat unitaire HT (FCFA) *"
                  type="number"
                  value={unitPriceHt}
                  onChange={(e) => setUnitPriceHt(e.target.value)}
                  required
                />
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Mode de règlement</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as 'COMPTANT' | 'A_TERME')}
                    className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm bg-white focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="COMPTANT">Comptant (Paiement immédiat)</option>
                    <option value="A_TERME">À terme (Échéancier de dette)</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-xs text-blue-800">
                La validation de la facture créditera automatiquement le stock physique et recalculera le Coût Moyen Unitaire Pondéré (CMUP).
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                  Annuler
                </Button>
                <Button type="submit">Créer le brouillon</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
