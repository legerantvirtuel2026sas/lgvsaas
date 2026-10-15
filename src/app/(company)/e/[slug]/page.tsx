import * as React from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { moduleFlagService } from '@/server/services/module-flag.service';

export default async function CompanyHubPage({
  params,
}: {
  params: { slug: string };
}) {
  const companySlug = params.slug;
  const cards = await moduleFlagService.getAllCardsWithStatus();

  return (
    <div className="space-y-8">
      {/* Titre et sous-titre du Hub */}
      <div className="border-b border-gray-200 pb-5">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          Hub des 4 Activités
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Sélectionnez une activité pour gérer vos opérations commerciales, de services ou de flotte.
        </p>
      </div>

      {/* Grille des 4 cartes d'activité */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.map((card) => {
          const isOpen = card.isOpen;
          const href = `/e/${companySlug}/${card.routePath}`;

          return (
            <div
              key={card.key}
              className={`rounded-2xl border p-6 flex flex-col justify-between transition-all shadow-sm ${
                isOpen
                  ? 'bg-white border-blue-200 hover:border-blue-400 hover:shadow-md'
                  : 'bg-gray-50 border-gray-200 opacity-90'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  {isOpen ? (
                    <Badge variant="success">Ouverte • Prête à l’usage</Badge>
                  ) : (
                    <Badge variant="warning">En maintenance</Badge>
                  )}
                  <span className="text-xs text-gray-400 font-mono">
                    Pack {card.requiredPack}
                  </span>
                </div>

                <h2 className="text-xl font-bold text-gray-900">
                  {card.title}
                </h2>

                <p className="mt-3 text-sm text-gray-600 leading-relaxed">
                  {isOpen
                    ? card.description
                    : 'Ce module est en cours de développement. Il sera bientôt disponible.'}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                <Link href={href} className="w-full">
                  <Button
                    variant={isOpen ? 'default' : 'outline'}
                    className="w-full"
                  >
                    {isOpen ? 'Accéder à l’activité →' : 'Voir le statut'}
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
