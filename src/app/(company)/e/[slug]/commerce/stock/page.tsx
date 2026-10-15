'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DataTable, ColumnDef } from '@/components/data-table/data-table';
import { formatFcfa } from '@/server/domain/money';

interface MovementRow extends Record<string, unknown> {
  id: string;
  date: string;
  type: 'IN' | 'OUT' | 'ADJUST' | 'RETURN';
  sku: string;
  productName: string;
  quantity: number;
  unitCost: number;
  reason: string;
}

export default function StockMovementsPage({ params }: { params: { slug: string } }) {
  const companySlug = params.slug;

  const [movements, setMovements] = React.useState<MovementRow[]>([
    {
      id: 'mov_1',
      date: '15/10/2026 09:30',
      type: 'IN',
      sku: 'RAM-A4-80G',
      productName: 'Rame de Papier A4 80g Double A',
      quantity: 100,
      unitCost: 2600,
      reason: 'Facture d’achat FA-2026-0042',
    },
    {
      id: 'mov_2',
      date: '15/10/2026 10:15',
      type: 'OUT',
      sku: 'TONER-HP-85A',
      productName: 'Cartouche Toner Laser HP 85A',
      quantity: -2,
      unitCost: 12500,
      reason: 'Vente client FV-2026-0089',
    },
    {
      id: 'mov_3',
      date: '15/10/2026 11:00',
      type: 'ADJUST',
      sku: 'RAM-A4-80G',
      productName: 'Rame de Papier A4 80g Double A',
      quantity: -1,
      unitCost: 2600,
      reason: 'Ajustement inventaire : rame endommagée lors du déchargement',
    },
  ]);

  const [showAdjustModal, setShowAdjustModal] = React.useState(false);
  const [adjustSku, setAdjustSku] = React.useState('RAM-A4-80G');
  const [adjustQty, setAdjustQty] = React.useState('');
  const [adjustReason, setAdjustReason] = React.useState('');

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(adjustQty, 10);
    if (!qty || !adjustReason.trim()) return;

    const newMov: MovementRow = {
      id: `mov_${Date.now()}`,
      date: new Date().toLocaleDateString('fr-BJ', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      type: 'ADJUST',
      sku: adjustSku,
      productName: 'Article sélectionné',
      quantity: qty,
      unitCost: 2600,
      reason: adjustReason.trim(),
    };

    setMovements([newMov, ...movements]);
    setShowAdjustModal(false);
    setAdjustQty('');
    setAdjustReason('');
  };

  const columns: ColumnDef<MovementRow>[] = [
    {
      id: 'date',
      header: 'Date & Heure',
      accessorKey: 'date',
      sortable: true,
      cell: (row) => <span className="text-xs text-gray-500 font-mono">{row.date}</span>,
    },
    {
      id: 'type',
      header: 'Type',
      accessorKey: 'type',
      cell: (row) => {
        const variants: Record<string, 'success' | 'destructive' | 'warning' | 'default'> = {
          IN: 'success',
          OUT: 'default',
          ADJUST: 'warning',
          RETURN: 'secondary' as unknown as 'default',
        };
        const labels: Record<string, string> = {
          IN: 'Entrée (Achat)',
          OUT: 'Sortie (Vente)',
          ADJUST: 'Ajustement',
          RETURN: 'Retour/Avoir',
        };
        return <Badge variant={variants[row.type] || 'default'}>{labels[row.type] || row.type}</Badge>;
      },
    },
    {
      id: 'sku',
      header: 'Réf. SKU',
      accessorKey: 'sku',
      cell: (row) => <span className="font-mono text-xs font-bold text-gray-900">{row.sku}</span>,
    },
    {
      id: 'productName',
      header: 'Article',
      accessorKey: 'productName',
      cell: (row) => <span className="text-gray-900 font-medium">{row.productName}</span>,
    },
    {
      id: 'quantity',
      header: 'Quantité',
      accessorKey: 'quantity',
      sortable: true,
      type: 'number',
      cell: (row) => (
        <span className={`font-bold font-mono ${row.quantity < 0 ? 'text-red-600' : 'text-green-600'}`}>
          {row.quantity > 0 ? `+${row.quantity}` : row.quantity}
        </span>
      ),
    },
    {
      id: 'reason',
      header: 'Motif / Justification',
      accessorKey: 'reason',
      cell: (row) => <span className="text-xs text-gray-600">{row.reason}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mouvements de Stock & Inventaire</h1>
          <p className="mt-1 text-sm text-gray-600">
            Journal immuable de tous les mouvements d'entrées, sorties et ajustements avec motif.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={() => setShowAdjustModal(true)} variant="outline">
            Ajustement / Correction
          </Button>
          <Link href={`/e/${companySlug}/commerce/articles`}>
            <Button>Voir le catalogue</Button>
          </Link>
        </div>
      </div>

      {/* Cartes d'indicateurs de stock */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-semibold text-gray-400 uppercase">Valeur du stock (CMUP)</span>
          <div className="text-2xl font-black text-gray-900 mt-1">{formatFcfa(460000)}</div>
          <span className="text-xs text-green-600 font-medium">128 unités en stock</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-semibold text-gray-400 uppercase">Articles en catalogue</span>
          <div className="text-2xl font-black text-gray-900 mt-1">3 références</div>
          <span className="text-xs text-gray-500">1 dépôt principal</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-semibold text-amber-500 uppercase">Sous seuil d’alerte</span>
          <div className="text-2xl font-black text-amber-600 mt-1">1 article</div>
          <span className="text-xs text-amber-600">Réapprovisionnement requis</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-semibold text-red-500 uppercase">Ruptures de stock</span>
          <div className="text-2xl font-black text-red-600 mt-1">1 article</div>
          <span className="text-xs text-red-600">Vente bloquée</span>
        </div>
      </div>

      <DataTable columns={columns} data={movements} />

      {/* Modal d'ajustement */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Ajustement manuel d'inventaire</h3>
            <p className="text-xs text-gray-500">
              Chaque correction modifie directement le stock dérivé et exige un motif explicite d'audit.
            </p>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <Input
                label="Référence Article (SKU) *"
                value={adjustSku}
                onChange={(e) => setAdjustSku(e.target.value)}
                required
              />

              <Input
                label="Quantité d'ajustement (+ ou -) *"
                type="number"
                placeholder="Ex: -2 pour une perte, +5 pour un surplus"
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                required
              />

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Motif obligatoire de la correction *
                </label>
                <textarea
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Ex: Casse lors du rayonnage, écart de comptage physique..."
                  className="w-full p-2.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500"
                  rows={3}
                  required
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowAdjustModal(false)}>
                  Annuler
                </Button>
                <Button type="submit">Valider l'ajustement</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
