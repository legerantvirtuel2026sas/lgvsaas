/**
 * Catalogue exhaustif des rôles et permissions RBAC pour LGV SaaS
 * Format des permissions : ressource.action ou access.carte
 */

export type Role = 'OWNER' | 'ADMIN' | 'USER';

export type ActivityCardKey = 'COMMERCE' | 'SERVICES' | 'FLEET' | 'CONSOLIDATION';

export const ALL_PERMISSIONS = [
  // Accès aux 4 cartes d'activité
  'access.commerce',
  'access.services',
  'access.fleet',
  'access.consolidation',

  // Permissions sensibles spécifiques
  'costs.view',   // Voir les prix de revient d'achat
  'profit.view',  // Voir les marges et bénéfices
  'payroll.view', // Voir les fiches de paie et salaires

  // Référentiels Clients & Fournisseurs
  'customers.view',
  'customers.create',
  'customers.update',
  'customers.delete',
  'suppliers.view',
  'suppliers.create',
  'suppliers.update',
  'suppliers.delete',

  // Articles & Stock
  'products.view',
  'products.create',
  'products.update',
  'products.delete',
  'stock.view',
  'stock.adjust',

  // Achats
  'purchases.view',
  'purchases.create',
  'purchases.update',
  'purchases.validate',
  'purchases.delete',

  // Ventes & Proformas
  'proformas.view',
  'proformas.create',
  'proformas.update',
  'proformas.delete',
  'sales.view',
  'sales.create',
  'sales.update',
  'sales.validate',
  'sales.cancel',
  'sales.delete',

  // Règlements & Créances
  'payments.view',
  'payments.create',
  'receivables.view',

  // Normalisation e-MECeF
  'emecef.view',
  'emecef.normalize',
  'emecef.manage',

  // Statistiques & Exports
  'stats.view',
  'exports.export',

  // Employés & Paie
  'employees.view',
  'employees.create',
  'employees.update',
  'employees.delete',
  'payroll.calculate',
  'payroll.manage',

  // Utilisateurs & Droits
  'users.view',
  'users.create',
  'users.update',
  'users.delete', // Réservé strictement à OWNER

  // Paramètres & Audit
  'settings.view',
  'settings.manage', // Réservé strictement à OWNER
  'audit.view',
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

/**
 * Permissions réservées strictement au rôle OWNER (impossible à concéder à ADMIN ou USER).
 */
export const OWNER_ONLY_PERMISSIONS: Permission[] = [
  'users.delete',
  'settings.manage',
];

/**
 * Matrice de permissions par défaut attribuée à l'administrateur
 * L'administrateur a accès à la quasi-totalité des opérations sauf la suppression d'utilisateurs
 * et la gestion de la licence / suppression de l'entreprise.
 */
export const ADMIN_DEFAULT_PERMISSIONS: Permission[] = ALL_PERMISSIONS.filter(
  (perm) => !OWNER_ONLY_PERMISSIONS.includes(perm)
);

/**
 * Matrice minimale pour un nouvel utilisateur (vendeur standard)
 */
export const USER_DEFAULT_PERMISSIONS: Permission[] = [
  'access.commerce',
  'customers.view',
  'customers.create',
  'products.view',
  'sales.view',
  'sales.create',
  'proformas.view',
  'proformas.create',
  'payments.view',
  'payments.create',
];

/**
 * Vérifie si un ensemble de permissions accorde une permission donnée, compte tenu du rôle.
 * Règle invariante : les OWNER_ONLY_PERMISSIONS ne sont JAMAIS accessibles à ADMIN ou USER,
 * même en cas d'injection malveillante dans la liste des permissions en base.
 */
export function hasPermission(
  role: Role,
  grantedPermissions: string[],
  requiredPermission: Permission
): boolean {
  // OWNER possède absolument toutes les permissions
  if (role === 'OWNER') {
    return true;
  }

  // Les permissions réservées à OWNER sont strictement interdites à tout autre rôle
  if (OWNER_ONLY_PERMISSIONS.includes(requiredPermission)) {
    return false;
  }

  // ADMIN a tout sauf les permissions réservées strictement à OWNER
  if (role === 'ADMIN') {
    return true;
  }

  // USER dépend des permissions explicites concédées
  return grantedPermissions.includes(requiredPermission);
}
