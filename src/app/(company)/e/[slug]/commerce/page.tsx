import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function CommerceActivityPage({
  params,
}: {
  params: { slug: string };
}) {
  const companySlug = params.slug;

  return (
    <div className="space-y-8">
      <div className="border-b border-gray-200 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-gray-900">
              Espace Gestion Commerciale
            </h1>
            <Badge variant="success">Pack Commerce Actif</Badge>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Facturation normalisée e-MECeF, gestion des stocks, achats fournisseurs et créances clients.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Link href={`/e/${companySlug}`}>
            <Button variant="outline" size="sm">
              ← Retour au Hub
            </Button>
          </Link>
        </div>
      </div>

      {/* Raccourcis d'actions rapides */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900">Ventes & Factures</h3>
            <p className="text-xs text-gray-500 mt-1">
              Établissez des proformas, factures de vente (TVA, AIB, remise) et normalisez avec l’e-MCF.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-blue-600 font-medium">Facturation e-MECeF</span>
            <Button size="sm" variant="outline">Accéder</Button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900">Articles & Stocks</h3>
            <p className="text-xs text-gray-500 mt-1">
              Catalogue de produits, seuils d'alerte de réapprovisionnement et valorisation au coût moyen.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-blue-600 font-medium">Mouvements de stock</span>
            <Button size="sm" variant="outline">Accéder</Button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900">Clients redevables</h3>
            <p className="text-xs text-gray-500 mt-1">
              Suivi des factures à terme, échéancier, balance âgée et relances par email / WhatsApp.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-blue-600 font-medium">Créances clients</span>
            <Button size="sm" variant="outline">Accéder</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
