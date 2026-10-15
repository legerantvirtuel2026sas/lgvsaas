'use server';

import { cookies } from 'next/headers';
import { prisma } from '../db/client';
import { hashPassword, verifyPassword } from '../auth/crypto';
import { createSession, revokeSession } from '../auth/session';
import { verifyTotpToken } from '../auth/totp';
import { registerSchema, loginSchema, RegisterInput, LoginInput } from '../schemas/auth.schema';
import { recordAuditEvent } from '../services/audit';
import { checkRateLimit } from '../auth/ratelimit';

const COOKIE_NAME = 'auth_session';

export async function registerAction(input: RegisterInput) {
  const rateLimit = await checkRateLimit(`register_${input.email}`, { limit: 5, windowMs: 60_000 });
  if (!rateLimit.success) {
    return { success: false, error: 'Trop de tentatives d’inscription. Veuillez patienter.' };
  }

  const validated = registerSchema.safeParse(input);
  if (!validated.success) {
    return { success: false, error: validated.error.errors[0]?.message || 'Données invalides' };
  }

  const existing = await prisma.user.findUnique({
    where: { email: validated.data.email.toLowerCase().trim() },
  });

  if (existing) {
    return { success: false, error: 'Un compte avec cette adresse email existe déjà.' };
  }

  const passwordHash = await hashPassword(validated.data.password);

  const user = await prisma.user.create({
    data: {
      email: validated.data.email.toLowerCase().trim(),
      fullName: validated.data.fullName.trim(),
      phone: validated.data.phone.trim(),
      passwordHash,
      emailVerified: new Date(), // Enregistrement validé
    },
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  });

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
}

export async function loginAction(input: LoginInput) {
  const rateLimit = await checkRateLimit(`login_${input.email}`, { limit: 10, windowMs: 60_000 });
  if (!rateLimit.success) {
    return { success: false, error: 'Trop de tentatives de connexion. Réessayez dans une minute.' };
  }

  const validated = loginSchema.safeParse(input);
  if (!validated.success) {
    return { success: false, error: 'Email ou mot de passe invalide.' };
  }

  const user = await prisma.user.findUnique({
    where: { email: validated.data.email.toLowerCase().trim() },
  });

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
}

export async function logoutAction() {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (token) {
    await revokeSession(token);
    cookies().delete(COOKIE_NAME);
  }
  return { success: true };
}
