import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function LicensePaymentConfirmationPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { orderId?: string };
}) {
  const companySlug = params.slug;
  const orderId = searchParams.orderId || 'PENDING';

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-lg w-full bg-white p-8 sm:p-10 rounded-2xl border border-gray-200 text-center shadow-sm space-y-6">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto text-3xl font-bold border border-blue-200">
          ✓
        </div>

        <div>
          <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 mb-2">
            Notification de transaction
          </span>
          <h1 className="text-2xl font-bold text-gray-900">
            Paiement en cours de validation
          </h1>
        </div>

        <div className="text-sm text-gray-600 space-y-2 text-left bg-gray-50 p-4 rounded-xl border border-gray-100 font-mono text-xs">
          <p><span className="text-gray-400">Réf. Commande :</span> {orderId}</p>
          <p><span className="text-gray-400">Entreprise :</span> {companySlug.toUpperCase()}</p>
          <p><span className="text-gray-400">Statut réseau :</span> En attente de confirmation bancaire</p>
        </div>

        <p className="text-xs text-gray-500 leading-relaxed text-left bg-amber-50 p-3 rounded-lg border border-amber-200 text-amber-800">
          <strong>Règle de sécurité :</strong> L'activation de votre abonnement s'effectue automatiquement et instantanément dès confirmation par le webhook sécurisé de FedaPay. La facture normalisée de la plateforme vous sera transmise par email.
        </p>

        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <Link href={`/e/${companySlug}`} className="w-full">
            <Button variant="default" className="w-full">
              Retour au Hub d'activités
            </Button>
          </Link>
          <Link href={`/e/${companySlug}/corp/licence`} className="w-full">
            <Button variant="outline" className="w-full">
              Vérifier la licence
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
