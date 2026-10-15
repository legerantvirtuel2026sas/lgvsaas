import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function PrivacyPolicyPage() {
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
        <h1 className="text-3xl font-extrabold text-gray-900 mb-6">
          Politique de Confidentialité et Protection des Données Personnelles
        </h1>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 mb-8">
          <strong>Conformité béninoise :</strong> La présente politique est rédigée en conformité avec la loi n° 2017-20 portant Code du numérique en République du Bénin et sous l'autorité de l'Autorité de Protection des Données Personnelles (APDP).
        </div>

        <section className="space-y-4 text-sm text-gray-700 leading-relaxed">
          <h2 className="text-lg font-bold text-gray-900">1. Responsable de traitement</h2>
          <p>
            Le responsable de traitement des données de la plateforme est <strong>ABP Technologie SARL</strong>. Pour les données commerciales, salariales et fiscales hébergées par chaque entreprise cliente (données tiers), ABP Technologie SARL agit en qualité de sous-traitant technique.
          </p>

          <h2 className="text-lg font-bold text-gray-900 mt-8">2. Données collectées et finalités</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Données de compte utilisateur :</strong> Nom, adresse email, numéro de téléphone (+229), hachage cryptographique du mot de passe (Argon2id/scrypt), journaux de connexion et adresses IP (sécurité et détection des fraudes).</li>
            <li><strong>Données des entreprises clientes :</strong> Raison sociale, IFU, RCCM, adresses, contacts commerciaux, fiches clients et fournisseurs.</li>
            <li><strong>Données fiscales et de facturation :</strong> Lignes de factures, TVA 18%, AIB, jetons d'accès e-MECeF (chiffrés en AES-256-GCM), signatures électroniques et codes MECeF/DGI.</li>
            <li><strong>Données RH et de paie :</strong> Noms des salariés, matricules, immatriculations CNSS, salaires de base, retenues ITS et bulletins de paie (protégés par des droits stricts et chiffrés pour les champs sensibles).</li>
          </ul>

          <h2 className="text-lg font-bold text-gray-900 mt-8">3. Durée de conservation légale</h2>
          <p>
            Conformément à l’Acte Uniforme OHADA portant organisation du droit commercial général et aux dispositions fiscales de la République du Bénin :
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Les factures de vente et d'achat, pièces comptables et justificatifs sont conservés pendant une durée minimale de <strong>10 ans</strong>.</li>
            <li>Les données d'audit de sécurité (`audit_log`) sont conservées en ajout seul pour une traçabilité intégrale.</li>
            <li>À l'expiration d'une licence, les données restent conservées en lecture seule et ne sont jamais supprimées automatiquement afin de garantir les obligations comptables du client.</li>
          </ul>

          <h2 className="text-lg font-bold text-gray-900 mt-8">4. Droits des personnes et formalités APDP</h2>
          <p>
            Tout utilisateur ou salarié dispose des droits d'accès, d'information, de rectification et d'opposition, sous réserve des obligations légales de conservation des pièces comptables et fiscales. Ces demandes peuvent être adressées par écrit à <code>dpo@abp.bj</code> ou auprès de l'APDP Bénin.
          </p>
        </section>
      </main>
    </div>
  );
}
