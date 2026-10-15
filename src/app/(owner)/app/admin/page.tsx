'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { manualActivateLicenseAction } from '@/server/actions/license.actions';
import { PlanCode, PackCode } from '@/server/domain/pricing';

export default function SuperAdminPage() {
  const [companyId, setCompanyId] = React.useState('');
  const [selectedPlan, setSelectedPlan] = React.useState<PlanCode>('PRO');
  const [justification, setJustification] = React.useState('');
  const [twoFactorCode, setTwoFactorCode] = React.useState('');
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleManualActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!twoFactorCode || twoFactorCode.length !== 6) {
      setError('Code d’authentification 2FA obligatoire pour valider cette opération administrateur.');
      return;
    }

    setLoading(true);
    try {
      const res = await manualActivateLicenseAction(
        companyId,
        selectedPlan,
        ['COMMERCE'] as PackCode[],
        `${justification} (Validé par 2FA: ${twoFactorCode})`
      );

      if (!res.success) {
        setError(res.error || 'Erreur lors de l’activation manuelle');
      } else {
        setMessage('Licence annuelle activée avec succès pour cette entreprise (+12 mois).');
        setCompanyId('');
        setJustification('');
        setTwoFactorCode('');
      }
    } catch {
      setError('Une erreur inattendue est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between border-b border-gray-200 pb-5">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold text-red-600">Back-Office Super-Admin</span>
              <Badge variant="destructive">Accès Restreint 2FA</Badge>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Supervision des licences, drapeaux de cartes et activations manuelles hors-ligne.
            </p>
          </div>
          <Link href="/app/entreprises">
            <Button variant="outline" size="sm">
              Retour à l’espace utilisateur
            </Button>
          </Link>
        </div>

        {message && (
          <div className="rounded-lg bg-green-50 p-4 border border-green-200 text-sm text-green-800">
            {message}
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 p-4 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Activation manuelle protégée */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm space-y-5">
            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">
              Activation manuelle de licence (Hors-ligne)
            </h2>
            <p className="text-xs text-gray-500">
              Réservé aux règlements par virement bancaire ou espèces. Chaque activation est tracée de manière permanente dans le journal d'audit.
            </p>

            <form onSubmit={handleManualActivation} className="space-y-4">
              <Input
                label="Identifiant Entreprise (ID ou Slug)"
                placeholder="Ex: comp_xxxx ou slug-entreprise"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                required
              />

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Plan annuel souscrit
                </label>
                <select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value as PlanCode)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ESSENTIEL">Essentiel (2 utilisateurs)</option>
                  <option value="PRO">Pro (5 utilisateurs)</option>
                  <option value="ENTREPRISE">Entreprise (10 utilisateurs)</option>
                </select>
              </div>

              <Input
                label="Justification administrative obligatoire (N° virement / reçu)"
                placeholder="Réf: Virement BOA N° 987452 du 14/10/2026"
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                required
              />

              <Input
                label="Code 2FA Administrateur (Obligatoire)"
                placeholder="123456"
                maxLength={6}
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                required
              />

              <Button type="submit" disabled={loading} variant="destructive" className="w-full">
                {loading ? 'Validation en cours...' : 'Activer la licence pour 12 mois'}
              </Button>
            </form>
          </div>

          {/* État des drapeaux de cartes de la plateforme */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm space-y-5">
            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">
              Drapeaux des 4 Cartes d’Activité
            </h2>
            <p className="text-xs text-gray-500">
              L'état OPEN ou MAINTENANCE pilote l'accès global sans redéploiement applicatif.
            </p>

            <div className="space-y-3">
              <div className="p-3 border rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-semibold text-sm text-gray-900">Gestion commerciale</span>
                  <p className="text-xs text-gray-500">Ventes, achats, facturation e-MECeF, stock</p>
                </div>
                <Badge variant="success">OPEN</Badge>
              </div>

              <div className="p-3 border rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-semibold text-sm text-gray-900">Prestations & Services</span>
                  <p className="text-xs text-gray-500">Contrats de service, missions récurrentes</p>
                </div>
                <Badge variant="warning">MAINTENANCE</Badge>
              </div>

              <div className="p-3 border rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-semibold text-sm text-gray-900">Flotte & Location</span>
                  <p className="text-xs text-gray-500">Gestion de véhicules et locations</p>
                </div>
                <Badge variant="warning">MAINTENANCE</Badge>
              </div>

              <div className="p-3 border rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-semibold text-sm text-gray-900">Consolidation d’activité</span>
                  <p className="text-xs text-gray-500">Synthèse multi-packs de l’entreprise</p>
                </div>
                <Badge variant="warning">MAINTENANCE</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
