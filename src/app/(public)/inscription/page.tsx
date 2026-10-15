'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { registerAction } from '@/server/actions/auth.actions';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await registerAction({
        fullName,
        email,
        phone,
        password,
      });

      if (!res.success) {
        setError(res.error || 'Erreur lors de la création de votre compte');
      } else {
        router.push('/app/entreprises');
      }
    } catch {
      setError('Une erreur inattendue est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex justify-center">
            <span className="text-2xl font-bold text-blue-600 tracking-tight">LGV SaaS</span>
          </div>
          <h2 className="mt-4 text-center text-2xl font-bold text-gray-900">
            Créer votre compte gestionnaire
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Commencez avec un essai gratuit de 7 jours pour votre entreprise.
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <Input
            label="Nom complet ou raison sociale"
            placeholder="Aymar DOSSOU"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />

          <Input
            label="Adresse email professionnelle"
            type="email"
            placeholder="direction@entreprise.bj"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Numéro de téléphone (+229)"
            placeholder="+229 97 00 00 00"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />

          <Input
            label="Mot de passe (10 caractères minimum, majuscule, chiffre)"
            type="password"
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="pt-2">
            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading ? 'Création de votre compte...' : 'Créer mon compte'}
            </Button>
          </div>
        </form>

        <div className="text-center text-xs text-gray-600">
          Déjà un compte ?{' '}
          <Link href="/connexion" className="font-semibold text-blue-600 hover:underline">
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
}
