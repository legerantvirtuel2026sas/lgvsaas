'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Ne pas exposer les traces sensibles côté client
    console.error('Erreur interceptée :', error.message);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center bg-white p-8 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
          !
        </div>
        <h2 className="text-xl font-bold text-gray-900">Une erreur inattendue est survenue</h2>
        <p className="text-sm text-gray-600">
          Nous n'avons pas pu charger cette page. Vos données sont préservées en toute sécurité.
        </p>
        <div className="pt-2">
          <Button onClick={() => reset()} className="w-full">
            Réessayer
          </Button>
        </div>
      </div>
    </div>
  );
}
