'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { listMyCompaniesAction } from '@/server/actions/company.actions';
import { CompanyWithLicenseInfo } from '@/server/services/company.service';

export default function MyCompaniesPage() {
  const [companies, setCompanies] = React.useState<CompanyWithLicenseInfo[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await listMyCompaniesAction();
      if (!res.success) {
        setError(res.error || 'Erreur de chargement');
      } else {
        setCompanies(res.companies || []);
      }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* En-tête de l'espace Propriétaire */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-xl font-bold text-blue-600 tracking-tight">LGV SaaS</span>
            <span className="text-gray-300">|</span>
            <span className="text-sm font-semibold text-gray-700">Mes entreprises</span>
          </div>
          <div>
            <Link href="/app/entreprises/nouvelle">
              <Button size="sm">
                + Ajouter une entreprise
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Espace Propriétaire</h1>
            <p className="mt-1 text-sm text-gray-600">
              Sélectionnez une entreprise pour ouvrir son Hub d'activités ou configurez ses licences.
            </p>
          </div>
          <Link href="/app/entreprises/nouvelle">
            <Button>
              Déclarer une nouvelle entreprise
            </Button>
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center text-gray-500">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Chargement de vos entreprises...
          </div>
        ) : companies.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center max-w-lg mx-auto shadow-sm">
            <h3 className="text-lg font-bold text-gray-900">Aucune entreprise déclarée</h3>
            <p className="mt-2 text-sm text-gray-600">
              Déclarez votre première entreprise pour bénéficier automatiquement de votre essai gratuit de 7 jours.
            </p>
            <div className="mt-6">
              <Link href="/app/entreprises/nouvelle">
                <Button size="lg">
                  Ajouter mon entreprise
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((c) => {
              const lic = c.license;
              const isTrial = lic.status === 'TRIAL' && !lic.isExpired;
              const isActive = lic.status === 'ACTIVE' && !lic.isExpired;
              const isExpired = lic.isExpired || lic.status === 'EXPIRED';

              return (
                <div
                  key={c.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col justify-between hover:border-blue-300 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      {isTrial && (
                        <Badge variant="warning">
                          Essai : {lic.daysRemaining} jour{lic.daysRemaining > 1 ? 's' : ''} restant{lic.daysRemaining > 1 ? 's' : ''}
                        </Badge>
                      )}
                      {isActive && <Badge variant="success">Licence active</Badge>}
                      {isExpired && <Badge variant="destructive">Licence expirée</Badge>}

                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        {c.role}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-gray-900 leading-snug">
                      {c.tradeName || c.legalName}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">IFU : {c.ifu}</p>
                    <p className="text-xs text-gray-500">{c.address}</p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between gap-2">
                    <Link href={`/e/${c.slug}`}>
                      <Button variant="default" size="sm">
                        Ouvrir le Hub →
                      </Button>
                    </Link>
                    <Link href={`/e/${c.slug}/corp/licence`}>
                      <Button variant="outline" size="sm">
                        Licence
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
