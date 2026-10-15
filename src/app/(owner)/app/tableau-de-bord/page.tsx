'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatFcfa } from '@/server/domain/money';

interface CompanyRow {
  id: string;
  slug: string;
  name: string;
  licenseStatus: string;
  caMonth: number;
  receivables: number;
  stockValuation: number;
  employees: number;
}

export default function ConsolidatedDashboardPage() {
  const [companies, setCompanies] = React.useState<CompanyRow[]>([
    {
      id: 'comp_1',
      slug: 'abp-technologie-sarl',
      name: 'ABP Technologie SARL',
      licenseStatus: 'ACTIVE',
      caMonth: 636650,
      receivables: 220150,
      stockValuation: 460000,
      employees: 3,
    },
    {
      id: 'comp_2',
      slug: 'benin-fournitures-express',
      name: 'Bénin Fournitures Express',
      licenseStatus: 'TRIAL',
      caMonth: 412000,
      receivables: 85000,
      stockValuation: 320000,
      employees: 2,
    },
  ]);

  const grandTotalCa = companies.reduce((sum, c) => sum + c.caMonth, 0);
  const grandTotalReceivables = companies.reduce((sum, c) => sum + c.receivables, 0);
  const grandTotalStock = companies.reduce((sum, c) => sum + c.stockValuation, 0);
  const grandTotalEmployees = companies.reduce((sum, c) => sum + c.employees, 0);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* En-tête Espace Propriétaire */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-xl font-bold text-blue-600 tracking-tight">LGV SaaS</span>
            <span className="text-gray-300">|</span>
            <span className="text-sm font-semibold text-gray-700">Tableau de Bord Consolidé</span>
          </div>
          <div className="flex items-center space-x-3">
            <Link href="/app/entreprises">
              <Button variant="outline" size="sm">
                Mes entreprises
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Synthèse Consolidée Multi-Entreprises</h1>
          <p className="mt-1 text-sm text-gray-600">
            Vision financière globale regroupant les indicateurs agrégés de toutes les entreprises dont vous êtes propriétaire.
          </p>
        </div>

        {/* Cartes des Grands Totaux Consolidés */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-xs font-semibold text-gray-400 uppercase">Chiffre d’affaires consolidé (Mois)</span>
            <div className="text-2xl font-black text-blue-600 mt-1">{formatFcfa(grandTotalCa)}</div>
            <span className="text-xs text-gray-500">{companies.length} entreprises actives</span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-xs font-semibold text-red-500 uppercase">Créances clients globales</span>
            <div className="text-2xl font-black text-red-600 mt-1">{formatFcfa(grandTotalReceivables)}</div>
            <span className="text-xs text-red-600">Encours impayés cumulés</span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-xs font-semibold text-gray-400 uppercase">Valeur globale des stocks</span>
            <div className="text-2xl font-black text-gray-900 mt-1">{formatFcfa(grandTotalStock)}</div>
            <span className="text-xs text-green-600 font-medium">Valorisation au CMUP</span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-xs font-semibold text-gray-400 uppercase">Effectif global</span>
            <div className="text-2xl font-black text-gray-900 mt-1">{grandTotalEmployees} salariés</div>
            <span className="text-xs text-gray-500">Masse salariale consolidée</span>
          </div>
        </div>

        {/* Tableau comparatif par entreprise */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden space-y-3 p-5">
          <h2 className="text-base font-bold text-gray-900">Détail par Entreprise</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-700 border-b">
                <tr>
                  <th className="px-4 py-3">Entreprise</th>
                  <th className="px-4 py-3">Licence</th>
                  <th className="px-4 py-3 text-right">CA Mensuel</th>
                  <th className="px-4 py-3 text-right">Créances</th>
                  <th className="px-4 py-3 text-right">Stock (CMUP)</th>
                  <th className="px-4 py-3 text-center">Salariés</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {companies.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-4 font-bold text-gray-900">{c.name}</td>
                    <td className="px-4 py-4">
                      <Badge variant={c.licenseStatus === 'ACTIVE' ? 'success' : 'warning'}>
                        {c.licenseStatus === 'ACTIVE' ? 'Active' : 'Essai'}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-right font-semibold text-gray-900">{formatFcfa(c.caMonth)}</td>
                    <td className="px-4 py-4 text-right font-semibold text-red-600">{formatFcfa(c.receivables)}</td>
                    <td className="px-4 py-4 text-right text-gray-700">{formatFcfa(c.stockValuation)}</td>
                    <td className="px-4 py-4 text-center">{c.employees}</td>
                    <td className="px-4 py-4 text-right">
                      <Link href={`/e/${c.slug}`}>
                        <Button size="sm" variant="outline" className="text-xs">
                          Ouvrir Hub →
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
