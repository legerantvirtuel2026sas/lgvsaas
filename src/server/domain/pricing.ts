/**
 * Moteur de tarification officiel de LGV SaaS (Section 18.3 de PROJECT.md)
 * Tous les montants sont calculés STRICTEMENT côté serveur en FCFA entiers sans décimales.
 */

export type PlanCode = 'ESSENTIEL' | 'PRO' | 'ENTREPRISE';
export type PackCode = 'COMMERCE' | 'SERVICES' | 'FLEET' | 'TRESORERIE';

export interface PlanMetadata {
  code: PlanCode;
  name: string;
  seats: number;
  supportDelay: string;
  onboarding: string;
}

export const PLANS_CATALOG: Record<PlanCode, PlanMetadata> = {
  ESSENTIEL: {
    code: 'ESSENTIEL',
    name: 'Essentiel',
    seats: 2,
    supportDelay: 'Sous 24h ouvrées',
    onboarding: '1 session d’onboarding à distance (60 min)',
  },
  PRO: {
    code: 'PRO',
    name: 'Pro',
    seats: 5,
    supportDelay: 'Sous 8h ouvrées',
    onboarding: '2 sessions + contrôle qualité à J+7 ; 2e pack métier à -50%',
  },
  ENTREPRISE: {
    code: 'ENTREPRISE',
    name: 'Entreprise',
    seats: 10,
    supportDelay: 'Prioritaire sous 4h avec ligne directe dédiée',
    onboarding: '3 à 4 sessions approfondies dont une longue sur site ou visio',
  },
};

/**
 * Grille tarifaire officielle en FCFA TTC pour 12 mois
 */
export const ANNUAL_PRICES_TTC: Record<PlanCode, Record<PackCode, number>> = {
  ESSENTIEL: {
    COMMERCE: 176_900,
    SERVICES: 159_200,
    FLEET: 235_900,
    TRESORERIE: 58_900,
  },
  PRO: {
    COMMERCE: 235_900,
    SERVICES: 218_200,
    FLEET: 294_900,
    TRESORERIE: 117_900,
  },
  ENTREPRISE: {
    COMMERCE: 294_900,
    SERVICES: 277_200,
    FLEET: 353_900,
    TRESORERIE: 176_900,
  },
};

export interface PricingCalculationResult {
  planCode: PlanCode;
  seats: number;
  selectedPacks: PackCode[];
  itemizedPacks: {
    packCode: PackCode;
    basePriceTtc: number;
    discountAmount: number;
    finalPriceTtc: number;
  }[];
  totalDiscount: number;
  totalTtc: number;
  totalHt: number;
  totalVat: number;
}

/**
 * Calcule côté serveur le montant exact d'un abonnement annuel en FCFA TTC, HT et TVA.
 * Applique la remise de 50% sur le 2e pack le moins cher pour le plan Pro.
 */
export function calculateAnnualSubscriptionPrice(
  planCode: PlanCode,
  packs: PackCode[],
  availablePacks: PackCode[] = ['COMMERCE'] // Seuls les packs dont la carte est ouverte sont vendables
): PricingCalculationResult {
  if (!packs || packs.length === 0) {
    throw new Error('Au moins un pack métier doit être sélectionné');
  }

  // Vérifier qu'aucun pack indisponible n'est injecté
  for (const pack of packs) {
    if (!availablePacks.includes(pack)) {
      throw new Error(`Le pack ${pack} n’est pas disponible à la souscription en ligne actuellement.`);
    }
  }

  const planInfo = PLANS_CATALOG[planCode];
  if (!planInfo) {
    throw new Error(`Plan inconnu : ${planCode}`);
  }

  const pricesForPlan = ANNUAL_PRICES_TTC[planCode];

  // Trier les packs par prix TTC décroissant pour identifier le 2e pack (le moins cher) si éligible à remise
  const sortedPacks = [...packs].map((p) => ({
    packCode: p,
    priceTtc: pricesForPlan[p],
  })).sort((a, b) => b.priceTtc - a.priceTtc);

  let totalDiscount = 0;
  const itemized = sortedPacks.map((item, index) => {
    let discount = 0;
    // Remise de 50% sur le 2e pack (index 1) uniquement pour le plan PRO
    if (planCode === 'PRO' && index === 1) {
      discount = Math.round(item.priceTtc * 0.5);
      totalDiscount += discount;
    }

    const finalPriceTtc = item.priceTtc - discount;
    return {
      packCode: item.packCode,
      basePriceTtc: item.priceTtc,
      discountAmount: discount,
      finalPriceTtc,
    };
  });

  const totalTtc = itemized.reduce((sum, item) => sum + item.finalPriceTtc, 0);

  // Dérivation HT et TVA 18% par règle d'arrondi centrale
  const totalHt = Math.round(totalTtc / 1.18);
  const totalVat = totalTtc - totalHt;

  return {
    planCode,
    seats: planInfo.seats,
    selectedPacks: packs,
    itemizedPacks: itemized,
    totalDiscount,
    totalTtc,
    totalHt,
    totalVat,
  };
}
