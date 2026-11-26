/**
 * Service de gestion des sessions utilisateur en base de données pour LGV SaaS
 * Sessions révocables individuellement (liste d'appareils connectés).
 */

import { prisma } from '../db/client';
import { generateSecureToken } from './crypto';
import { devAuthStore } from './dev-store';

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

  try {
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
  } catch {
    // Mode secours autonome (dev-store) quand PostgreSQL est injoignable
    const devUser = devAuthStore.getUserById(userId);
    devAuthStore.createSession(userId, token, expiresAt);
    return {
      sessionToken: token,
      user: devUser
        ? {
            id: devUser.id,
            email: devUser.email,
            fullName: devUser.fullName,
            twoFactorEnabled: devUser.twoFactorEnabled,
          }
        : {
            id: userId,
            email: 'utilisateur@abp-technologie.bj',
            fullName: 'Utilisateur LGV',
            twoFactorEnabled: false,
          },
      expiresAt,
    };
  }
}

/**
 * Valide un jeton de session et renvoie les détails de l'utilisateur actif.
 */
export async function validateSessionToken(token: string): Promise<SessionUser | null> {
  if (!token) return null;

  try {
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

    if (session) {
      // Si la session est expirée, la révoquer immédiatement
      if (session.expiresAt < new Date()) {
        await prisma.session.delete({ where: { token } }).catch(() => null);
        return null;
      }
      return session.user;
    }
  } catch {
    // Erreur de connexion DB : tester le store local de secours
  }

  // Fallback devAuthStore
  const devData = devAuthStore.getSession(token);
  if (devData) {
    return {
      id: devData.user.id,
      email: devData.user.email,
      fullName: devData.user.fullName,
      twoFactorEnabled: devData.user.twoFactorEnabled,
    };
  }

  return null;
}

/**
 * Révoque une session spécifique (déconnexion ou appareil retiré).
 */
export async function revokeSession(token: string): Promise<void> {
  if (!token) return;
  try {
    await prisma.session.deleteMany({
      where: { token },
    });
  } catch {
    // Ignorer si postgres est indisponible
  }
  devAuthStore.deleteSession(token);
}

/**
 * Révoque toutes les sessions d'un utilisateur (réinitialisation mot de passe, compromission).
 */
export async function revokeAllUserSessions(userId: string): Promise<void> {
  try {
    await prisma.session.deleteMany({
      where: { userId },
    });
  } catch {
    // Ignorer si postgres est indisponible
  }
}
