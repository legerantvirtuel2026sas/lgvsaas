/**
 * Magasin partagé des articles & catalogue LGV SaaS (Articles & Ventes / Facturation)
 */

export interface ArticleItem extends Record<string, unknown> {
  id: string;
  sku: string;
  name: string;
  category: string;
  salePriceHt: number;
  costPrice: number | null;
  taxGroup: 'A' | 'B' | 'C' | 'D';
  currentStock: number;
  minStockAlert: number;
  hasTransactions?: boolean;
}

export const DEFAULT_ARTICLES: ArticleItem[] = [
  {
    id: 'prod_1',
    sku: 'RAM-A4-80G',
    name: 'Rame de papier A4 80g Double A',
    category: 'Fournitures de bureau',
    salePriceHt: 3500,
    costPrice: 2450,
    taxGroup: 'B',
    currentStock: 4,
    minStockAlert: 15,
    hasTransactions: true,
  },
  {
    id: 'prod_2',
    sku: 'TONER-HP-05A',
    name: 'Cartouche de Toner HP LaserJet 05A Noir',
    category: 'Consommables',
    salePriceHt: 45000,
    costPrice: 32000,
    taxGroup: 'B',
    currentStock: 2,
    minStockAlert: 5,
    hasTransactions: true,
  },
  {
    id: 'prod_3',
    sku: 'CLAV-LOGI-K120',
    name: 'Clavier USB Filaire Logitech K120',
    category: 'Informatique',
    salePriceHt: 6500,
    costPrice: 4200,
    taxGroup: 'B',
    currentStock: 0,
    minStockAlert: 5,
    hasTransactions: false,
  },
  {
    id: 'prod_4',
    sku: 'SOURIS-LOGI-M185',
    name: 'Souris Optique Sans Fil Logitech M185',
    category: 'Informatique',
    salePriceHt: 8500,
    costPrice: 5500,
    taxGroup: 'B',
    currentStock: 48,
    minStockAlert: 10,
    hasTransactions: true,
  },
];

const STORAGE_PREFIX = 'lgv_articles_';

export function getArticlesStorageKey(companySlug: string): string {
  return `${STORAGE_PREFIX}${companySlug || 'default'}`;
}

export function loadArticles(companySlug: string): ArticleItem[] {
  if (typeof window === 'undefined') {
    return DEFAULT_ARTICLES;
  }

  try {
    const raw = localStorage.getItem(getArticlesStorageKey(companySlug));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Erreur lecture articles locaux :', err);
  }

  saveArticles(companySlug, DEFAULT_ARTICLES);
  return DEFAULT_ARTICLES;
}

export function saveArticles(companySlug: string, articles: ArticleItem[]): void {
  if (typeof window === 'undefined') return;

  try {
    const key = getArticlesStorageKey(companySlug);
    localStorage.setItem(key, JSON.stringify(articles));

    window.dispatchEvent(
      new CustomEvent('lgv_articles_changed', {
        detail: { companySlug, articles },
      })
    );
  } catch (err) {
    console.warn('Erreur sauvegarde articles locaux :', err);
  }
}
