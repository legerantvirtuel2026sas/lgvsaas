'use server';

import { cookies } from 'next/headers';
import { validateSessionToken } from '../auth/session';
import { prisma } from '../db/client';
import { userManagementService } from '../services/user-management.service';
import { AuthContext, UnauthorizedError, ForbiddenError } from '../auth/guards';
import {
  InviteUserInput,
  UpdateUserPermissionsInput,
  AttachUserCrossCompanyInput,
} from '../schemas/user-management.schema';

const COOKIE_NAME = 'auth_session';

async function buildAuthContext(companyId: string): Promise<AuthContext> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) throw new UnauthorizedError();

  const user = await validateSessionToken(token);
  if (!user) throw new UnauthorizedError();

  const membership = await prisma.membership.findUnique({
    where: {
      userId_companyId: {
        userId: user.id,
        companyId,
      },
    },
  });

  if (!membership || !membership.isActive) {
    throw new ForbiddenError('Accès non autorisé à cette entreprise');
  }

  return {
    userId: user.id,
    email: user.email,
    companyId,
    role: membership.role,
    permissions: membership.permissions,
  };
}

export async function inviteUserAction(input: InviteUserInput) {
  try {
    const ctx = await buildAuthContext(input.companyId);
    const member = await userManagementService.inviteUser(ctx, input);
    return { success: true, member };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Erreur invitation' };
  }
}

export async function updateUserPermissionsAction(input: UpdateUserPermissionsInput) {
  try {
    const ctx = await buildAuthContext(input.companyId);
    const updated = await userManagementService.updatePermissions(ctx, input);
    return { success: true, member: updated };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Erreur modification droits' };
  }
}

export async function deleteUserAction(companyId: string, targetUserId: string) {
  try {
    const ctx = await buildAuthContext(companyId);
    await userManagementService.deleteUser(ctx, companyId, targetUserId);
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Erreur suppression utilisateur' };
  }
}

export async function attachUserCrossCompanyAction(input: AttachUserCrossCompanyInput) {
  try {
    const ctx = await buildAuthContext(input.targetCompanyId);
    const attached = await userManagementService.attachUserCrossCompany(ctx, input);
    return { success: true, member: attached };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Erreur rattachement inter-entreprises' };
  }
}

export async function listCompanyMembersAction(companyId: string) {
  try {
    const ctx = await buildAuthContext(companyId);
    const data = await userManagementService.listCompanyMembers(ctx, companyId);
    return { success: true, ...data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Erreur chargement membres', members: [] };
  }
}
