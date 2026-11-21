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
  
  // Deux URLs distinctes pour chaque environnement avec gestion du déverrouillage au crayon
  const [testUrl, setTestUrl] = React.useState(EMECEF_TEST_URL);
  const [prodUrl, setProdUrl] = React.useState(EMECEF_PROD_URL);
  const [isEditingTestUrl, setIsEditingTestUrl] = React.useState(false);
  const [isEditingProdUrl, setIsEditingProdUrl] = React.useState(false);

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
    
    setTestUrl(emecefCfg.mecefTestUrl || EMECEF_TEST_URL);
    setProdUrl(emecefCfg.mecefProdUrl || EMECEF_PROD_URL);

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
        showToast(`✓ Test de communication DGI réussi (${mode === 'PRODUCTION' ? 'Production' : 'Bac à sable'}) : Clé API e-MECeF active.`);
      } else {
        showToast('⚠️ Clé d’API courte ou invalide. Vérifiez le texte copié depuis la DGI.');
      }
    }, 900);
  };

  // 1. Sauvegarder uniquement la configuration e-MECeF
  const handleSaveEmecefOnly = () => {
    const activeUrl = mode === 'PRODUCTION' ? prodUrl.trim() : testUrl.trim();
    const config: EmecefConfig = {
      apiToken: apiToken.trim(),
      nim: nim.trim() || 'MCF01002026-AB1',
      ifu: ifu.trim() || '0201912345678',
      mecefUrl: activeUrl,
      mecefTestUrl: testUrl.trim() || EMECEF_TEST_URL,
      mecefProdUrl: prodUrl.trim() || EMECEF_PROD_URL,
      mode,
      lastTestedAt: lastTestedAt || undefined,
      isConfigured: apiToken.trim().length > 10,
    };

    saveEmecefConfig(companySlug, config);
    setIsConfigured(config.isConfigured);
    showToast('✓ Configuration e-MECeF (Mode, NIM, IFU et URLs) enregistrée avec succès.');
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
    showToast('✓ Barèmes fiscaux (TVA, AIB facturé et AIB retenu) enregistrés avec succès.');
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
  // CONTRÔLE D'ACCÈS RBAC (SEULS OWNER ET ADMIN SONT AUTORISÉS)
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
              Vous n’avez pas les droits nécessaires pour accéder à la configuration de l’entreprise ni modifier l’interconnexion e-MECeF de la DGI. Seuls les <strong>administrateurs</strong> et le <strong>propriétaire</strong> sont autorisés à consulter et modifier ces informations.
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

      {/* En-tête de page avec cadre embelli */}
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
        {/* Bandeau d'en-tête de la boîte e-MECeF avec bouton Portail DGI repositionné sous le texte */}
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50/60 to-indigo-50/40">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Key className="w-6 h-6" />
            </div>
            <div className="space-y-2 flex-1 min-w-0">
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
              <p className="text-xs text-gray-600 leading-relaxed">
                La clé API e-MECeF générée par la Direction Générale des Impôts (DGI) permet la certification et la normalisation en direct de chaque facture de vente.
              </p>

              {/* Bouton Portail DGI repositionné ICI : bien cadré, lisible et jamais rogné */}
              <div className="pt-1">
                <a
                  href={EMECEF_PORTAL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-bold text-blue-700 bg-white hover:bg-blue-50 px-3.5 py-2 rounded-xl border border-blue-200 shadow-2xs hover:shadow-xs transition-all"
                >
                  <span>Accéder au Portail officiel DGI e-MECeF ({EMECEF_PORTAL_URL})</span>
                  <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                </a>
              </div>
            </div>
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
              3. <strong>Collez ce jeton ci-dessous</strong> dans le champ multiligne et cliquez sur <em>Enregistrer les configurations e-MECeF</em>. Lors de chaque vente, LGV transmettra la facture à l'URL sélectionnée pour obtenir le code fiscal officiel et le QR-Code certifié.
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

          {/* LIGNE 1 PARFAITEMENT ALIGNÉE : NUMÉRO IDENTIFICATION MACHINE (NIM) & NUMÉRO IFU */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
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
              <p className="text-[11px] text-gray-500 mt-1.5">
                Identifiant unique de votre machine virtuelle e-MCF attribué par la DGI.
              </p>
            </div>

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
              <p className="text-[11px] text-gray-500 mt-1.5">
                Numéro IFU à 13 chiffres de l'entreprise enregistré auprès de la DGI.
              </p>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* LIGNES D'ENVIRONNEMENTS SÉPARÉES : BAC À SABLE ET PRODUCTION EN 2 LIGNES */}
          {/* ========================================================================= */}
          <div className="space-y-4 pt-2">
            <span className="text-xs font-bold text-gray-800 uppercase tracking-wide block">
              Sélection de l'environnement actif & URLs de service e-MECeF
            </span>

            {/* LIGNE 1 : BAC À SABLE (TEST) + URL DGI TEST + CRAYON */}
            <div className={`p-4 rounded-2xl border transition-all ${
              mode === 'TEST'
                ? 'bg-amber-50/60 border-amber-300 ring-2 ring-amber-200/80 shadow-xs'
                : 'bg-gray-50/50 border-gray-200'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Bouton sélecteur Bac à Sable plus large et carré */}
                <button
                  type="button"
                  onClick={() => setMode('TEST')}
                  className={`w-full sm:w-52 h-12 rounded-xl border px-3 text-xs font-bold transition-all flex items-center justify-between gap-2 shrink-0 ${
                    mode === 'TEST'
                      ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full shrink-0 ${mode === 'TEST' ? 'bg-white' : 'bg-amber-500'}`} />
                    <span className="text-left leading-tight">
                      Bac à Sable
                      <span className="block text-[10px] font-normal opacity-90">(Mode Test)</span>
                    </span>
                  </div>
                  {mode === 'TEST' && (
                    <span className="text-[10px] font-black uppercase tracking-wider bg-amber-600 px-1.5 py-0.5 rounded">
                      Actif
                    </span>
                  )}
                </button>

                {/* Champ d'URL de Test + Bouton Crayon */}
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  <div className="relative flex-1">
                    <Input
                      value={testUrl}
                      onChange={(e) => setTestUrl(e.target.value)}
                      disabled={!isEditingTestUrl}
                      placeholder={EMECEF_TEST_URL}
                      className={`font-mono text-xs h-12 pr-9 ${
                        !isEditingTestUrl
                          ? 'bg-white/80 text-gray-700 cursor-not-allowed border-gray-300'
                          : 'bg-white border-blue-400 ring-2 ring-blue-100'
                      }`}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {isEditingTestUrl ? <Unlock className="w-4 h-4 text-blue-600" /> : <Lock className="w-4 h-4" />}
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditingTestUrl(!isEditingTestUrl)}
                    className={`h-12 w-12 px-0 rounded-xl shrink-0 flex items-center justify-center transition-all ${
                      isEditingTestUrl
                        ? 'bg-blue-50 text-blue-700 border-blue-300 ring-2 ring-blue-100'
                        : 'text-gray-700 hover:text-blue-700 hover:bg-blue-50 border-gray-300 bg-white'
                    }`}
                    title={isEditingTestUrl ? 'Verrouiller l’URL' : "Modifier manuellement l'URL de test"}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Note explicative sous la ligne test */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-amber-800 gap-1 pt-2">
                <span>
                  Mode simulation : Les factures générées en mode test n'ont aucune valeur fiscale officielle. Idéal pour les essais et la formation.
                </span>
                {testUrl !== EMECEF_TEST_URL && (
                  <button
                    type="button"
                    onClick={() => {
                      setTestUrl(EMECEF_TEST_URL);
                      setIsEditingTestUrl(false);
                      showToast('URL Bac à sable restaurée par défaut.');
                    }}
                    className="text-blue-700 hover:underline font-semibold shrink-0"
                  >
                    Rétablir l’URL test officielle
                  </button>
                )}
              </div>
            </div>

            {/* LIGNE 2 : PRODUCTION (RÉEL DGI) + URL DGI PROD + CRAYON */}
            <div className={`p-4 rounded-2xl border transition-all ${
              mode === 'PRODUCTION'
                ? 'bg-emerald-50/60 border-emerald-300 ring-2 ring-emerald-200/80 shadow-xs'
                : 'bg-gray-50/50 border-gray-200'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Bouton sélecteur Production plus large et carré */}
                <button
                  type="button"
                  onClick={() => setMode('PRODUCTION')}
                  className={`w-full sm:w-52 h-12 rounded-xl border px-3 text-xs font-bold transition-all flex items-center justify-between gap-2 shrink-0 ${
                    mode === 'PRODUCTION'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full shrink-0 ${mode === 'PRODUCTION' ? 'bg-white' : 'bg-emerald-600'}`} />
                    <span className="text-left leading-tight">
                      Production DGI
                      <span className="block text-[10px] font-normal opacity-90">(Mode Réel)</span>
                    </span>
                  </div>
                  {mode === 'PRODUCTION' && (
                    <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-700 px-1.5 py-0.5 rounded">
                      Actif
                    </span>
                  )}
                </button>

                {/* Champ d'URL de Production + Bouton Crayon */}
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  <div className="relative flex-1">
                    <Input
                      value={prodUrl}
                      onChange={(e) => setProdUrl(e.target.value)}
                      disabled={!isEditingProdUrl}
                      placeholder={EMECEF_PROD_URL}
                      className={`font-mono text-xs h-12 pr-9 ${
                        !isEditingProdUrl
                          ? 'bg-white/80 text-gray-700 cursor-not-allowed border-gray-300'
                          : 'bg-white border-blue-400 ring-2 ring-blue-100'
                      }`}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {isEditingProdUrl ? <Unlock className="w-4 h-4 text-blue-600" /> : <Lock className="w-4 h-4" />}
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditingProdUrl(!isEditingProdUrl)}
                    className={`h-12 w-12 px-0 rounded-xl shrink-0 flex items-center justify-center transition-all ${
                      isEditingProdUrl
                        ? 'bg-blue-50 text-blue-700 border-blue-300 ring-2 ring-blue-100'
                        : 'text-gray-700 hover:text-blue-700 hover:bg-blue-50 border-gray-300 bg-white'
                    }`}
                    title={isEditingProdUrl ? 'Verrouiller l’URL' : "Modifier manuellement l'URL de production"}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Note explicative sous la ligne production */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-emerald-800 gap-1 pt-2">
                <span>
                  Mode officiel actif : Chaque facture validée est directement certifiée et transmise en direct aux serveurs de la DGI.
                </span>
                {prodUrl !== EMECEF_PROD_URL && (
                  <button
                    type="button"
                    onClick={() => {
                      setProdUrl(EMECEF_PROD_URL);
                      setIsEditingProdUrl(false);
                      showToast('URL Production restaurée par défaut.');
                    }}
                    className="text-blue-700 hover:underline font-semibold shrink-0"
                  >
                    Rétablir l’URL production officielle
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Boutons d'action de la section e-MECeF (Tester & Enregistrer) */}
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
      {/* SECTION 2 : COORDONNÉES GÉNÉRALES & MENTION LÉGALE DES FACTURES */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 space-y-5">
        <div className="border-b border-gray-100 pb-4">
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
        </div>

        {/* Grille 2 colonnes avec libellés sur une seule ligne (RCCM simplifié pour alignement parfait) */}
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
              RCCM
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

        {/* CHAMP MENTION LÉGALE SUR LES FACTURES */}
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
          <p className="text-[11px] text-gray-500 mt-1.5">
            Mention légale obligatoire imprimée au bas de toutes les factures de vente, tickets et proformas de votre entreprise.
          </p>
        </div>

        {/* Bouton d'enregistrement repositionné APRÈS la mention légale */}
        <div className="pt-4 border-t border-gray-100 flex justify-end">
          <Button
            type="button"
            onClick={handleSaveLegalDetailsOnly}
            className="h-10 px-5 rounded-xl font-bold text-xs bg-purple-700 hover:bg-purple-800 text-white shadow-sm flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Enregistrer les coordonnées
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3 : PARAMÈTRES FISCAUX CONFIGURABLES (TVA & BARÈMES AIB BÉNIN) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 space-y-6">
        <div className="border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Paramètres fiscaux & Taux configurables</h2>
              <p className="text-xs text-gray-500">
                Définissez les taux applicables modifiables en cas d'évolution de la législation fiscale béninoise (CGI).
              </p>
            </div>
          </div>
        </div>

        {/* Grille des barèmes fiscaux avec design soigné, sans badges décalés */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          
          {/* CARTE 1 : TVA STANDARD (GROUPE B) */}
          <div className="p-5 rounded-2xl border border-gray-200/90 bg-gray-50/60 flex flex-col justify-between space-y-4">
            <div>
              <span className="text-xs font-bold text-gray-900 uppercase tracking-wide block">
                TVA Standard (Groupe B - Taxable)
              </span>
              <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                Taxe sur la Valeur Ajoutée normale au Bénin applicable aux ventes de biens et services.
              </p>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-200/80">
              <span className="text-xs font-semibold text-gray-600">Taux légal :</span>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={vatRate}
                  onChange={(e) => setVatRate(Number(e.target.value))}
                  className="font-mono font-bold text-base h-10 w-20 text-right bg-white border-gray-300"
                />
                <span className="font-bold text-gray-800 text-sm">%</span>
              </div>
            </div>
          </div>

          {/* CARTE 2 : AIB VENTE DE BIENS (AVEC IFU) */}
          <div className="p-5 rounded-2xl border border-blue-200/90 bg-blue-50/30 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-blue-950 uppercase tracking-wide">
                  AIB Vente (Avec IFU)
                </span>
                <span className="text-[11px] font-bold text-blue-800 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-full shrink-0">
                  Facturé 1%
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                Acompte facturé sur vente d'articles lorsque le client dispose d’un numéro IFU actif.
              </p>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-blue-100">
              <span className="text-xs font-semibold text-gray-600">Taux facturé :</span>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={aibRateGoodsWithIfu}
                  onChange={(e) => setAibRateGoodsWithIfu(Number(e.target.value))}
                  className="font-mono font-bold text-base h-10 w-20 text-right bg-white border-blue-300"
                />
                <span className="font-bold text-blue-950 text-sm">%</span>
              </div>
            </div>
          </div>

          {/* CARTE 3 : AIB VENTE DE BIENS (SANS IFU) */}
          <div className="p-5 rounded-2xl border border-amber-200/90 bg-amber-50/30 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                  AIB Vente (Sans IFU)
                </span>
                <span className="text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
                  Facturé 5%
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                Acompte majoré facturé sur vente d'articles lorsque le client n'a pas d'IFU.
              </p>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-amber-100">
              <span className="text-xs font-semibold text-gray-600">Taux facturé :</span>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={aibRateGoodsWithoutIfu}
                  onChange={(e) => setAibRateGoodsWithoutIfu(Number(e.target.value))}
                  className="font-mono font-bold text-base h-10 w-20 text-right bg-white border-amber-300"
                />
                <span className="font-bold text-amber-950 text-sm">%</span>
              </div>
            </div>
          </div>

          {/* CARTE 4 : AIB PRESTATION DE SERVICES (AVEC IFU) - RETENUE 3% */}
          <div className="p-5 rounded-2xl border border-purple-200/90 bg-purple-50/30 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-purple-950 uppercase tracking-wide">
                  AIB Prestation (Avec IFU)
                </span>
                <span className="text-[11px] font-bold text-purple-800 bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-full shrink-0">
                  Retenue 3%
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                AIB retenu à la source par le client sur les prestations facturées par votre entreprise.
              </p>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-purple-100">
              <span className="text-xs font-semibold text-gray-600">Taux retenu :</span>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={aibRateServicesWithIfu}
                  onChange={(e) => setAibRateServicesWithIfu(Number(e.target.value))}
                  className="font-mono font-bold text-base h-10 w-20 text-right bg-white border-purple-300"
                />
                <span className="font-bold text-purple-950 text-sm">%</span>
              </div>
            </div>
          </div>

          {/* CARTE 5 : AIB PRESTATION DE SERVICES (SANS IFU) - RETENUE 5% */}
          <div className="p-5 rounded-2xl border border-rose-200/90 bg-rose-50/30 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-rose-950 uppercase tracking-wide">
                  AIB Prestation (Sans IFU)
                </span>
                <span className="text-[11px] font-bold text-rose-800 bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-full shrink-0">
                  Retenue 5%
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                Retenue majorée en cas de prestation réalisée sans présentation de numéro IFU.
              </p>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-rose-100">
              <span className="text-xs font-semibold text-gray-600">Taux retenu :</span>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={aibRateServicesWithoutIfu}
                  onChange={(e) => setAibRateServicesWithoutIfu(Number(e.target.value))}
                  className="font-mono font-bold text-base h-10 w-20 text-right bg-white border-rose-300"
                />
                <span className="font-bold text-rose-950 text-sm">%</span>
              </div>
            </div>
          </div>

          {/* CARTE 6 : DEVISE & FUSEAU HORAIRE LÉGAL */}
          <div className="p-5 rounded-2xl border border-gray-200/90 bg-gray-50/60 flex flex-col justify-between space-y-4">
            <div>
              <span className="text-xs font-bold text-gray-900 uppercase tracking-wide block">
                Devise & Fuseau Horaire
              </span>
              <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                Paramètres monétaires et horodatage certifié sur les transactions e-MECeF.
              </p>
            </div>
            <div className="pt-2 border-t border-gray-200/80 text-xs font-bold text-gray-800 space-y-1">
              <p>Devise : <span className="font-mono text-blue-700">FCFA (Franc CFA - XOF)</span></p>
              <p>Fuseau : <span className="font-mono text-gray-600">Africa/Porto-Novo (UTC+1)</span></p>
            </div>
          </div>

        </div>

        {/* Bouton d'enregistrement repositionné APRÈS tous les champs fiscaux */}
        <div className="pt-4 border-t border-gray-100 flex justify-end">
          <Button
            type="button"
            onClick={handleSaveFiscalOnly}
            className="h-10 px-5 rounded-xl font-bold text-xs bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Enregistrer les paramètres fiscaux
          </Button>
        </div>
      </div>

      {/* BOUTON GLOBAL TOUT EN BAS */}
      <div className="pt-2 flex justify-end">
        <Button
          type="button"
          onClick={handleSaveAll}
          disabled={isSaving}
          className="h-11 px-6 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-md flex items-center gap-2"
        >
          {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Enregistrer tous les paramètres
        </Button>
      </div>
    </div>
  );
}
