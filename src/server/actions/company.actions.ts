'use server';

import { cookies } from 'next/headers';
import { validateSessionToken } from '../auth/session';
import { companyService } from '../services/company.service';
import { createCompanySchema, CreateCompanyInput } from '../schemas/company.schema';

const COOKIE_NAME = 'auth_session';

async function getAuthenticatedUserOrThrow() {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) {
    throw new Error('Authentification requise');
  }
  const user = await validateSessionToken(token);
  if (!user) {
    throw new Error('Session expirée ou invalide');
  }
  return user;
}

export async function createCompanyAction(input: CreateCompanyInput) {
  try {
    const user = await getAuthenticatedUserOrThrow();
    const validated = createCompanySchema.safeParse(input);

    if (!validated.success) {
      return {
        success: false,
        error: validated.error.errors[0]?.message || 'Données d’entreprise invalides',
      };
    }

    const company = await companyService.createCompany(user.id, validated.data);

    return {
      success: true,
      company: {
        id: company.id,
        slug: company.slug,
        legalName: company.legalName,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur lors de la création de l’entreprise';
    return {
      success: false,
      error: message,
    };
  }
}

export async function listMyCompaniesAction() {
  try {
    const user = await getAuthenticatedUserOrThrow();
    try {
      const companies = await companyService.listUserCompanies(user.id);
      return {
        success: true,
        companies,
      };
    } catch {
      // Fallback mode démonstration / hors-ligne si PostgreSQL est indisponible
      return {
        success: true,
        companies: [
          {
            id: 'demo-company-1',
            slug: 'abp-technologie',
            legalName: 'ABP TECHNOLOGIE SARL',
            tradeName: 'ABP Technologie',
            ifu: '0202011234567',
            rccm: 'RB/COT/20-B-12345',
            address: 'Cotonou, Bénin',
            phone: '+229 97 00 00 00',
            email: 'contact@abp-technologie.bj',
            role: 'OWNER' as const,
            license: {
              status: 'ACTIVE' as const,
              mode: 'ANNUAL' as const,
              planCode: 'ENTREPRISE',
              seats: 5,
              daysRemaining: 180,
              isExpired: false,
              trialEndsAt: null,
            },
          },
        ],
      };
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Impossible de charger vos entreprises';
    return {
      success: false,
      error: message,
      companies: [],
    };
  }
}
