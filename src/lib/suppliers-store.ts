/**
 * Magasin partagé des fournisseurs LGV SaaS (LGV Corp Communs & Achats)
 * Permet le partage transparent des fournisseurs entre le référentiel d'entreprise
 * et les modules métiers (Achats, Stock, Dettes).
 */

export interface SupplierItem extends Record<string, unknown> {
  id: string;
  name: string;
  ifu: string;
  phone: string;
  email: string;
  address?: string;
  currentDebt: number;
  paymentTermsDays: number;
  hasInvoices?: boolean;
}

export const DEFAULT_SUPPLIERS: SupplierItem[] = [
  {
    id: 'sup_1',
    name: 'GROUPE CFAO MOTORS BENIN',
    ifu: '0201900012345',
    phone: '+229 21 31 20 00',
    email: 'contact@cfaogroup.com',
    address: 'Boulevard de la Marina, Cotonou',
    currentDebt: 1250000,
    paymentTermsDays: 30,
    hasInvoices: true,
  },
  {
    id: 'sup_2',
    name: 'PAPETERIE NATIONALE BENINOISE',
    ifu: '0202111199887',
    phone: '+229 97 45 67 89',
    email: 'ventes@papeterie-bj.com',
    address: 'Avenue Clozel, Cotonou',
    currentDebt: 0,
    paymentTermsDays: 15,
    hasInvoices: true,
  },
  {
    id: 'sup_3',
    name: 'ETS BABA & FRERES QUINCAILLERIE',
    ifu: '0202455512123',
    phone: '+229 96 11 22 33',
    email: 'baba.quincaillerie@gmail.com',
    address: 'Marché Dantokpa, Cotonou',
    currentDebt: 0,
    paymentTermsDays: 0,
    hasInvoices: false,
  },
];

const STORAGE_PREFIX = 'lgv_suppliers_';

export function getSuppliersStorageKey(companySlug: string): string {
  return `${STORAGE_PREFIX}${companySlug || 'default'}`;
}

export function loadSuppliers(companySlug: string): SupplierItem[] {
  if (typeof window === 'undefined') {
    return DEFAULT_SUPPLIERS;
  }

  try {
    const raw = localStorage.getItem(getSuppliersStorageKey(companySlug));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Erreur de lecture des fournisseurs locaux :', err);
  }

  // Initialisation par défaut si premier accès
  saveSuppliers(companySlug, DEFAULT_SUPPLIERS);
  return DEFAULT_SUPPLIERS;
}

export function saveSuppliers(companySlug: string, suppliers: SupplierItem[]): void {
  if (typeof window === 'undefined') return;

  try {
    const key = getSuppliersStorageKey(companySlug);
    localStorage.setItem(key, JSON.stringify(suppliers));

    // Déclencher un événement personnalisé pour synchroniser tous les composants actifs
    window.dispatchEvent(
      new CustomEvent('lgv_suppliers_changed', {
        detail: { companySlug, suppliers },
      })
    );
  } catch (err) {
    console.warn('Erreur lors de la sauvegarde des fournisseurs :', err);
  }
}
