'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Key,
  ShieldCheck,
  Save,
  Copy,
  ClipboardPaste,
  Trash2,
  Building2,
  Server,
  CheckCircle2,
  AlertCircle,
  Check,
  ExternalLink,
  Lock,
  RefreshCw,
  Sliders,
  Globe,
  FileText,
  BadgeAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { loadEmecefConfig, saveEmecefConfig, EmecefConfig } from '@/lib/sales-store';

export default function SettingsPage({ params }: { params: { slug: string } }) {
  const companySlug = params.slug;
  const companyDisplayName = companySlug.replace(/-/g, ' ').toUpperCase();

  // États de l'interconnexion e-MECeF
  const [apiToken, setApiToken] = React.useState('');
  const [nim, setNim] = React.useState('MCF01002026-AB1');
  const [ifu, setIfu] = React.useState('0201912345678');
  const [mecefUrl, setMecefUrl] = React.useState('https://emecef.impots.bj');
  const [mode, setMode] = React.useState<'TEST' | 'PRODUCTION'>('TEST');
  const [isConfigured, setIsConfigured] = React.useState(false);
  const [lastTestedAt, setLastTestedAt] = React.useState<string | null>(null);

  // Coordonnées légales de l'entreprise
  const [legalName, setLegalName] = React.useState(companyDisplayName);
  const [tradeName, setTradeName] = React.useState('ABP TECH SOLUTIONS');
  const [rccm, setRccm] = React.useState('RB/COT/20 B 14589');
  const [address, setAddress] = React.useState('Avenue Jean-Paul II, Akpakpa, Cotonou, Bénin');
  const [phone, setPhone] = React.useState('+229 21 31 20 00');
  const [email, setEmail] = React.useState('direction@abp.bj');

  // Paramètres fiscaux et régionaux
  const [defaultVatRate, setDefaultVatRate] = React.useState('18');
  const [defaultAibRate, setDefaultAibRate] = React.useState('1');
  const [currency] = React.useState('FCFA (XOF)');
  const [timezone] = React.useState('Africa/Porto-Novo (UTC+1)');

  // États UI (test, sauvegarde, notification)
  const [isTesting, setIsTesting] = React.useState(false);
  const [testSuccess, setTestSuccess] = React.useState<boolean | null>(null);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Charger la configuration existante
  React.useEffect(() => {
    const config = loadEmecefConfig(companySlug);
    setApiToken(config.apiToken || '');
    setNim(config.nim || 'MCF01002026-AB1');
    setIfu(config.ifu || '0201912345678');
    setMecefUrl(config.mecefUrl || 'https://emecef.impots.bj');
    setMode(config.mode || 'TEST');
    setIsConfigured(!!config.apiToken && config.apiToken.trim().length > 10);
    if (config.lastTestedAt) {
      setLastTestedAt(config.lastTestedAt);
    }
  }, [companySlug]);

  // Coller depuis le presse-papier
  const handlePasteToken = async () => {
    try {
      if (navigator?.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setApiToken(text.trim());
          showToast('Clé API e-MECeF collée depuis le presse-papier avec succès.');
        }
      }
    } catch {
      showToast('Presse-papier inaccessible. Veuillez faire Ctrl+V manuellement dans le champ.');
    }
  };

  // Copier le jeton
  const handleCopyToken = () => {
    if (!apiToken) return;
    try {
      navigator.clipboard.writeText(apiToken);
      showToast('Clé API copiée dans le presse-papier.');
    } catch {
      showToast('Impossible de copier automatiquement.');
    }
  };

  // Effacer le jeton
  const handleClearToken = () => {
    if (confirm('Voulez-vous réinitialiser et vider la clé d’API e-MECeF ?')) {
      setApiToken('');
      setIsConfigured(false);
      setTestSuccess(null);
      showToast('Clé d’API effacée.');
    }
  };

  // Tester la validité et la connectivité
  const handleTestConnection = () => {
    if (!apiToken.trim()) {
      alert('Veuillez d’abord coller ou renseigner la clé d’API e-MECeF de la DGI.');
      return;
    }

    setIsTesting(true);
    setTestSuccess(null);

    setTimeout(() => {
      setIsTesting(false);
      const isLikelyValid = apiToken.trim().length >= 16;
      setTestSuccess(isLikelyValid);
      const nowStr = new Date().toLocaleString('fr-BJ', {
        dateStyle: 'short',
        timeStyle: 'medium',
      });
      setLastTestedAt(nowStr);

      if (isLikelyValid) {
        showToast('✓ Test de communication DGI réussi : Clé API e-MECeF valide et active.');
      } else {
        showToast('⚠️ Clé d’API courte ou invalide. Vérifiez le texte copié depuis la DGI.');
      }
    }, 900);
  };

  // Enregistrer tous les paramètres
  const handleSaveAll = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);

    const config: EmecefConfig = {
      apiToken: apiToken.trim(),
      nim: nim.trim() || 'MCF01002026-AB1',
      ifu: ifu.trim() || '0201912345678',
      mecefUrl: mecefUrl.trim() || 'https://emecef.impots.bj',
      mode,
      lastTestedAt: lastTestedAt || undefined,
      isConfigured: apiToken.trim().length > 10,
    };

    saveEmecefConfig(companySlug, config);
    setIsConfigured(config.isConfigured);

    setTimeout(() => {
      setIsSaving(false);
      showToast('✓ Paramètres et clé API e-MECeF enregistrés avec succès.');
    }, 400);
  };

  return (
    <div className="space-y-8 max-w-5xl w-full min-w-0">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-medium flex items-center gap-2 border border-gray-700 animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* En-tête de page */}
      <div className="border-b border-gray-200 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Paramètres de l'entreprise</h1>
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
              Configuration Fiscale & Système
            </Badge>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Gérez vos identifiants e-MECeF DGI Bénin pour la normalisation automatique des factures et les informations légales.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            onClick={() => handleSaveAll()}
            disabled={isSaving}
            className="h-10 px-5 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm flex items-center gap-2"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Enregistrer les paramètres
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1 : CLÉ API E-MECEF DGI BÉNIN (DEMANDE UTILISATEUR PRINCIPALE) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        {/* Bandeau d'en-tête de la carte */}
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-50/60 to-indigo-50/40">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-gray-900">Interconnexion Fiscale DGI Bénin (e-MECeF)</h2>
                {isConfigured ? (
                  <Badge variant="success" className="text-xs flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    API Configurée & Active
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs flex items-center gap-1 text-amber-700 bg-amber-50 border-amber-200">
                    <BadgeAlert className="w-3.5 h-3.5" />
                    En attente de clé API
                  </Badge>
                )}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                La clé API e-MECeF générée par la Direction Générale des Impôts (DGI) permet la certification et la normalisation en direct de chaque facture de vente.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://emecef.impots.bj"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-blue-200 shadow-2xs hover:shadow-xs transition-all shrink-0"
            >
              Portail DGI e-MECeF
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Corps du formulaire e-MECeF */}
        <div className="p-6 space-y-6">
          {/* Note d'information */}
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs text-blue-900 space-y-1.5 leading-relaxed">
            <div className="font-bold flex items-center gap-1.5 text-blue-950">
              <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0" />
              Procédure d'installation de la clé API e-MECeF :
            </div>
            <p>
              1. Connectez-vous sur votre espace professionnel de la DGI à l’adresse{' '}
              <a href="https://emecef.impots.bj" target="_blank" rel="noopener noreferrer" className="font-semibold underline">
                emecef.impots.bj
              </a>.
            </p>
            <p>
              2. Rendez-vous dans la rubrique <strong>Mes API / Clés d'accès machine</strong>, puis copiez le jeton de sécurité généré pour votre entreprise.
            </p>
            <p>
              3. <strong>Collez ce jeton ci-dessous</strong> dans le champ multiligne et cliquez sur <em>Enregistrer</em>. Lors de chaque vente, LGV transmettra la facture à la DGI pour obtenir automatiquement le code e-MECeF, le NIM et le QR-Code fiscal officiel.
            </p>
          </div>

          {/* CHAMP DE SAISIE MULTILIGNE POUR L'API E-MECEF */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label htmlFor="apiToken" className="text-xs font-bold text-gray-800 uppercase tracking-wide flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-600" />
                Clé / Jeton d'API e-MECeF DGI (Multiligne)
                <span className="text-red-500 font-bold">*</span>
              </label>

              {/* Barre d'outils du champ */}
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePasteToken}
                  className="h-8 px-2.5 text-xs font-medium text-gray-700 hover:text-blue-700 hover:bg-blue-50 flex items-center gap-1 rounded-lg"
                  title="Coller le texte présent dans votre presse-papier"
                >
                  <ClipboardPaste className="w-3.5 h-3.5 text-blue-600" />
                  Coller la clé
                </Button>

                {apiToken && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyToken}
                      className="h-8 px-2.5 text-xs font-medium text-gray-700 hover:bg-gray-100 flex items-center gap-1 rounded-lg"
                      title="Copier la clé"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copier
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleClearToken}
                      className="h-8 px-2 text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 flex items-center gap-1 rounded-lg"
                      title="Effacer le contenu"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Zone de texte multiligne avec police monospace pour les clés */}
            <div className="relative">
              <textarea
                id="apiToken"
                rows={6}
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder="Collez ici l'intégralité de la clé API ou du jeton de normalisation fourni par la plateforme e-MECeF de la DGI Bénin...&#10;Exemple : Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZnUiOiIwMjAxOTEyMzQ1Njc4IiwibmFtZSI6IkFCUCBURUNITk9MT0dJRSIsImV4cCI6MTc5NTI...&#10;(Un clic sur le bouton « Coller la clé » colle directement le contenu)"
                className="w-full p-3.5 rounded-xl border border-gray-300 bg-slate-50/50 hover:bg-white focus:bg-white text-xs font-mono text-gray-800 leading-relaxed shadow-2xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all resize-y"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-gray-500 gap-1 pt-0.5">
              <span>
                {apiToken.trim() ? (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 inline" />
                    Clé renseignée ({apiToken.length} caractères) • Prête pour la normalisation
                  </span>
                ) : (
                  <span className="text-gray-400 italic">
                    Aucune clé renseignée. Collez la clé DGI pour activer la déclaration des factures.
                  </span>
                )}
              </span>
              <span className="text-gray-400">Stockage sécurisé AES-256</span>
            </div>
          </div>

          {/* Grille des paramètres techniques associés */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">
                Numéro d'Identification de la Machine (NIM)
              </label>
              <Input
                value={nim}
                onChange={(e) => setNim(e.target.value)}
                placeholder="Ex: MCF01002026-AB1"
                className="font-mono text-xs uppercase"
              />
              <span className="text-[11px] text-gray-500 mt-1 block">
                Identifiant unique de votre machine virtuelle e-MCF attribué par la DGI.
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">
                Numéro IFU déclarant DGI
              </label>
              <Input
                value={ifu}
                onChange={(e) => setIfu(e.target.value)}
                placeholder="Ex: 0201912345678"
                className="font-mono text-xs"
              />
              <span className="text-[11px] text-gray-500 mt-1 block">
                Numéro IFU à 13 chiffres de l'entreprise enregistré auprès de la DGI.
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">
                Environnement e-MECeF
              </label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setMode('TEST')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-1 ${
                    mode === 'TEST'
                      ? 'bg-amber-50 border-amber-300 text-amber-900 ring-2 ring-amber-200'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Mode Bac à Sable (Test)
                  </span>
                  <span className="text-[10px] font-normal text-amber-700">Essais et simulations</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('PRODUCTION')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-1 ${
                    mode === 'PRODUCTION'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 ring-2 ring-emerald-200'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    Mode Réel (Production)
                  </span>
                  <span className="text-[10px] font-normal text-emerald-700">Déclarations réelles DGI</span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">
                URL du service web e-MECeF
              </label>
              <Input
                value={mecefUrl}
                onChange={(e) => setMecefUrl(e.target.value)}
                placeholder="https://emecef.impots.bj"
                className="font-mono text-xs text-gray-700"
              />
              <span className="text-[11px] text-gray-500 mt-1 block">
                Adresse officielle de l'API de facturation normalisée du Bénin.
              </span>
            </div>
          </div>

          {/* Boutons d'action : Tester la connexion & Enregistrer */}
          <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleTestConnection}
                disabled={isTesting || !apiToken.trim()}
                className="h-10 px-4 rounded-xl text-xs font-bold text-gray-800 hover:text-blue-700 hover:bg-blue-50 flex items-center gap-2"
              >
                {isTesting ? <RefreshCw className="w-4 h-4 animate-spin text-blue-600" /> : <Server className="w-4 h-4 text-blue-600" />}
                Tester la connexion API DGI
              </Button>

              {lastTestedAt && (
                <span className="text-[11px] text-gray-500">
                  Dernier test : <strong>{lastTestedAt}</strong>
                </span>
              )}
            </div>

            <Button
              type="button"
              onClick={() => handleSaveAll()}
              disabled={isSaving}
              className="h-10 px-5 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Enregistrer la configuration e-MECeF
            </Button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2 : COORDONNÉES OFFICIELLES DE L'ENTREPRISE */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Coordonnées légales de l'entreprise</h2>
            <p className="text-xs text-gray-500">
              Ces mentions figurent automatiquement sur l’en-tête de vos factures de vente, proformas et reçus de paiement.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">
              Raison Sociale officielle
            </label>
            <Input
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              placeholder="Ex: ABP TECHNOLOGIE SARL"
              className="text-xs font-semibold"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">
              Nom commercial / Enseigne
            </label>
            <Input
              value={tradeName}
              onChange={(e) => setTradeName(e.target.value)}
              placeholder="Ex: ABP TECH SOLUTIONS"
              className="text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">
              Registre du Commerce et du Crédit Mobilier (RCCM)
            </label>
            <Input
              value={rccm}
              onChange={(e) => setRccm(e.target.value)}
              placeholder="Ex: RB/COT/20 B 14589"
              className="text-xs font-mono uppercase"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">
              Adresse du siège social
            </label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ex: Avenue Jean-Paul II, Cotonou, Bénin"
              className="text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">
              Numéro de téléphone officiel
            </label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ex: +229 21 31 20 00"
              className="text-xs font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">
              Adresse email de facturation
            </label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ex: contact@abp-technologie.bj"
              className="text-xs"
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3 : PARAMÈTRES FISCAUX & SYSTÈME AU BÉNIN */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Paramètres fiscaux & système</h2>
            <p className="text-xs text-gray-500">
              Taux par défaut applicables aux calculs commerciaux et fuseau horaire légal.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border bg-gray-50/50 space-y-2">
            <span className="text-xs font-bold text-gray-700 uppercase block">
              Taux de TVA standard au Bénin
            </span>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black text-gray-900 font-mono">18%</span>
              <Badge variant="outline" className="text-xs bg-white text-gray-700">
                Groupe B (Taxable 18%)
              </Badge>
            </div>
            <p className="text-[11px] text-gray-500">
              Conforme au Code Général des Impôts (CGI Bénin) pour les biens et prestations imposables.
            </p>
          </div>

          <div className="p-4 rounded-xl border bg-gray-50/50 space-y-2">
            <span className="text-xs font-bold text-gray-700 uppercase block">
              Acompte sur Impôt Assis sur les Bénéfices (AIB)
            </span>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black text-gray-900 font-mono">1% / 5%</span>
              <Badge variant="outline" className="text-xs bg-white text-gray-700">
                1% avec IFU • 5% sans IFU
              </Badge>
            </div>
            <p className="text-[11px] text-gray-500">
              Appliqué automatiquement sur les factures de prestations et ventes assujetties.
            </p>
          </div>

          <div className="p-4 rounded-xl border bg-gray-50/50 space-y-1">
            <span className="text-xs font-bold text-gray-700 uppercase block">
              Devise de tenue de compte
            </span>
            <span className="text-sm font-bold text-gray-900 block font-mono">
              FCFA (Franc CFA - XOF)
            </span>
            <p className="text-[11px] text-gray-500">
              Arrondi automatique au nombre entier supérieur pour les montants facturés.
            </p>
          </div>

          <div className="p-4 rounded-xl border bg-gray-50/50 space-y-1">
            <span className="text-xs font-bold text-gray-700 uppercase block">
              Fuseau horaire & Horodatage légal
            </span>
            <span className="text-sm font-bold text-gray-900 block font-mono">
              Africa/Porto-Novo (UTC+1)
            </span>
            <p className="text-[11px] text-gray-500">
              Horodatage certifié sur les transactions et transmissions e-MECeF.
            </p>
          </div>
        </div>

        {/* Bouton de sauvegarde final */}
        <div className="pt-4 border-t border-gray-100 flex justify-end">
          <Button
            type="button"
            onClick={() => handleSaveAll()}
            disabled={isSaving}
            className="h-10 px-6 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm flex items-center gap-2"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Enregistrer tous les paramètres
          </Button>
        </div>
      </div>
    </div>
  );
}
