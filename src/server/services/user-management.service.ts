import { prisma } from '../db/client';
import {
  assertAuthorized,
  assertLastOwnerProtected,
  assertNoPrivilegeEscalation,
  ForbiddenError,
  AuthContext,
} from '../auth/guards';
import {
  InviteUserInput,
  UpdateUserPermissionsInput,
  AttachUserCrossCompanyInput,
  inviteUserSchema,
  updateUserPermissionsSchema,
  attachUserCrossCompanySchema,
} from '../schemas/user-management.schema';
import { recordAuditEvent } from './audit';
import { hashPassword, generateSecureToken } from '../auth/crypto';
import { ADMIN_DEFAULT_PERMISSIONS, USER_DEFAULT_PERMISSIONS } from '../auth/permissions';

export const userManagementService = {
  /**
   * Vérifie si l'entreprise a encore des postes de travail (sièges) disponibles dans sa licence.
   */
  async checkSeatAvailability(companyId: string): Promise<{ available: boolean; used: number; max: number }> {
    const license = await prisma.license.findUnique({
      where: { companyId },
    });

    const maxSeats = license?.seats || 5;

    const usedSeats = await prisma.membership.count({
      where: {
        companyId,
        isActive: true,
      },
    });

    return {
      available: usedSeats < maxSeats,
      used: usedSeats,
      max: maxSeats,
    };
  },

  /**
   * Invite ou associe un utilisateur dans une entreprise avec un rôle et des permissions définis.
   */
  async inviteUser(ctx: AuthContext, rawInput: InviteUserInput) {
    await assertAuthorized(ctx, 'users.create');
    const validated = inviteUserSchema.parse(rawInput);

    if (validated.companyId !== ctx.companyId) {
      throw new ForbiddenError('Opération non autorisée sur cette entreprise.');
    }

    // 1. Contrôle du quota de postes
    const seatCheck = await this.checkSeatAvailability(validated.companyId);
    if (!seatCheck.available) {
      throw new Error(
        `Limite de postes atteinte (${seatCheck.used}/${seatCheck.max}). Veuillez passer à une formule supérieure pour ajouter des collaborateurs.`
      );
    }

    // 2. Anti-élévation de privilèges
    assertNoPrivilegeEscalation(
      ctx.role,
      ctx.permissions,
      validated.role,
      validated.permissions
    );

    // 3. Trouver ou créer le compte global de l'utilisateur
    let user = await prisma.user.findUnique({
      where: { email: validated.email.toLowerCase().trim() },
    });

    if (!user) {
      const tempPassword = generateSecureToken(16);
      const passwordHash = await hashPassword(tempPassword);

      user = await prisma.user.create({
        data: {
          email: validated.email.toLowerCase().trim(),
          fullName: validated.fullName.trim(),
          phone: validated.phone?.trim() || null,
          passwordHash,
          emailVerified: new Date(),
        },
      });
    }

    // 4. Vérifier si l'utilisateur n'est pas déjà membre
    const existingMembership = await prisma.membership.findUnique({
      where: {
        userId_companyId: {
          userId: user.id,
          companyId: validated.companyId,
        },
      },
    });

    if (existingMembership) {
      throw new Error('Cet utilisateur est déjà rattaché à cette entreprise.');
    }

    const defaultPerms =
      validated.role === 'ADMIN' ? ADMIN_DEFAULT_PERMISSIONS : USER_DEFAULT_PERMISSIONS;
    const finalPermissions = validated.permissions.length > 0 ? validated.permissions : defaultPerms;

    // 5. Créer l'appartenance
    const membership = await prisma.membership.create({
      data: {
        userId: user.id,
        companyId: validated.companyId,
        role: validated.role,
        permissions: finalPermissions as string[],
        isActive: true,
      },
      include: {
        user: {
          select: { id: true, email: true, fullName: true, phone: true },
        },
      },
    });

    await recordAuditEvent({
      companyId: validated.companyId,
      userId: ctx.userId,
      action: 'users.invited',
      resource: 'membership',
      resourceId: membership.id,
      details: {
        invitedEmail: user.email,
        role: validated.role,
        permissionsCount: finalPermissions.length,
      },
    });

    return membership;
  },

  /**
   * Modifie le rôle et les permissions d'un membre.
   */
  async updatePermissions(ctx: AuthContext, rawInput: UpdateUserPermissionsInput) {
    await assertAuthorized(ctx, 'users.update');
    const validated = updateUserPermissionsSchema.parse(rawInput);

    if (validated.companyId !== ctx.companyId) {
      throw new ForbiddenError('Opération non autorisée sur cette entreprise.');
    }

    // 1. Anti-élévation de privilèges
    assertNoPrivilegeEscalation(
      ctx.role,
      ctx.permissions,
      validated.role,
      validated.permissions
    );

    // 2. Protection du dernier propriétaire actif
    const allOwners = await prisma.membership.findMany({
      where: { companyId: validated.companyId, role: 'OWNER' },
      select: { userId: true, isActive: true },
    });

    if (validated.role !== 'OWNER' || !validated.isActive) {
      assertLastOwnerProtected(validated.targetUserId, allOwners);
    }

    const updated = await prisma.membership.update({
      where: {
        userId_companyId: {
          userId: validated.targetUserId,
          companyId: validated.companyId,
        },
      },
      data: {
        role: validated.role,
        permissions: validated.permissions,
        isActive: validated.isActive,
      },
    });

    await recordAuditEvent({
      companyId: validated.companyId,
      userId: ctx.userId,
      action: 'users.permissions_updated',
      resource: 'membership',
      resourceId: updated.id,
      details: {
        targetUserId: validated.targetUserId,
        newRole: validated.role,
        isActive: validated.isActive,
      },
    });

    return updated;
  },

  /**
   * Supprime un utilisateur d'une entreprise (strictement réservé au rôle OWNER).
   */
  async deleteUser(ctx: AuthContext, companyId: string, targetUserId: string) {
    await assertAuthorized(ctx, 'users.delete');

    if (companyId !== ctx.companyId) {
      throw new ForbiddenError('Opération non autorisée sur cette entreprise.');
    }

    // Protection du dernier propriétaire
    const allOwners = await prisma.membership.findMany({
      where: { companyId, role: 'OWNER' },
      select: { userId: true, isActive: true },
    });

    assertLastOwnerProtected(targetUserId, allOwners);

    await prisma.membership.delete({
      where: {
        userId_companyId: {
          userId: targetUserId,
          companyId,
        },
      },
    });

    await recordAuditEvent({
      companyId,
      userId: ctx.userId,
      action: 'users.deleted',
      resource: 'membership',
      resourceId: targetUserId,
      details: { targetUserId },
    });

    return { success: true };
  },

  /**
   * Rattache un utilisateur de l'entreprise A vers l'entreprise B en copiant son rôle et ses permissions.
   * Exige que l'utilisateur exécutant soit OWNER de A ET OWNER de B.
   */
  async attachUserCrossCompany(ctx: AuthContext, rawInput: AttachUserCrossCompanyInput) {
    const validated = attachUserCrossCompanySchema.parse(rawInput);

    // 1. Vérifier que ctx.userId est OWNER des deux entreprises
    const ownerCheck = await prisma.membership.findMany({
      where: {
        userId: ctx.userId,
        role: 'OWNER',
        isActive: true,
        companyId: { in: [validated.sourceCompanyId, validated.targetCompanyId] },
      },
    });

    if (ownerCheck.length < 2) {
      throw new ForbiddenError(
        'Vous devez être propriétaire des deux entreprises pour effectuer un rattachement de collaborateur.'
      );
    }

    // 2. Vérifier les postes disponibles dans l'entreprise cible B
    const seatCheck = await this.checkSeatAvailability(validated.targetCompanyId);
    if (!seatCheck.available) {
      throw new Error('Limite de postes de travail atteinte dans l’entreprise de destination.');
    }

    // 3. Lire l'appartenance source dans A
    const sourceMembership = await prisma.membership.findUnique({
      where: {
        userId_companyId: {
          userId: validated.targetUserId,
          companyId: validated.sourceCompanyId,
        },
      },
    });

    if (!sourceMembership) {
      throw new Error('L’utilisateur n’est pas membre de l’entreprise source.');
    }

    // 4. Créer la nouvelle appartenance indépendante dans B
    const newMembership = await prisma.membership.create({
      data: {
        userId: validated.targetUserId,
        companyId: validated.targetCompanyId,
        role: sourceMembership.role,
        permissions: sourceMembership.permissions,
        isActive: true,
      },
    });

    await recordAuditEvent({
      companyId: validated.targetCompanyId,
      userId: ctx.userId,
      action: 'users.attached_cross_company',
      resource: 'membership',
      resourceId: newMembership.id,
      details: {
        targetUserId: validated.targetUserId,
        fromCompanyId: validated.sourceCompanyId,
        toCompanyId: validated.targetCompanyId,
      },
    });

    return newMembership;
  },

  /**
   * Liste les membres d'une entreprise avec statistiques de sièges.
   */
  async listCompanyMembers(ctx: AuthContext, companyId: string) {
    await assertAuthorized(ctx, 'users.view');

    const members = await prisma.membership.findMany({
      where: { companyId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const seatCheck = await this.checkSeatAvailability(companyId);

    return {
      members,
      seats: seatCheck,
    };
  },
};
