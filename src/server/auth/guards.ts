/**
 * Gardes d'autorisation et d'isolation multi-tenant pour LGV SaaS
 * Garantit que toute Server Action ou API Route valide les droits côté serveur.
 */

import { Role, Permission, hasPermission, OWNER_ONLY_PERMISSIONS } from './permissions';
import { recordAuditEvent } from '../services/audit';

export interface AuthContext {
  userId: string;
  email: string;
  companyId: string;
  role: Role;
  permissions: string[];
  ipAddress?: string;
  userAgent?: string;
}

export class UnauthorizedError extends Error {
  readonly status = 401;
  constructor(message = 'Authentification requise') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  readonly status = 403;
  constructor(message = 'Accès non autorisé pour votre profil') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class SecurityInvariantError extends Error {
  readonly status = 422;
  constructor(message: string) {
    super(message);
    this.name = 'SecurityInvariantError';
  }
}

/**
 * Valide qu'un utilisateur possède la permission requise dans son contexte d'entreprise.
 * Enregistre une trace d'audit en cas de refus d'accès suspect.
 */
export async function assertAuthorized(
  ctx: AuthContext,
  requiredPermission: Permission
): Promise<void> {
  if (!ctx.userId || !ctx.companyId) {
    throw new UnauthorizedError();
  }

  // Règle invariante : users.delete est strictement interdit à tout rôle autre que OWNER
  if (requiredPermission === 'users.delete' && ctx.role !== 'OWNER') {
    await recordAuditEvent({
      companyId: ctx.companyId,
      userId: ctx.userId,
      action: 'security.violation.unauthorized_user_delete_attempt',
      resource: 'users',
      details: { role: ctx.role },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    throw new ForbiddenError('Seul le propriétaire de l’entreprise peut supprimer un utilisateur.');
  }

  const allowed = hasPermission(ctx.role, ctx.permissions, requiredPermission);
  if (!allowed) {
    await recordAuditEvent({
      companyId: ctx.companyId,
      userId: ctx.userId,
      action: 'security.access_denied',
      resource: requiredPermission,
      details: { role: ctx.role },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    throw new ForbiddenError(`Permission insuffisante : ${requiredPermission}`);
  }
}

/**
 * Invariant de sécurité : Vérifie qu'il reste au moins un propriétaire actif dans l'entreprise.
 */
export function assertLastOwnerProtected(
  targetUserId: string,
  allOwnersInCompany: { userId: string; isActive: boolean }[]
): void {
  const activeOwners = allOwnersInCompany.filter((o) => o.isActive);
  const isTargetAnActiveOwner = activeOwners.some((o) => o.userId === targetUserId);

  if (isTargetAnActiveOwner && activeOwners.length <= 1) {
    throw new SecurityInvariantError(
      'Impossible de retirer ou supprimer le dernier propriétaire actif de l’entreprise.'
    );
  }
}

/**
 * Invariant de sécurité : Empêche un utilisateur d'octroyer des droits supérieurs aux siens.
 */
export function assertNoPrivilegeEscalation(
  granterRole: Role,
  granterPermissions: string[],
  requestedRole: Role,
  requestedPermissions: string[]
): void {
  // Seul un OWNER peut créer ou promouvoir un autre OWNER
  if (requestedRole === 'OWNER' && granterRole !== 'OWNER') {
    throw new ForbiddenError('Seul un propriétaire peut attribuer le rôle Propriétaire.');
  }

  // Un ADMIN ne peut pas attribuer des permissions réservées au OWNER
  if (granterRole !== 'OWNER') {
    const hasForbiddenOwnerPerms = requestedPermissions.some((p) =>
      OWNER_ONLY_PERMISSIONS.includes(p as Permission)
    );
    if (hasForbiddenOwnerPerms) {
      throw new ForbiddenError('Impossible d’attribuer des permissions réservées au propriétaire.');
    }

    // Ne peut pas attribuer une permission qu'il ne détient pas lui-même
    const unauthorizedPerms = requestedPermissions.filter((p) => !granterPermissions.includes(p));
    if (unauthorizedPerms.length > 0) {
      throw new ForbiddenError(
        `Élévation de privilèges refusée pour les permissions : ${unauthorizedPerms.join(', ')}`
      );
    }
  }
}
