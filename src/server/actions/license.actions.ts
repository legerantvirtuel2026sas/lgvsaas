'use server';

import { cookies } from 'next/headers';
import { validateSessionToken } from '../auth/session';
import { licenseService } from '../services/license.service';
import { PlanCode, PackCode } from '../domain/pricing';

const COOKIE_NAME = 'auth_session';

async function getAuthenticatedUserOrThrow() {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) throw new Error('Authentification requise');
  const user = await validateSessionToken(token);
  if (!user) throw new Error('Session expirée');
  return user;
}

export async function orderLicenseAction(
  companyId: string,
  planCode: PlanCode,
  packs: PackCode[]
) {
  try {
    const user = await getAuthenticatedUserOrThrow();
    const result = await licenseService.createSubscriptionOrder(
      user.id,
      companyId,
      planCode,
      packs
    );

    return {
      success: true,
      paymentUrl: result.paymentUrl,
      orderId: result.orderId,
      amountTtc: result.amountTtc,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur lors de la création de la commande';
    return {
      success: false,
      error: message,
    };
  }
}

export async function manualActivateLicenseAction(
  companyId: string,
  planCode: PlanCode,
  packs: PackCode[],
  justification: string
) {
  try {
    const user = await getAuthenticatedUserOrThrow();
    const license = await licenseService.manualActivateLicense(
      user.id,
      companyId,
      planCode,
      packs,
      justification
    );

    return {
      success: true,
      license,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur lors de l’activation manuelle';
    return {
      success: false,
      error: message,
    };
  }
}
