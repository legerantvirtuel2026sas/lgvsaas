import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export interface MaintenanceScreenProps {
  companySlug: string;
  moduleName: string;
  modulePack: string;
}

export function MaintenanceScreen({
  companySlug,
  moduleName,
  modulePack,
}: MaintenanceScreenProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-lg w-full bg-white p-8 sm:p-10 rounded-2xl border border-gray-200 text-center shadow-sm space-y-5">
        <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold border border-amber-200">
          ⚙️
        </div>

        <div>
          <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 mb-2">
            Module {modulePack} en maintenance
          </span>
          <h2 className="text-2xl font-bold text-gray-900">{moduleName}</h2>
        </div>

        <p className="text-sm text-gray-600 leading-relaxed">
          Ce module est en cours de développement. Il sera bientôt disponible dans une prochaine mise à jour de LGV SaaS.
        </p>

        <div className="pt-4">
          <Link href={`/e/${companySlug}`}>
            <Button variant="default" className="w-full">
              ← Retour au Hub des 4 activités
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
