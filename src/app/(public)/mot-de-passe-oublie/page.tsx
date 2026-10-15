'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulation d'envoi d'email de réinitialisation sécurisé
    setTimeout(() => {
      setSubmitted(true);
      setLoading(false);
    }, 600);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-center text-2xl font-bold text-gray-900">
            Réinitialisation du mot de passe
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Saisissez votre adresse email pour recevoir les instructions de récupération.
          </p>
        </div>

        {submitted ? (
          <div className="rounded-md bg-green-50 p-4 border border-green-200 text-sm text-green-800 space-y-3">
            <p>
              Si un compte est associé à <strong>{email}</strong>, un lien sécurisé de réinitialisation vient d'être envoyé.
            </p>
            <div className="pt-2 text-center">
              <Link href="/connexion">
                <Button variant="outline" size="sm">
                  Retour à la connexion
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <Input
              label="Adresse email"
              type="email"
              placeholder="vous@entreprise.bj"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div className="pt-2">
              <Button type="submit" disabled={loading} className="w-full" size="lg">
                {loading ? 'Envoi en cours...' : 'Envoyer le lien de réinitialisation'}
              </Button>
            </div>
          </form>
        )}

        <div className="text-center text-xs text-gray-600">
          <Link href="/connexion" className="text-blue-600 hover:underline">
            Retour à l'écran de connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
