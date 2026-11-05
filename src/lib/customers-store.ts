/**
 * Magasin partagé des clients LGV SaaS (LGV Corp Communs & Ventes / Facturation)
 */

export interface CustomerItem extends Record<string, unknown> {
  id: string;
  name: string;
  type: string;
  ifu: string;
  phone: string;
  email: string;
  address?: string;
  currentDebt: number;
  creditLimit: number;
  hasInvoices?: boolean;
}

export const DEFAULT_CUSTOMERS: CustomerItem[] = [
  {
    id: 'cust_1',
    name: 'Société Béninoise d’Import-Export',
    type: 'COMPANY',
    ifu: '0202611111111',
    phone: '+229 97 22 33 44',
    email: 'comptabilite@sbie.bj',
    address: 'Zone Industrielle Akpakpa, Cotonou',
    currentDebt: 0,
    creditLimit: 5000000,
    hasInvoices: true,
  },
  {
    id: 'cust_2',
    name: 'Établissements Alafia & Fils',
    type: 'COMPANY',
    ifu: '0202622222222',
    phone: '+229 96 55 66 77',
    email: 'alafia@yahoo.fr',
    address: 'Marché Dantokpa, Cotonou',
    currentDebt: 450000,
    creditLimit: 1000000,
    hasInvoices: true,
  },
  {
    id: 'cust_3',
    name: 'Jean-Baptiste ADANHO',
    type: 'INDIVIDUAL',
    ifu: 'Particulier',
    phone: '+229 95 88 99 00',
    email: 'jb.adanho@gmail.com',
    address: 'Haie Vive, Cotonou',
    currentDebt: 0,
    creditLimit: 0,
    hasInvoices: false,
  },
  {
    id: 'cust_4',
    name: 'Client Comptant / Guichet',
    type: 'INDIVIDUAL',
    ifu: 'Particulier',
    phone: '+229 00 00 00 00',
    email: '',
    address: 'Guichet Cotonou',
    currentDebt: 0,
    creditLimit: 0,
    hasInvoices: true,
  },
];

const STORAGE_PREFIX = 'lgv_customers_';

export function getCustomersStorageKey(companySlug: string): string {
  return `${STORAGE_PREFIX}${companySlug || 'default'}`;
}

export function loadCustomers(companySlug: string): CustomerItem[] {
  if (typeof window === 'undefined') {
    return DEFAULT_CUSTOMERS;
  }

  try {
    const raw = localStorage.getItem(getCustomersStorageKey(companySlug));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Erreur lecture clients locaux :', err);
  }

  saveCustomers(companySlug, DEFAULT_CUSTOMERS);
  return DEFAULT_CUSTOMERS;
}

export function saveCustomers(companySlug: string, customers: CustomerItem[]): void {
  if (typeof window === 'undefined') return;

  try {
    const key = getCustomersStorageKey(companySlug);
    localStorage.setItem(key, JSON.stringify(customers));

    window.dispatchEvent(
      new CustomEvent('lgv_customers_changed', {
        detail: { companySlug, customers },
      })
    );
  } catch (err) {
    console.warn('Erreur sauvegarde clients locaux :', err);
  }
}
