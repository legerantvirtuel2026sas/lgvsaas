/**
 * Registre de modules et configuration des cartes du Hub pour LGV SaaS
 * Piloté dynamiquement via les drapeaux de module (OPEN ou MAINTENANCE)
 */

import { ActivityCardKey, Permission } from '../auth/permissions';

export type CardStatus = 'OPEN' | 'MAINTENANCE';

export interface ActivityCardDefinition {
  key: ActivityCardKey;
  title: string;
  description: string;
  routePath: string; // Ex: /commerce, /services, /flotte, /consolidation
  defaultStatus: CardStatus;
  requiredPermission: Permission;
  requiredPack: string;
}

export interface MenuItemDefinition {
  id: string;
  label: string;
  path: string;
  category: 'corp' | 'commerce' | 'services' | 'fleet' | 'consolidation';
  requiredPermission: Permission;
  ownerOnly?: boolean;
}

export const ACTIVITY_CARDS: Record<ActivityCardKey, ActivityCardDefinition> = {
  COMMERCE: {
    key: 'COMMERCE',
    title: 'Gestion commerciale',
    description: 'Ventes, achats, articles, stocks, facturation e-MECeF et créances.',
    routePath: 'commerce/tableau-de-bord',
    defaultStatus: 'OPEN',
    requiredPermission: 'access.commerce',
    requiredPack: 'COMMERCE',
  },
  SERVICES: {
    key: 'SERVICES',
    title: 'Gestion des prestations et services',
    description: 'Prestations, contrats récurrents, interventions et suivi de rentabilité.',
    routePath: 'services',
    defaultStatus: 'MAINTENANCE',
    requiredPermission: 'access.services',
    requiredPack: 'SERVICES',
  },
  FLEET: {
    key: 'FLEET',
    title: 'Gestion de flotte et location',
    description: 'Parc automobile, véhicules, contrats de location, suivi kilométrique.',
    routePath: 'flotte',
    defaultStatus: 'MAINTENANCE',
    requiredPermission: 'access.fleet',
    requiredPack: 'FLEET',
  },
  CONSOLIDATION: {
    key: 'CONSOLIDATION',
    title: 'Consolidation des activités',
    description: 'Synthèse globale et rentabilité consolidée des trois activités de l’entreprise.',
    routePath: 'consolidation',
    defaultStatus: 'MAINTENANCE',
    requiredPermission: 'access.consolidation',
    requiredPack: 'MULTI_PACK',
  },
};

export const CORP_MENU_ITEMS: MenuItemDefinition[] = [
  {
    id: 'customers',
    label: 'Clients',
    path: 'corp/clients',
    category: 'corp',
    requiredPermission: 'customers.view',
  },
  {
    id: 'suppliers',
    label: 'Fournisseurs',
    path: 'corp/fournisseurs',
    category: 'corp',
    requiredPermission: 'suppliers.view',
  },
  {
    id: 'employees',
    label: 'Employés & Paie',
    path: 'corp/employes',
    category: 'corp',
    requiredPermission: 'employees.view',
  },
  {
    id: 'users',
    label: 'Utilisateurs & Droits',
    path: 'corp/utilisateurs',
    category: 'corp',
    requiredPermission: 'users.view',
  },
  {
    id: 'settings',
    label: 'Paramètres',
    path: 'corp/parametres',
    category: 'corp',
    requiredPermission: 'settings.view',
  },
  {
    id: 'license',
    label: 'Licence entreprise',
    path: 'corp/licence',
    category: 'corp',
    requiredPermission: 'settings.manage',
    ownerOnly: true,
  },
  {
    id: 'audit',
    label: "Journal d'audit",
    path: 'corp/audit',
    category: 'corp',
    requiredPermission: 'audit.view',
  },
];

export const COMMERCE_MENU_ITEMS: MenuItemDefinition[] = [
  {
    id: 'dashboard',
    label: 'Tableau de bord',
    path: 'commerce/tableau-de-bord',
    category: 'commerce',
    requiredPermission: 'access.commerce',
  },
  {
    id: 'products',
    label: 'Articles & Stock',
    path: 'commerce/articles',
    category: 'commerce',
    requiredPermission: 'products.view',
  },
  {
    id: 'purchases',
    label: 'Achats & Fournitures',
    path: 'commerce/achats',
    category: 'commerce',
    requiredPermission: 'purchases.view',
  },
  {
    id: 'sales',
    label: 'Ventes & Factures',
    path: 'commerce/ventes',
    category: 'commerce',
    requiredPermission: 'sales.view',
  },
  {
    id: 'payments',
    label: 'Paiements & Échéances',
    path: 'commerce/paiements',
    category: 'commerce',
    requiredPermission: 'payments.view',
  },
  {
    id: 'debtors',
    label: 'Clients redevables',
    path: 'commerce/redevables',
    category: 'commerce',
    requiredPermission: 'receivables.view',
  },
  {
    id: 'statistics',
    label: 'Statistiques & Bilan',
    path: 'commerce/statistiques',
    category: 'commerce',
    requiredPermission: 'stats.view',
  },
];

/**
 * Filtre les éléments de menu selon le rôle et les permissions de l'utilisateur.
 */
export function getAuthorizedMenuItems(
  role: 'OWNER' | 'ADMIN' | 'USER',
  userPermissions: string[],
  category: 'corp' | 'commerce'
): MenuItemDefinition[] {
  const items = category === 'corp' ? CORP_MENU_ITEMS : COMMERCE_MENU_ITEMS;

  return items.filter((item) => {
    if (item.ownerOnly && role !== 'OWNER') {
      return false;
    }
    if (role === 'OWNER') {
      return true;
    }
    return userPermissions.includes(item.requiredPermission);
  });
}
