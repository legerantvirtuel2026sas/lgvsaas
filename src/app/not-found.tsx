import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center bg-white p-8 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <h2 className="text-3xl font-extrabold text-blue-600">404</h2>
        <h3 className="text-lg font-bold text-gray-900">Page introuvable</h3>
        <p className="text-sm text-gray-600">
          La page que vous recherchez n'existe pas ou a été déplacée.
        </p>
        <div className="pt-2">
          <Link href="/">
            <Button variant="default" className="w-full">
              Retour à l'accueil
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
