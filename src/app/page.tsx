import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Barre de navigation publique */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold text-blue-600 tracking-tight">LGV SaaS</span>
            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium border border-blue-200">
              Le Gérant Virtuel
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <Link href="/connexion">
              <Button variant="ghost" size="sm">
                Se connecter
              </Button>
            </Link>
            <Link href="/inscription">
              <Button variant="default" size="sm">
                Créer mon compte
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">
            Gérez votre entreprise en toute sérénité au Bénin
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
            La solution web multi-entreprises tout-en-un : gestion commerciale, facturation normalisée e-MECeF, stocks, créances, RH et paie conforme au Code Général des Impôts et à la CNSS.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/inscription" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto px-8">
                Démarrer un essai gratuit de 7 jours
              </Button>
            </Link>
            <Link href="/connexion" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto px-8">
                Accéder à mon espace
              </Button>
            </Link>
          </div>
        </section>

        {/* Aperçu des 4 cartes d'activité */}
        <section className="py-16 bg-gray-50 border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-center text-gray-900 mb-12">
              Un Hub d’activités conçu pour votre croissance
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="inline-block text-xs font-semibold px-2 py-1 rounded bg-green-100 text-green-800 mb-3">
                    Disponible - Ouverte
                  </span>
                  <h3 className="text-lg font-bold text-gray-900">Gestion commerciale</h3>
                  <p className="mt-2 text-sm text-gray-600">
                    Facturation normalisée e-MECeF, proformas, avoirs, TVA, AIB, suivi des stocks et des clients redevables.
                  </p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between opacity-80">
                <div>
                  <span className="inline-block text-xs font-semibold px-2 py-1 rounded bg-amber-100 text-amber-800 mb-3">
                    En développement
                  </span>
                  <h3 className="text-lg font-bold text-gray-900">Prestations & Services</h3>
                  <p className="mt-2 text-sm text-gray-600">
                    Gestion des contrats récurrents, interventions et suivi de rentabilité par mission.
                  </p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between opacity-80">
                <div>
                  <span className="inline-block text-xs font-semibold px-2 py-1 rounded bg-amber-100 text-amber-800 mb-3">
                    En développement
                  </span>
                  <h3 className="text-lg font-bold text-gray-900">Flotte & Location</h3>
                  <p className="mt-2 text-sm text-gray-600">
                    Parc automobile, contrats de location, suivi kilométrique et entretien des véhicules.
                  </p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between opacity-80">
                <div>
                  <span className="inline-block text-xs font-semibold px-2 py-1 rounded bg-purple-100 text-purple-800 mb-3">
                    Consolidation
                  </span>
                  <h3 className="text-lg font-bold text-gray-900">Consolidation d’entreprise</h3>
                  <p className="mt-2 text-sm text-gray-600">
                    Tableau de bord financier unifié regroupant l'ensemble de vos activités commerciales et de services.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Pied de page */}
      <footer className="border-t border-gray-200 bg-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
          <p>© 2026 ABP Technologie SARL - Tous droits réservés. Cotonou, Bénin.</p>
          <div className="flex space-x-6">
            <Link href="/mentions-legales" className="hover:underline">
              Mentions légales
            </Link>
            <Link href="/confidentialite" className="hover:underline">
              Politique de confidentialité (APDP)
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
