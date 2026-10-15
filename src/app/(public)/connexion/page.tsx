'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { loginAction } from '@/server/actions/auth.actions';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [twoFactorCode, setTwoFactorCode] = React.useState('');
  const [show2FA, setShow2FA] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await loginAction({
        email,
        password,
        twoFactorCode: show2FA ? twoFactorCode : undefined,
      });

      if (!res.success) {
        if (res.requires2FA) {
          setShow2FA(true);
        }
        setError(res.error || 'Erreur lors de la connexion');
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
            Connexion à votre espace
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Accédez à vos entreprises et tableaux de bord
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <Input
            label="Adresse email"
            type="email"
            placeholder="vous@entreprise.bj"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={show2FA}
          />

          <Input
            label="Mot de passe"
            type="password"
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={show2FA}
          />

          {show2FA && (
            <Input
              label="Code d’authentification à 6 chiffres (2FA TOTP)"
              type="text"
              placeholder="123456"
              maxLength={6}
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value)}
              required
              autoFocus
            />
          )}

          <div className="flex items-center justify-between text-xs">
            <Link
              href="/mot-de-passe-oublie"
              className="font-medium text-blue-600 hover:underline"
            >
              Mot de passe oublié ?
            </Link>
          </div>

          <div className="pt-2">
            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading
                ? 'Connexion en cours...'
                : show2FA
                ? 'Valider le code 2FA'
                : 'Se connecter'}
            </Button>
          </div>
        </form>

        <div className="text-center text-xs text-gray-600">
          Pas encore de compte ?{' '}
          <Link href="/inscription" className="font-semibold text-blue-600 hover:underline">
            Créer un compte (essai gratuit 7 jours)
          </Link>
        </div>
      </div>
    </div>
  );
}
