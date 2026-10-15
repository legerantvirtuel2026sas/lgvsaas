'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createCompanyAction } from '@/server/actions/company.actions';

export default function NewCompanyPage() {
  const router = useRouter();
  const [legalName, setLegalName] = React.useState('');
  const [tradeName, setTradeName] = React.useState('');
  const [ifu, setIfu] = React.useState('');
  const [rccm, setRccm] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [sector, setSector] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await createCompanyAction({
        legalName,
        tradeName: tradeName || undefined,
        ifu: ifu.trim(),
        rccm: rccm || undefined,
        address,
        phone,
        email,
        sector: sector || undefined,
      });

      if (!res.success) {
        setError(res.error || 'Erreur lors de la création de l’entreprise');
      } else if (res.company) {
        router.push(`/e/${res.company.slug}`);
      }
    } catch {
      setError('Une erreur inattendue est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto w-full space-y-8 bg-white p-8 sm:p-10 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Déclarer une entreprise</h1>
            <p className="mt-1 text-sm text-gray-600">
              Chaque entreprise dispose de son propre espace étanche, de ses utilisateurs et de son essai de 7 jours.
            </p>
          </div>
          <Link href="/app/entreprises">
            <Button variant="ghost" size="sm">
              Annuler
            </Button>
          </Link>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Raison sociale (officielle)"
              placeholder="ABP Technologie SARL"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              required
            />
            <Input
              label="Nom commercial (optionnel)"
              placeholder="ABP Tech"
              value={tradeName}
              onChange={(e) => setTradeName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Numéro IFU (13 chiffres béninois)"
              placeholder="0202612345678"
              value={ifu}
              onChange={(e) => setIfu(e.target.value)}
              maxLength={13}
              required
            />
            <Input
              label="Numéro RCCM (optionnel)"
              placeholder="RB/COT/2026/B/1234"
              value={rccm}
              onChange={(e) => setRccm(e.target.value)}
            />
          </div>

          <Input
            label="Adresse géographique du siège"
            placeholder="Cotonou, Quartier Haie Vive, Rue 350"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Téléphone de l’entreprise"
              placeholder="+229 97 00 00 00"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <Input
              label="Email de l’entreprise"
              type="email"
              placeholder="contact@abp.bj"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <Input
            label="Secteur d’activité (optionnel)"
            placeholder="Commerce général, prestations informatiques, etc."
            value={sector}
            onChange={(e) => setSector(e.target.value)}
          />

          <div className="rounded-lg bg-blue-50 p-4 border border-blue-100 text-xs text-blue-800 space-y-1">
            <p className="font-semibold">Information relative à l'essai gratuit :</p>
            <p>
              Un essai gratuit de 7 jours complet (équivalent Plan Pro, 5 utilisateurs) est automatiquement déclenché pour toute entreprise disposant d'un IFU n'ayant pas encore bénéficié d'un essai sur la plateforme.
            </p>
          </div>

          <div className="pt-4 flex items-center justify-end space-x-3">
            <Link href="/app/entreprises">
              <Button type="button" variant="outline">
                Retour
              </Button>
            </Link>
            <Button type="submit" disabled={loading} size="lg">
              {loading ? 'Création en cours...' : 'Créer l’entreprise et démarrer l’essai'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
