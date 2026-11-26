'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { registerAction } from '@/server/actions/auth.actions';
import { Eye, EyeOff, CheckCircle2, XCircle, AlertCircle, ShieldCheck } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  // Critères de mot de passe en temps réel
  const hasMinLength = password.length >= 10;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const isPasswordComplex = hasMinLength && hasUpper && hasLower && hasNumber;

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Vérification de la correspondance des deux mots de passe
    if (password !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas. Veuillez vérifier votre saisie.');
      return;
    }

    // Vérification de la complexité
    if (!isPasswordComplex) {
      setError('Le mot de passe doit comporter au moins 10 caractères et contenir au moins une majuscule, une minuscule et un chiffre.');
      return;
    }

    setLoading(true);

    try {
      const res = await registerAction({
        fullName,
        email,
        phone,
        password,
      });

      if (!res.success) {
        setError(res.error || 'Erreur lors de la création de votre compte.');
      } else {
        router.push('/app/entreprises');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Une erreur inattendue est survenue.';
      setError(`Erreur lors de la communication avec le serveur : ${message}`);
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
          <div className="rounded-lg bg-red-50 p-4 border border-red-200 text-sm text-red-800 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-red-900">Échec de l'inscription</p>
              <p className="text-red-700">{error}</p>
              {error.includes('existe déjà') && (
                <div className="pt-1">
                  <Link href="/connexion" className="text-xs font-semibold text-blue-700 underline hover:text-blue-900">
                    Se connecter avec cet email &rarr;
                  </Link>
                </div>
              )}
            </div>
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

          {/* Champ Mot de passe avec bouton œil */}
          <div>
            <Input
              label="Mot de passe"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none p-1 rounded transition-colors"
                  title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            {/* Indicateurs de critères du mot de passe */}
            <div className="mt-2 p-2.5 bg-gray-50 rounded-lg border border-gray-100 text-xs space-y-1">
              <p className="font-medium text-gray-700 flex items-center gap-1 mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                Exigences de sécurité :
              </p>
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                <div className={`flex items-center gap-1 ${hasMinLength ? 'text-emerald-700 font-medium' : 'text-gray-500'}`}>
                  <span>{hasMinLength ? '✓' : '•'}</span> 10 caractères min
                </div>
                <div className={`flex items-center gap-1 ${hasUpper ? 'text-emerald-700 font-medium' : 'text-gray-500'}`}>
                  <span>{hasUpper ? '✓' : '•'}</span> Une majuscule (A-Z)
                </div>
                <div className={`flex items-center gap-1 ${hasLower ? 'text-emerald-700 font-medium' : 'text-gray-500'}`}>
                  <span>{hasLower ? '✓' : '•'}</span> Une minuscule (a-z)
                </div>
                <div className={`flex items-center gap-1 ${hasNumber ? 'text-emerald-700 font-medium' : 'text-gray-500'}`}>
                  <span>{hasNumber ? '✓' : '•'}</span> Un chiffre (0-9)
                </div>
              </div>
            </div>
          </div>

          {/* Champ Confirmation du mot de passe avec bouton œil */}
          <div>
            <Input
              label="Confirmer le mot de passe"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="••••••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none p-1 rounded transition-colors"
                  title={showConfirmPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  aria-label={showConfirmPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            {/* Validation en temps réel de la correspondance */}
            {passwordsMatch && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium mt-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Les mots de passe correspondent parfaitement.</span>
              </div>
            )}
            {passwordsMismatch && (
              <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium mt-1.5">
                <XCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Les deux mots de passe ne correspondent pas.</span>
              </div>
            )}
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={loading || (confirmPassword.length > 0 && passwordsMismatch)}
              className="w-full"
              size="lg"
            >
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
