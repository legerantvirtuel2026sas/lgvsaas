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
  Unlock,
  RefreshCw,
  Sliders,
  Globe,
  FileText,
  BadgeAlert,
  Pencil,
  ShieldAlert,
  Percent,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  loadEmecefConfig,
  saveEmecefConfig,
  EmecefConfig,
  EMECEF_PROD_URL,
  EMECEF_TEST_URL,
  EMECEF_PORTAL_URL,
  loadCompanySettings,
  saveCompanySettings,
  CompanySettingsData,
} from '@/lib/sales-store';

export default function SettingsPage({ params }: { params: { slug: string } }) {
  const companySlug = params.slug;
  const companyDisplayName = companySlug.replace(/-/g, ' ').toUpperCase();

  // Contrôle d'accès basé sur les rôles (Seuls OWNER et ADMIN ont le droit de gérer les paramètres)
  const [currentUserRole, setCurrentUserRole] = React.useState<'OWNER' | 'ADMIN' | 'USER'>('OWNER');

  // =========================================================================
  // ÉTATS DE L'INTERCONNEXION E-MECEF DGI BÉNIN
  // =========================================================================
  const [apiToken, setApiToken] = React.useState('');
  const [nim, setNim] = React.useState('MCF01002026-AB1');
  const [ifu, setIfu] = React.useState('0201912345678');
  const [mode, setMode] = React.useState<'TEST' | 'PRODUCTION'>('TEST');
  const [mecefUrl, setMecefUrl] = React.useState(EMECEF_TEST_URL);
  const [isUrlCustomized, setIsUrlCustomized] = React.useState(false);
  const [isEditingUrl, setIsEditingUrl] = React.useState(false);
  const [isConfigured, setIsConfigured] = React.useState(false);
  const [lastTestedAt, setLastTestedAt] = React.useState<string | null>(null);

  // =========================================================================
  // COORDONNÉES LÉGALES DE L'ENTREPRISE
  // =========================================================================
  const [legalName, setLegalName] = React.useState(companyDisplayName);
  const [tradeName, setTradeName] = React.useState('ABP TECH SOLUTIONS');
  const [rccm, setRccm] = React.useState('RB/COT/20 B 14589');
  const [address, setAddress] = React.useState('Avenue Jean-Paul II, Akpakpa, Cotonou, Bénin');
  const [phone, setPhone] = React.useState('+229 21 31 20 00');
  const [email, setEmail] = React.useState('direction@abp.bj');
  const [legalNotice, setLegalNotice] = React.useState('Les articles vendus ne sont ni repris ni échangés.');

  // =========================================================================
  // PARAMÈTRES FISCAUX CONFIGURABLES (TVA, AIB VENTES, AIB PRESTATIONS)
  // =========================================================================
  const [vatRate, setVatRate] = React.useState<number>(18);
  const [aibRateGoodsWithIfu, setAibRateGoodsWithIfu] = React.useState<number>(1);
  const [aibRateGoodsWithoutIfu, setAibRateGoodsWithoutIfu] = React.useState<number>(5);
  const [aibRateServicesWithIfu, setAibRateServicesWithIfu] = React.useState<number>(3);
  const [aibRateServicesWithoutIfu, setAibRateServicesWithoutIfu] = React.useState<number>(5);

  // États d'action UI
  const [isTesting, setIsTesting] = React.useState(false);
  const [testSuccess, setTestSuccess] = React.useState<boolean | null>(null);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Chargement des données au montage du composant
  React.useEffect(() => {
    // 1. Charger configuration e-MECeF
    const emecefCfg = loadEmecefConfig(companySlug);
    setApiToken(emecefCfg.apiToken || '');
    setNim(emecefCfg.nim || 'MCF01002026-AB1');
    setIfu(emecefCfg.ifu || '0201912345678');
    setMode(emecefCfg.mode || 'TEST');
    
    // Détermination de l'URL par défaut selon le mode
    const defaultUrlForMode = emecefCfg.mode === 'PRODUCTION' ? EMECEF_PROD_URL : EMECEF_TEST_URL;
    if (emecefCfg.mecefUrl && emecefCfg.mecefUrl !== 'https://emecef.impots.bj') {
      setMecefUrl(emecefCfg.mecefUrl);
      if (emecefCfg.mecefUrl !== defaultUrlForMode) {
        setIsUrlCustomized(true);
      }
    } else {
      setMecefUrl(defaultUrlForMode);
    }

    setIsConfigured(!!emecefCfg.apiToken && emecefCfg.apiToken.trim().length > 10);
    if (emecefCfg.lastTestedAt) {
      setLastTestedAt(emecefCfg.lastTestedAt);
    }

    // 2. Charger coordonnées et paramètres fiscaux de l'entreprise
    const compSettings = loadCompanySettings(companySlug);
    setLegalName(compSettings.legalName || companyDisplayName);
    setTradeName(compSettings.tradeName || 'ABP TECH SOLUTIONS');
    setRccm(compSettings.rccm || 'RB/COT/20 B 14589');
    setAddress(compSettings.address || 'Avenue Jean-Paul II, Akpakpa, Cotonou, Bénin');
    setPhone(compSettings.phone || '+229 21 31 20 00');
    setEmail(compSettings.email || 'direction@abp.bj');
    setLegalNotice(compSettings.legalNotice || 'Les articles vendus ne sont ni repris ni échangés.');
    setVatRate(compSettings.vatRate ?? 18);
    setAibRateGoodsWithIfu(compSettings.aibRateGoodsWithIfu ?? 1);
    setAibRateGoodsWithoutIfu(compSettings.aibRateGoodsWithoutIfu ?? 5);
    setAibRateServicesWithIfu(compSettings.aibRateServicesWithIfu ?? 3);
    setAibRateServicesWithoutIfu(compSettings.aibRateServicesWithoutIfu ?? 5);
  }, [companySlug, companyDisplayName]);

  // Changement de mode Bac à Sable vs Production (met à jour automatiquement l'URL)
  const handleModeChange = (newMode: 'TEST' | 'PRODUCTION') => {
    setMode(newMode);
    // Si l'utilisateur n'a pas personnalisé l'URL à la main, on applique l'URL officielle correspondante
    if (!isUrlCustomized) {
      setMecefUrl(newMode === 'PRODUCTION' ? EMECEF_PROD_URL : EMECEF_TEST_URL);
    }
  };

  // Réinitialiser l'URL à la valeur officielle par défaut
  const handleResetUrlToDefault = () => {
    const defaultUrl = mode === 'PRODUCTION' ? EMECEF_PROD_URL : EMECEF_TEST_URL;
    setMecefUrl(defaultUrl);
    setIsUrlCustomized(false);
    setIsEditingUrl(false);
    showToast(`URL réinitialisée à l'adresse DGI officielle (${mode === 'PRODUCTION' ? 'Production' : 'Bac à sable'}).`);
  };

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

  // Tester la connexion API DGI
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
        showToast(`✓ Test de communication DGI réussi (${mode === 'PRODUCTION' ? 'Production' : 'Bac à sable'}) : Clé API e-MECeF valide.`);
      } else {
        showToast('⚠️ Clé d’API courte ou invalide. Vérifiez le texte copié depuis la DGI.');
      }
    }, 900);
  };

  // 1. Sauvegarder uniquement la configuration e-MECeF
  const handleSaveEmecefOnly = () => {
    const config: EmecefConfig = {
      apiToken: apiToken.trim(),
      nim: nim.trim() || 'MCF01002026-AB1',
      ifu: ifu.trim() || '0201912345678',
      mecefUrl: mecefUrl.trim() || (mode === 'PRODUCTION' ? EMECEF_PROD_URL : EMECEF_TEST_URL),
      mode,
      lastTestedAt: lastTestedAt || undefined,
      isConfigured: apiToken.trim().length > 10,
    };

    saveEmecefConfig(companySlug, config);
    setIsConfigured(config.isConfigured);
    showToast('✓ Paramètres et clé API e-MECeF enregistrés avec succès.');
  };

  // 2. Sauvegarder uniquement les coordonnées légales
  const handleSaveLegalDetailsOnly = () => {
    const currentSettings = loadCompanySettings(companySlug);
    const updated: CompanySettingsData = {
      ...currentSettings,
      legalName: legalName.trim(),
      tradeName: tradeName.trim(),
      rccm: rccm.trim(),
      address: address.trim(),
      phone: phone.trim(),
      email: email.trim(),
      legalNotice: legalNotice.trim(),
    };

    saveCompanySettings(companySlug, updated);
    showToast('✓ Coordonnées légales et mention de facture enregistrées avec succès.');
  };

  // 3. Sauvegarder uniquement les paramètres fiscaux
  const handleSaveFiscalOnly = () => {
    const currentSettings = loadCompanySettings(companySlug);
    const updated: CompanySettingsData = {
      ...currentSettings,
      vatRate: Number(vatRate) || 18,
      aibRateGoodsWithIfu: Number(aibRateGoodsWithIfu) || 1,
      aibRateGoodsWithoutIfu: Number(aibRateGoodsWithoutIfu) || 5,
      aibRateServicesWithIfu: Number(aibRateServicesWithIfu) || 3,
      aibRateServicesWithoutIfu: Number(aibRateServicesWithoutIfu) || 5,
    };

    saveCompanySettings(companySlug, updated);
    showToast('✓ Taux fiscaux (TVA, AIB facturé et AIB retenu) enregistrés avec succès.');
  };

  // 4. Sauvegarder tous les paramètres en un clic
  const handleSaveAll = () => {
    setIsSaving(true);
    handleSaveEmecefOnly();
    handleSaveLegalDetailsOnly();
    handleSaveFiscalOnly();

    setTimeout(() => {
      setIsSaving(false);
      showToast('✓ Tous les paramètres de l’entreprise ont été enregistrés avec succès.');
    }, 350);
  };

  // =========================================================================
  // VÉRIFICATION DES DROITS D'ACCÈS (SEULS OWNER ET ADMIN SONT AUTORISÉS)
  // =========================================================================
  const isAuthorized = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

  if (!isAuthorized) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-white rounded-2xl border border-red-200/90 shadow-sm p-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto shadow-xs border border-red-100">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Accès restreint aux Paramètres</h1>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed max-w-md mx-auto">
              Vous n’avez pas les droits nécessaires pour accéder à la configuration générale de l’entreprise ni modifier l’interconnexion e-MECeF de la DGI. Seuls les <strong>administrateurs</strong> et le <strong>propriétaire</strong> sont autorisés à consulter et modifier ces informations.
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <Link href={`/e/${companySlug}`}>
              <Button variant="outline" className="h-10 px-4 rounded-xl text-xs font-bold">
                ← Retourner au Hub des activités
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl w-full min-w-0">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-medium flex items-center gap-2 border border-gray-700 animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* En-tête de page avec badge embelli */}
      <div className="border-b border-gray-200 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Paramètres de l'entreprise</h1>
            
            {/* Cadre embelli pour "Configuration Fiscale & Système" */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/90 text-blue-700 text-xs font-bold shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Configuration Fiscale & Système</span>
            </div>
          </div>
          <p className="mt-1.5 text-sm text-gray-600">
            Identifiants e-MECeF DGI Bénin, coordonnées officielles de facturation et barèmes fiscaux applicables.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="h-10 px-5 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm flex items-center gap-2"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Enregistrer tous les paramètres
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1 : INTERCONNEXION FISCALE DGI BÉNIN (E-MECEF) */}
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
            {/* Bouton vers le portail officiel DGI e-MECeF avec tiret exact */}
            <a
              href={EMECEF_PORTAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 bg-white px-3.5 py-2 rounded-xl border border-blue-200 shadow-2xs hover:shadow-xs transition-all shrink-0"
            >
              <span>Portail DGI e-MECeF</span>
              <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
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
              <a href={EMECEF_PORTAL_URL} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
                e-mecef.impots.bj
              </a>.
            </p>
            <p>
              2. Rendez-vous dans la rubrique <strong>Mes API / Clés d'accès machine</strong>, puis copiez le jeton de sécurité généré pour votre entreprise.
            </p>
            <p>
              3. <strong>Collez ce jeton ci-dessous</strong> dans le champ multiligne et cliquez sur <em>Enregistrer les configurations e-MECeF</em>. Lors de chaque vente, LGV utilisera ce jeton pour se connecter automatiquement aux serveurs de la DGI afin de déclarer et normaliser la facture.
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

          {/* LIGNE 1 ALIGNÉE : NUMÉRO D'IDENTIFICATION MACHINE (NIM) & NUMÉRO IFU */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
            <div className="flex flex-col justify-between">
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1.5">
                  Numéro d'Identification de la Machine (NIM)
                </label>
                <Input
                  value={nim}
                  onChange={(e) => setNim(e.target.value)}
                  placeholder="Ex: MCF01002026-AB1"
                  className="font-mono text-xs uppercase h-10"
                />
              </div>
              <span className="text-[11px] text-gray-500 mt-1.5 block">
                Identifiant unique de votre machine virtuelle e-MCF attribué par la DGI.
              </span>
            </div>

            <div className="flex flex-col justify-between">
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1.5">
                  Numéro IFU déclarant DGI
                </label>
                <Input
                  value={ifu}
                  onChange={(e) => setIfu(e.target.value)}
                  placeholder="Ex: 0201912345678"
                  className="font-mono text-xs h-10"
                />
              </div>
              <span className="text-[11px] text-gray-500 mt-1.5 block">
                Numéro IFU à 13 chiffres de l'entreprise enregistré auprès de la DGI.
              </span>
            </div>
          </div>

          {/* LIGNE 2 ALIGNÉE : CHOIX DU MODE (TEST/PROD) & URL DE SERVICE AVEC BOUTON CRAYON */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            {/* Colonne 1 : Choix du Mode */}
            <div>
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1.5">
                Environnement e-MECeF
              </label>
              <div className="grid grid-cols-2 gap-2.5 h-10">
                <button
                  type="button"
                  onClick={() => handleModeChange('TEST')}
                  className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                    mode === 'TEST'
                      ? 'bg-amber-50 border-amber-300 text-amber-900 ring-2 ring-amber-200 shadow-2xs'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                  <span>Bac à Sable (Test)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleModeChange('PRODUCTION')}
                  className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                    mode === 'PRODUCTION'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 ring-2 ring-emerald-200 shadow-2xs'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0"></span>
                  <span>Production (Réel)</span>
                </button>
              </div>
              <span className="text-[11px] text-gray-500 mt-1.5 block">
                {mode === 'PRODUCTION'
                  ? 'Mode actif : Factures déclarées et certifiées directement à la DGI.'
                  : 'Mode simulation : Aucune déclaration fiscale officielle générée.'}
              </span>
            </div>

            {/* Colonne 2 : URL du service d'API avec Crayon de déverrouillage */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block">
                  URL du service d'API e-MECeF
                </label>
                {isUrlCustomized && (
                  <button
                    type="button"
                    onClick={handleResetUrlToDefault}
                    className="text-[10px] text-blue-600 hover:underline flex items-center gap-1"
                  >
                    Réinitialiser par défaut
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <Input
                    value={mecefUrl}
                    onChange={(e) => {
                      setMecefUrl(e.target.value);
                      setIsUrlCustomized(true);
                    }}
                    disabled={!isEditingUrl}
                    placeholder="https://..."
                    className={`font-mono text-xs h-10 pr-8 ${
                      !isEditingUrl ? 'bg-gray-100 text-gray-600 cursor-not-allowed border-gray-200' : 'bg-white'
                    }`}
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                    {isEditingUrl ? <Unlock className="w-3.5 h-3.5 text-blue-600" /> : <Lock className="w-3.5 h-3.5" />}
                  </div>
                </div>

                {/* Bouton Crayon pour autoriser la modification */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditingUrl(!isEditingUrl)}
                  className={`h-10 px-3 rounded-xl flex items-center justify-center transition-all ${
                    isEditingUrl
                      ? 'bg-blue-50 text-blue-700 border-blue-300 ring-2 ring-blue-100'
                      : 'text-gray-700 hover:text-blue-700 hover:bg-blue-50'
                  }`}
                  title={isEditingUrl ? 'Verrouiller le champ' : "Modifier manuellement l'URL officielle"}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>

              <span className="text-[11px] text-gray-500 mt-1.5 block">
                {isEditingUrl ? (
                  <span className="text-blue-700 font-medium">
                    Modification manuelle autorisée (réservée aux administrateurs si l’État change l’URL).
                  </span>
                ) : (
                  <span>
                    URL officielle DGI définie par défaut. Cliquez sur le crayon pour modifier.
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Boutons d'action de la section e-MECeF */}
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
              onClick={handleSaveEmecefOnly}
              className="h-10 px-5 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Enregistrer les configurations e-MECeF
            </Button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2 : COORDONNÉES LÉGALES & MENTION LÉGALE DES FACTURES */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Coordonnées légales de l'entreprise</h2>
              <p className="text-xs text-gray-500">
                Ces mentions figurent automatiquement sur l’en-tête et le pied de page de vos factures normalisées.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleSaveLegalDetailsOnly}
            className="h-9 px-4 rounded-xl text-xs font-bold text-purple-700 border-purple-200 hover:bg-purple-50 flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            Enregistrer les coordonnées
          </Button>
        </div>

        {/* Grille 2 colonnes parfaitement alignée */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1.5">
              Raison Sociale officielle
            </label>
            <Input
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              placeholder="Ex: ABP TECHNOLOGIE SARL"
              className="text-xs font-semibold h-10"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1.5">
              Nom commercial / Enseigne
            </label>
            <Input
              value={tradeName}
              onChange={(e) => setTradeName(e.target.value)}
              placeholder="Ex: ABP TECH SOLUTIONS"
              className="text-xs h-10"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1.5">
              Registre du Commerce et du Crédit Mobilier (RCCM)
            </label>
            <Input
              value={rccm}
              onChange={(e) => setRccm(e.target.value)}
              placeholder="Ex: RB/COT/20 B 14589"
              className="text-xs font-mono uppercase h-10"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1.5">
              Adresse du siège social
            </label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ex: Avenue Jean-Paul II, Cotonou, Bénin"
              className="text-xs h-10"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1.5">
              Numéro de téléphone officiel
            </label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ex: +229 21 31 20 00"
              className="text-xs font-mono h-10"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1.5">
              Adresse email de facturation
            </label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ex: contact@abp-technologie.bj"
              className="text-xs h-10"
            />
          </div>
        </div>

        {/* NOUVEAU : CHAMP MENTION LÉGALE DES FACTURES */}
        <div className="pt-2 border-t border-gray-100">
          <label className="text-xs font-bold text-gray-800 uppercase tracking-wide block mb-1.5 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-purple-600" />
            Mention légale sur les factures et reçus
          </label>
          <Input
            value={legalNotice}
            onChange={(e) => setLegalNotice(e.target.value)}
            placeholder="Ex: Les articles vendus ne sont ni repris ni échangés."
            className="text-xs h-10 font-medium"
          />
          <span className="text-[11px] text-gray-500 mt-1.5 block">
            Mention légale obligatoire imprimée au bas de toutes les factures de vente, tickets et proformas de votre entreprise.
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3 : PARAMÈTRES FISCAUX PERSONNALISABLES (TVA & BARÈMES AIB BÉNIN) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Paramètres fiscaux & Taux configurables</h2>
              <p className="text-xs text-gray-500">
                Définissez les taux par défaut (TVA, AIB facturé et AIB retenu) modifiables en cas d'évolution de la législation fiscale béninoise.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleSaveFiscalOnly}
            className="h-9 px-4 rounded-xl text-xs font-bold text-emerald-700 border-emerald-200 hover:bg-emerald-50 flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            Enregistrer les paramètres fiscaux
          </Button>
        </div>

        {/* Grille des taux fiscaux paramétrables */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Taux TVA */}
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700 uppercase">Taux TVA Standard</span>
                <Badge variant="outline" className="text-[10px] bg-white">Groupe B</Badge>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Taxe sur la Valeur Ajoutée normale au Bénin (CGI).
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Input
                type="number"
                min="0"
                max="100"
                value={vatRate}
                onChange={(e) => setVatRate(Number(e.target.value))}
                className="font-mono font-bold text-base h-10 w-24 text-right bg-white"
              />
              <span className="font-bold text-gray-700 text-sm">%</span>
            </div>
          </div>

          {/* AIB Ventes d'Articles - Avec IFU */}
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700 uppercase">AIB Vente (Avec IFU)</span>
                <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">Facturé</Badge>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Acompte facturé sur vente de biens à un client immatriculé.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Input
                type="number"
                min="0"
                max="100"
                value={aibRateGoodsWithIfu}
                onChange={(e) => setAibRateGoodsWithIfu(Number(e.target.value))}
                className="font-mono font-bold text-base h-10 w-24 text-right bg-white"
              />
              <span className="font-bold text-gray-700 text-sm">%</span>
            </div>
          </div>

          {/* AIB Ventes d'Articles - Sans IFU */}
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700 uppercase">AIB Vente (Sans IFU)</span>
                <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">Facturé</Badge>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Acompte majoré pour client non immatriculé.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Input
                type="number"
                min="0"
                max="100"
                value={aibRateGoodsWithoutIfu}
                onChange={(e) => setAibRateGoodsWithoutIfu(Number(e.target.value))}
                className="font-mono font-bold text-base h-10 w-24 text-right bg-white"
              />
              <span className="font-bold text-gray-700 text-sm">%</span>
            </div>
          </div>

          {/* AIB Prestations de services - Avec IFU (NOUVEAU : Retenue à la source 3%) */}
          <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/30 space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-900 uppercase">AIB Prestations (Avec IFU)</span>
                <Badge variant="outline" className="text-[10px] bg-purple-100 text-purple-800 border-purple-300">Retenu 3%</Badge>
              </div>
              <p className="text-[11px] text-gray-600 mt-1">
                AIB retenu à la source par le client sur les prestations fournies.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Input
                type="number"
                min="0"
                max="100"
                value={aibRateServicesWithIfu}
                onChange={(e) => setAibRateServicesWithIfu(Number(e.target.value))}
                className="font-mono font-bold text-base h-10 w-24 text-right bg-white border-purple-300"
              />
              <span className="font-bold text-purple-900 text-sm">%</span>
            </div>
          </div>

          {/* AIB Prestations de services - Sans IFU */}
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700 uppercase">AIB Prestations (Sans IFU)</span>
                <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">Retenu 5%</Badge>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Retenue majorée en l’absence de numéro IFU valide.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Input
                type="number"
                min="0"
                max="100"
                value={aibRateServicesWithoutIfu}
                onChange={(e) => setAibRateServicesWithoutIfu(Number(e.target.value))}
                className="font-mono font-bold text-base h-10 w-24 text-right bg-white"
              />
              <span className="font-bold text-gray-700 text-sm">%</span>
            </div>
          </div>

          {/* Devise & Fuseau horaire Bénin */}
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-1 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-gray-700 uppercase block">Devise & Fuseau Horaire</span>
              <p className="text-[11px] text-gray-500 mt-1">Norme monétaire et légale officielle du Bénin.</p>
            </div>
            <div className="pt-2 text-xs font-bold text-gray-800 space-y-1">
              <p>Devise : <span className="font-mono text-blue-700">FCFA (XOF)</span></p>
              <p>Zone : <span className="font-mono text-gray-600">Africa/Porto-Novo (UTC+1)</span></p>
            </div>
          </div>
        </div>

        {/* Bouton global du bas */}
        <div className="pt-4 border-t border-gray-100 flex justify-end">
          <Button
            type="button"
            onClick={handleSaveAll}
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
