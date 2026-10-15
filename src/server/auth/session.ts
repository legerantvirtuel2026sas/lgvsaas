/**
 * Service de gestion des sessions utilisateur en base de données pour LGV SaaS
 * Sessions révocables individuellement (liste d'appareils connectés).
 */

import { prisma } from '../db/client';
import { generateSecureToken } from './crypto';

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  twoFactorEnabled: boolean;
}

export interface UserSessionPayload {
  sessionToken: string;
  user: SessionUser;
  expiresAt: Date;
}

const SESSION_DURATION_DAYS = 30;

/**
 * Crée une nouvelle session persistante en base pour un utilisateur.
 */
export async function createSession(
  userId: string,
  meta?: { ipAddress?: string; userAgent?: string }
): Promise<UserSessionPayload> {
  const token = generateSecureToken(32);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  const session = await prisma.session.create({
    data: {
      userId,
      token,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      expiresAt,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          twoFactorEnabled: true,
        },
      },
    },
  });

  return {
    sessionToken: session.token,
    user: session.user,
    expiresAt: session.expiresAt,
  };
}

/**
 * Valide un jeton de session et renvoie les détails de l'utilisateur actif.
 */
export async function validateSessionToken(token: string): Promise<SessionUser | null> {
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          twoFactorEnabled: true,
        },
      },
    },
  });

  if (!session) return null;

  // Si la session est expirée, la révoquer immédiatement
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { token } }).catch(() => null);
    return null;
  }

  return session.user;
}

/**
 * Révoque une session spécifique (déconnexion ou appareil retiré).
 */
export async function revokeSession(token: string): Promise<void> {
  if (!token) return;
  await prisma.session.deleteMany({
    where: { token },
  });
}

/**
 * Révoque toutes les sessions d'un utilisateur (réinitialisation mot de passe, compromission).
 */
export async function revokeAllUserSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { userId },
  });
}
