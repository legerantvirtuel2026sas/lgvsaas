import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function LegalNoticePage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-gray-100 bg-white py-4">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-blue-600">
            LGV SaaS
          </Link>
          <Link href="/">
            <Button variant="outline" size="sm">
              ← Retour à l'accueil
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12 prose prose-slate">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-6">Mentions Légales</h1>

        <section className="space-y-4 text-sm text-gray-700 leading-relaxed">
          <h2 className="text-lg font-bold text-gray-900">1. Éditeur de la plateforme</h2>
          <p>
            La plateforme web <strong>LGV SaaS (Le Gérant Virtuel, version hébergée)</strong> est éditée et exploitée par :
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Raison sociale :</strong> ABP Technologie SARL</li>
            <li><strong>Forme juridique :</strong> Société à Responsabilité Limitée de droit béninois</li>
            <li><strong>Siège social :</strong> Cotonou, République du Bénin</li>
            <li><strong>Identifiant Fiscal Unique (IFU) :</strong> Enregistré auprès de la Direction Générale des Impôts (DGI) du Bénin</li>
            <li><strong>Registre du Commerce et du Crédit Mobilier (RCCM) :</strong> Enregistré au Tribunal de Commerce de Cotonou</li>
            <li><strong>Contact électronique :</strong> contact@abp.bj</li>
            <li><strong>Directeur de publication :</strong> Aymar DOSSOU, Gérant</li>
          </ul>

          <h2 className="text-lg font-bold text-gray-900 mt-8">2. Système de Facturation d'Entreprise (SFE)</h2>
          <p>
            LGV SaaS intègre un module de facturation normalisée interfacé avec la plateforme e-MECeF de la Direction Générale des Impôts (DGI) du Bénin. L'usage de la normalisation fiscale en production est subordonné à l'agrément SFE et à l'enregistrement individuel de chaque entreprise cliente auprès de la DGI.
          </p>

          <h2 className="text-lg font-bold text-gray-900 mt-8">3. Hébergement et Infrastructure</h2>
          <p>
            L’application web est hébergée sur l’infrastructure infogérée Vercel Inc. et les bases de données PostgreSQL sont hébergées sur des clusters haute disponibilité avec chiffrement au repos et en transit.
          </p>

          <h2 className="text-lg font-bold text-gray-900 mt-8">4. Propriété intellectuelle</h2>
          <p>
            L'ensemble des marques, logos, codes sources, architectures, interfaces logicielles et documentations associées à LGV SaaS sont la propriété exclusive d'ABP Technologie SARL. Toute reproduction totale ou partielle sans autorisation expresse est prohibée.
          </p>
        </section>
      </main>
    </div>
  );
}
