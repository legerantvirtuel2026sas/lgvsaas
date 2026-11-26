'use server';

import { cookies } from 'next/headers';
import { prisma } from '../db/client';
import { hashPassword, verifyPassword } from '../auth/crypto';
import { createSession, revokeSession } from '../auth/session';
import { verifyTotpToken } from '../auth/totp';
import { registerSchema, loginSchema, RegisterInput, LoginInput } from '../schemas/auth.schema';
import { recordAuditEvent } from '../services/audit';
import { checkRateLimit } from '../auth/ratelimit';
import { devAuthStore } from '../auth/dev-store';

const COOKIE_NAME = 'auth_session';

export async function registerAction(input: RegisterInput) {
  try {
    const rateLimit = await checkRateLimit(`register_${input.email}`, { limit: 5, windowMs: 60_000 });
    if (!rateLimit.success) {
      return { success: false, error: 'Trop de tentatives d’inscription. Veuillez patienter une minute.' };
    }

    const validated = registerSchema.safeParse(input);
    if (!validated.success) {
      return { success: false, error: validated.error.errors[0]?.message || 'Données invalides' };
    }

    const cleanEmail = validated.data.email.toLowerCase().trim();

    // Vérification de l'existence de l'email
    let existing = null;
    let isDbOnline = true;

    try {
      existing = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });
    } catch {
      isDbOnline = false;
      existing = devAuthStore.getUserByEmail(cleanEmail);
    }

    if (existing) {
      return {
        success: false,
        error: 'Un compte avec cette adresse email existe déjà. Veuillez vous connecter ou réinitialiser votre mot de passe.',
      };
    }

    const passwordHash = await hashPassword(validated.data.password);
    let user: { id: string; email: string; fullName: string };

    if (isDbOnline) {
      try {
        const created = await prisma.user.create({
          data: {
            email: cleanEmail,
            fullName: validated.data.fullName.trim(),
            phone: validated.data.phone.trim(),
            passwordHash,
            emailVerified: new Date(),
          },
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        });
        user = created;
      } catch {
        const devUser = devAuthStore.createUser({
          email: cleanEmail,
          fullName: validated.data.fullName.trim(),
          phone: validated.data.phone.trim(),
          passwordHash,
        });
        user = {
          id: devUser.id,
          email: devUser.email,
          fullName: devUser.fullName,
        };
      }
    } else {
      const devUser = devAuthStore.createUser({
        email: cleanEmail,
        fullName: validated.data.fullName.trim(),
        phone: validated.data.phone.trim(),
        passwordHash,
      });
      user = {
        id: devUser.id,
        email: devUser.email,
        fullName: devUser.fullName,
      };
    }

    const session = await createSession(user.id);

    cookies().set(COOKIE_NAME, session.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: session.expiresAt,
    });

    await recordAuditEvent({
      userId: user.id,
      action: 'auth.register',
      resource: 'user',
      resourceId: user.id,
      details: { email: user.email },
    });

    return { success: true, user };
  } catch (err: unknown) {
    console.error('Erreur registerAction:', err);
    const message = err instanceof Error ? err.message : 'Une erreur inattendue est survenue.';
    return { success: false, error: message };
  }
}

export async function loginAction(input: LoginInput) {
  try {
    const rateLimit = await checkRateLimit(`login_${input.email}`, { limit: 10, windowMs: 60_000 });
    if (!rateLimit.success) {
      return { success: false, error: 'Trop de tentatives de connexion. Réessayez dans une minute.' };
    }

    const validated = loginSchema.safeParse(input);
    if (!validated.success) {
      return { success: false, error: 'Email ou mot de passe invalide.' };
    }

    const cleanEmail = validated.data.email.toLowerCase().trim();
    let user: any = null;

    try {
      user = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });
    } catch {
      user = devAuthStore.getUserByEmail(cleanEmail);
    }

    if (!user) {
      return { success: false, error: 'Identifiants incorrects.' };
    }

    const isPasswordValid = await verifyPassword(validated.data.password, user.passwordHash);
    if (!isPasswordValid) {
      await recordAuditEvent({
        userId: user.id,
        action: 'auth.login_failed_bad_password',
        resource: 'user',
        resourceId: user.id,
      });
      return { success: false, error: 'Identifiants incorrects.' };
    }

    // Si le 2FA est activé
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      if (!validated.data.twoFactorCode) {
        return { success: false, requires2FA: true, error: 'Code d’authentification à 6 chiffres requis.' };
      }
      const isTotpValid = verifyTotpToken(validated.data.twoFactorCode, user.twoFactorSecret);
      if (!isTotpValid) {
        return { success: false, requires2FA: true, error: 'Code 2FA incorrect ou expiré.' };
      }
    }

    const session = await createSession(user.id);

    cookies().set(COOKIE_NAME, session.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: session.expiresAt,
    });

    await recordAuditEvent({
      userId: user.id,
      action: 'auth.login_success',
      resource: 'user',
      resourceId: user.id,
    });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
    };
  } catch (err: unknown) {
    console.error('Erreur loginAction:', err);
    const message = err instanceof Error ? err.message : 'Une erreur inattendue est survenue.';
    return { success: false, error: message };
  }
}

export async function logoutAction() {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (token) {
    await revokeSession(token);
    cookies().delete(COOKIE_NAME);
  }
  return { success: true };
}
