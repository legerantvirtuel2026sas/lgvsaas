'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, ColumnDef } from '@/components/data-table/data-table';
import { formatFcfa } from '@/server/domain/money';

interface DebtorRow extends Record<string, unknown> {
  id: string;
  name: string;
  phone: string;
  totalDue: number;
  oldestInvoiceDays: number;
  invoicesCount: number;
}

export default function DebtorsPage({ params }: { params: { slug: string } }) {
  const companySlug = params.slug;

  const [debtors, setDebtors] = React.useState<DebtorRow[]>([
    {
      id: 'd1',
      name: 'Établissements Alafia & Fils',
      phone: '+22996556677',
      totalDue: 450000,
      oldestInvoiceDays: 45, // 31-60 jours
      invoicesCount: 2,
    },
    {
      id: 'd2',
      name: 'Quincaillerie Centrale Bohicon',
      phone: '+22997123456',
      totalDue: 820000,
      oldestInvoiceDays: 95, // 90+ jours (très en retard !)
      invoicesCount: 3,
    },
    {
      id: 'd3',
      name: 'Boutique Sainte Rita Cotonou',
      phone: '+22995987654',
      totalDue: 180000,
      oldestInvoiceDays: 14, // 0-30 jours
      invoicesCount: 1,
    },
  ]);

  const totalOutstanding = debtors.reduce((sum, d) => sum + d.totalDue, 0);

  const columns: ColumnDef<DebtorRow>[] = [
    {
      id: 'name',
      header: 'Client Débiteur',
      accessorKey: 'name',
      sortable: true,
      cell: (row) => (
        <div>
          <div className="font-semibold text-gray-900">{row.name}</div>
          <div className="text-xs text-gray-500">{row.phone}</div>
        </div>
      ),
    },
    {
      id: 'invoicesCount',
      header: 'Factures impayées',
      accessorKey: 'invoicesCount',
      cell: (row) => <span>{row.invoicesCount} facture(s)</span>,
    },
    {
      id: 'totalDue',
      header: 'Total Dû (FCFA)',
      accessorKey: 'totalDue',
      sortable: true,
      type: 'number',
      cell: (row) => <span className="font-extrabold text-red-600">{formatFcfa(row.totalDue)}</span>,
    },
    {
      id: 'oldestInvoiceDays',
      header: 'Ancienneté max',
      accessorKey: 'oldestInvoiceDays',
      sortable: true,
      cell: (row) => {
        if (row.oldestInvoiceDays > 90) return <Badge variant="destructive">&gt; 90 jours (Critique)</Badge>;
        if (row.oldestInvoiceDays > 60) return <Badge variant="warning">61-90 jours</Badge>;
        if (row.oldestInvoiceDays > 30) return <Badge variant="warning">31-60 jours</Badge>;
        return <Badge variant="secondary">0-30 jours</Badge>;
      },
    },
    {
      id: 'actions',
      header: 'Relances',
      cell: (row) => {
        const whatsappMsg = encodeURIComponent(
          `Bonjour ${row.name}, sauf erreur de notre part, votre compte présente un encours impayé de ${formatFcfa(
            row.totalDue
          )} sur vos factures. Merci de bien vouloir nous contacter pour régulariser. Cordialement.`
        );
        const cleanPhone = row.phone.replace(/[^0-9]/g, '');

        return (
          <div className="flex items-center space-x-2">
            <a
              href={`https://wa.me/${cleanPhone}?text=${whatsappMsg}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="sm" variant="outline" className="text-xs text-green-700 border-green-300 hover:bg-green-50">
                Relance WhatsApp
              </Button>
            </a>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-5">
        <h1 className="text-2xl font-bold text-gray-900">Clients Redevables & Balance Âgée</h1>
        <p className="mt-1 text-sm text-gray-600">
          Suivi des créances commerciales, classement par ancienneté d'impayés et relances automatiques.
        </p>
      </div>

      {/* Balance âgée */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-semibold text-gray-400 uppercase">Total Créances</span>
          <div className="text-xl font-extrabold text-red-600 mt-1">{formatFcfa(totalOutstanding)}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase">0 à 30 jours</span>
          <div className="text-lg font-bold text-gray-900 mt-1">{formatFcfa(180000)}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-semibold text-amber-500 uppercase">31 à 60 jours</span>
          <div className="text-lg font-bold text-amber-600 mt-1">{formatFcfa(450000)}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-semibold text-amber-600 uppercase">61 à 90 jours</span>
          <div className="text-lg font-bold text-amber-700 mt-1">{formatFcfa(0)}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-semibold text-red-600 uppercase">&gt; 90 jours (Contentieux)</span>
          <div className="text-lg font-bold text-red-700 mt-1">{formatFcfa(820000)}</div>
        </div>
      </div>

      <DataTable columns={columns} data={debtors} />
    </div>
  );
}
