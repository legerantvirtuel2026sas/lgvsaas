'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatFcfa } from '@/server/domain/money';

export default function DashboardCommercePage({ params }: { params: { slug: string } }) {
  const companySlug = params.slug;

  return (
    <div className="space-y-8">
      <div className="border-b border-gray-200 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de Bord Commercial</h1>
          <p className="mt-1 text-sm text-gray-600">
            Indicateurs clés d’activité en temps réel, alertes de réapprovisionnement et trésorerie.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link href={`/e/${companySlug}/commerce/statistiques`}>
            <Button variant="outline" size="sm">
              Statistiques détaillées →
            </Button>
          </Link>
          <Link href={`/e/${companySlug}/commerce/ventes`}>
            <Button size="sm">
              + Nouvelle vente
            </Button>
          </Link>
        </div>
      </div>

      {/* Cartes KPIs Chiffre d'affaires & Créances */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-semibold uppercase text-gray-400">Chiffre d’affaires du jour</span>
          <div className="text-2xl font-black text-gray-900 mt-1">{formatFcfa(416500)}</div>
          <span className="text-xs text-green-600 font-medium">1 facture normalisée e-MCF</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-semibold uppercase text-gray-400">CA du mois en cours</span>
          <div className="text-2xl font-black text-blue-600 mt-1">{formatFcfa(636650)}</div>
          <span className="text-xs text-blue-600">Marge brute : {formatFcfa(185000)}</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-semibold uppercase text-red-500">Créances clients (Impayés)</span>
          <div className="text-2xl font-black text-red-600 mt-1">{formatFcfa(220150)}</div>
          <Link href={`/e/${companySlug}/commerce/redevables`} className="text-xs text-red-600 hover:underline">
            Voir les redevables →
          </Link>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-semibold uppercase text-amber-500">Alertes de Stock</span>
          <div className="text-2xl font-black text-amber-600 mt-1">1 en alerte</div>
          <Link href={`/e/${companySlug}/commerce/articles`} className="text-xs text-amber-600 hover:underline">
            Vérifier le stock →
          </Link>
        </div>
      </div>

      {/* Raccourcis et Dernières opérations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-gray-900">Top Articles Vendus</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <span className="font-semibold text-gray-900">Rame de Papier A4 80g Double A</span>
                <p className="text-xs text-gray-400">SKU: RAM-A4-80G</p>
              </div>
              <div className="text-right">
                <span className="font-bold text-gray-900">100 unités</span>
                <p className="text-xs text-blue-600">{formatFcfa(350000)}</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-gray-900">Cartouche Toner Laser HP 85A</span>
                <p className="text-xs text-gray-400">SKU: TONER-HP-85A</p>
              </div>
              <div className="text-right">
                <span className="font-bold text-gray-900">10 unités</span>
                <p className="text-xs text-blue-600">{formatFcfa(185000)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-gray-900">Répartition des Encaissements</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Espèces (Guichet)</span>
              <span className="font-bold text-gray-900">{formatFcfa(250000)} (60%)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Mobile Money (MTN MoMo / Moov)</span>
              <span className="font-bold text-gray-900">{formatFcfa(166500)} (40%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
