'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlanCode, PackCode, PLANS_CATALOG, calculateAnnualSubscriptionPrice } from '@/server/domain/pricing';
import { orderLicenseAction } from '@/server/actions/license.actions';
import { formatFcfa } from '@/server/domain/money';

export default function CompanyLicensePage({ params }: { params: { slug: string } }) {
  const companySlug = params.slug;
  const [selectedPlan, setSelectedPlan] = React.useState<PlanCode>('PRO');
  const [selectedPacks, setSelectedPacks] = React.useState<PackCode[]>(['COMMERCE']);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Recalcul en temps réel côté client pour affichage (re-validé strictement côté serveur à la commande)
  const pricing = React.useMemo(() => {
    try {
      return calculateAnnualSubscriptionPrice(selectedPlan, selectedPacks, ['COMMERCE']);
    } catch {
      return null;
    }
  }, [selectedPlan, selectedPacks]);

  const handleOrder = async () => {
    setError(null);
    setLoading(true);

    try {
      // Pour la démonstration, companyId simulé depuis le slug
      const res = await orderLicenseAction(companySlug, selectedPlan, selectedPacks);
      if (!res.success) {
        setError(res.error || 'Erreur lors de l’initialisation du paiement');
      } else if (res.paymentUrl) {
        // Redirection vers le guichet de paiement FedaPay
        window.location.href = res.paymentUrl;
      }
    } catch {
      setError('Une erreur inattendue est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="border-b border-gray-200 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Licence & Abonnement</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gérez votre abonnement annuel LGV SaaS et débloquez l’accès illimité pour votre équipe.
          </p>
        </div>
        <Link href={`/e/${companySlug}`}>
          <Button variant="outline" size="sm">
            ← Retour au Hub
          </Button>
        </Link>
      </div>

      {/* État actuel de la licence */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold uppercase text-gray-500">Statut actuel :</span>
            <Badge variant="warning">Essai gratuit de 7 jours</Badge>
          </div>
          <p className="text-sm font-bold text-gray-900 mt-2">
            Formule Pro (5 postes de travail inclus)
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Période de test active • Normalisation e-MECeF en mode bac à sable
          </p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-amber-600">6 jours</span>
          <p className="text-xs text-gray-500">restants avant expiration</p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Choix du Plan annuel */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900">1. Choisissez votre plan annuel (12 mois)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(Object.keys(PLANS_CATALOG) as PlanCode[]).map((pCode) => {
            const plan = PLANS_CATALOG[pCode];
            const isSelected = selectedPlan === pCode;

            return (
              <div
                key={pCode}
                onClick={() => setSelectedPlan(pCode)}
                className={`cursor-pointer rounded-xl border p-5 flex flex-col justify-between transition-all ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/30 ring-2 ring-blue-500 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-900">{plan.name}</h3>
                    <Badge variant={isSelected ? 'default' : 'secondary'}>
                      {plan.seats} utilisateurs
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-3 font-medium">
                    Support : {plan.supportDelay}
                  </p>
                  <p className="text-xs text-gray-600 mt-2 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                    {plan.onboarding}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100 text-xs font-semibold text-blue-600">
                  {isSelected ? '✓ Plan sélectionné' : 'Cliquer pour choisir'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Choix des packs métiers */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900">2. Packs métiers inclus</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="border border-blue-300 bg-blue-50/40 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="font-bold text-gray-900 text-sm">Pack Gestion commerciale</span>
              <p className="text-xs text-gray-500">Facturation e-MECeF, stock, achats, ventes, créances</p>
            </div>
            <Badge variant="success">Inclus</Badge>
          </div>

          <div className="border border-gray-200 bg-gray-50/60 p-4 rounded-xl opacity-75 flex items-center justify-between">
            <div>
              <span className="font-bold text-gray-600 text-sm">Services & Flotte</span>
              <p className="text-xs text-gray-400">En cours de développement (bientôt disponible)</p>
            </div>
            <Badge variant="warning">Maintenance</Badge>
          </div>
        </div>
      </div>

      {/* Récapitulatif et Paiement FedaPay */}
      {pricing && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-gray-900">3. Récapitulatif de votre commande</h2>

          <div className="space-y-2 text-sm text-gray-600 border-b border-gray-100 pb-4">
            <div className="flex justify-between">
              <span>Abonnement annuel Plan {selectedPlan} (12 mois)</span>
              <span className="font-medium text-gray-900">{formatFcfa(pricing.totalTtc)} TTC</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Montant Hors Taxes (HT)</span>
              <span>{formatFcfa(pricing.totalHt)} HT</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>TVA (18% légale Bénin)</span>
              <span>{formatFcfa(pricing.totalVat)}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Net à payer :</span>
              <div className="text-3xl font-extrabold text-blue-600">
                {formatFcfa(pricing.totalTtc)} TTC
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Paiement Mobile Money (MTN MoMo, Moov Money, Celtiis Cash) ou Carte bancaire via FedaPay
              </p>
            </div>

            <Button
              size="lg"
              onClick={handleOrder}
              disabled={loading}
              className="px-8 bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Connexion à FedaPay...' : 'Procéder au paiement en ligne →'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
