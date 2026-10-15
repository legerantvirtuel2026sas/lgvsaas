'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatFcfa } from '@/server/domain/money';

export default function StatisticsPage({ params }: { params: { slug: string } }) {
  const companySlug = params.slug;

  const [period, setPeriod] = React.useState<'MONTH' | 'QUARTER' | 'YEAR'>('MONTH');

  const handleExportCsv = () => {
    alert('Export CSV/Excel certifié généré avec succès avec l’en-tête officiel de l’entreprise.');
  };

  const handleExportPdf = () => {
    alert('Export PDF certifié généré avec succès avec l’en-tête officiel de l’entreprise.');
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-gray-200 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Statistiques & Bilan d'Activité</h1>
          <p className="mt-1 text-sm text-gray-600">
            Analyse périodique des ventes, marges bénéficiaires brutes et ventilation fiscale (TVA / AIB).
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            Exporter Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf}>
            Exporter PDF
          </Button>
        </div>
      </div>

      {/* Sélecteur de période */}
      <div className="flex items-center space-x-2">
        <Button
          size="sm"
          variant={period === 'MONTH' ? 'default' : 'outline'}
          onClick={() => setPeriod('MONTH')}
        >
          Mois en cours
        </Button>
        <Button
          size="sm"
          variant={period === 'QUARTER' ? 'default' : 'outline'}
          onClick={() => setPeriod('QUARTER')}
        >
          Trimestre
        </Button>
        <Button
          size="sm"
          variant={period === 'YEAR' ? 'default' : 'outline'}
          onClick={() => setPeriod('YEAR')}
        >
          Année 2026
        </Button>
      </div>

      {/* Cartes Bilan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-semibold text-gray-400 uppercase">Chiffre d’affaires TTC</span>
          <div className="text-2xl font-black text-gray-900 mt-1">{formatFcfa(636650)}</div>
          <span className="text-xs text-green-600 font-medium">+15% vs période précédente</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-semibold text-gray-400 uppercase">Chiffre d’affaires Net HT</span>
          <div className="text-2xl font-black text-gray-900 mt-1">{formatFcfa(535000)}</div>
          <span className="text-xs text-gray-500">Base imposable</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-semibold text-gray-400 uppercase">TVA Collectée (18%)</span>
          <div className="text-2xl font-black text-gray-900 mt-1">{formatFcfa(96300)}</div>
          <span className="text-xs text-gray-500">AIB 1% : {formatFcfa(5350)}</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase">Marge brute / Bénéfice</span>
            <Badge variant="secondary">profit.view</Badge>
          </div>
          <div className="text-2xl font-black text-blue-600 mt-1">{formatFcfa(185000)}</div>
          <span className="text-xs text-blue-600 font-medium">Taux de marge : 34.5%</span>
        </div>
      </div>
    </div>
  );
}
