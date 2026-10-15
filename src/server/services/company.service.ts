import { prisma } from '../db/client';
import { CreateCompanyInput, createCompanySchema, generateCompanySlug } from '../schemas/company.schema';
import { recordAuditEvent } from './audit';
import { ALL_PERMISSIONS } from '../auth/permissions';
import { ForbiddenError } from '../auth/guards';

export interface CompanyWithLicenseInfo {
  id: string;
  slug: string;
  legalName: string;
  tradeName: string | null;
  ifu: string;
  rccm: string | null;
  address: string;
  phone: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'USER';
  license: {
    status: 'TRIAL' | 'ACTIVE' | 'GRACE' | 'EXPIRED' | 'SUSPENDED';
    mode: 'TRIAL' | 'ANNUAL';
    planCode: string;
    seats: number;
    daysRemaining: number;
    isExpired: boolean;
    trialEndsAt: Date | null;
  };
}

export const companyService = {
  /**
   * Crée une nouvelle entreprise et attache le créateur en tant que OWNER absolu.
   * Déclenche un essai de 7 jours si l'IFU est éligible (1 seul essai par IFU sur toute la plateforme).
   */
  async createCompany(userId: string, rawInput: CreateCompanyInput) {
    const validated = createCompanySchema.parse(rawInput);
    const normalizedIfu = validated.ifu.trim();

    // Vérifier si cet IFU a déjà bénéficié d'un essai sur la plateforme
    const existingCompanyWithIfu = await prisma.company.findUnique({
      where: { ifu: normalizedIfu },
      include: { license: true },
    });

    const isEligibleForTrial = !existingCompanyWithIfu;

    // Calculer les dates de l'essai de 7 jours
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    let baseSlug = generateCompanySlug(validated.tradeName || validated.legalName);
    // Gestion des collisions éventuelles de slug
    const existingSlug = await prisma.company.findUnique({ where: { slug: baseSlug } });
    if (existingSlug) {
      baseSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;
    }

    const company = await prisma.$transaction(async (tx) => {
      // 1. Créer l'entreprise
      const createdCompany = await tx.company.create({
        data: {
          slug: baseSlug,
          legalName: validated.legalName,
          tradeName: validated.tradeName,
          ifu: normalizedIfu,
          rccm: validated.rccm,
          address: validated.address,
          phone: validated.phone,
          email: validated.email,
          logoUrl: validated.logoUrl || null,
          settings: {
            create: {
              currency: 'XOF',
              timezone: 'Africa/Porto-Novo',
              allowNegativeStock: false,
              defaultVatRate: 18,
              defaultAibRate: 1,
            },
          },
        },
      });

      // 2. Attacher le créateur avec le rôle OWNER et toutes les permissions
      await tx.membership.create({
        data: {
          userId,
          companyId: createdCompany.id,
          role: 'OWNER',
          permissions: [...ALL_PERMISSIONS],
          isActive: true,
        },
      });

      // 3. Créer la licence (essai de 7 jours Pro avec 5 postes si éligible, sinon expirée)
      await tx.license.create({
        data: {
          companyId: createdCompany.id,
          planCode: 'PRO',
          packs: ['COMMERCE'],
          mode: 'TRIAL',
          status: isEligibleForTrial ? 'TRIAL' : 'EXPIRED',
          seats: 5,
          trialEndsAt: isEligibleForTrial ? trialEndsAt : now,
        },
      });

      return createdCompany;
    });

    // Journalisation d'audit
    await recordAuditEvent({
      companyId: company.id,
      userId,
      action: 'company.created',
      resource: 'company',
      resourceId: company.id,
      details: {
        legalName: company.legalName,
        ifu: normalizedIfu,
        trialGranted: isEligibleForTrial,
      },
    });

    return company;
  },

  /**
   * Récupère la liste de toutes les entreprises accessibles par un utilisateur avec l'état de leur licence.
   */
  async listUserCompanies(userId: string): Promise<CompanyWithLicenseInfo[]> {
    const memberships = await prisma.membership.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        company: {
          include: {
            license: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const now = new Date();

    return memberships.map((m) => {
      const comp = m.company;
      const lic = comp.license;

      let daysRemaining = 0;
      let isExpired = false;

      if (lic) {
        if (lic.status === 'TRIAL' && lic.trialEndsAt) {
          const diffMs = lic.trialEndsAt.getTime() - now.getTime();
          daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
          isExpired = diffMs <= 0;
        } else if (lic.status === 'ACTIVE' && lic.endsAt) {
          const diffMs = lic.endsAt.getTime() - now.getTime();
          daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
          isExpired = diffMs <= 0;
        } else if (lic.status === 'EXPIRED') {
          isExpired = true;
          daysRemaining = 0;
        }
      }

      return {
        id: comp.id,
        slug: comp.slug,
        legalName: comp.legalName,
        tradeName: comp.tradeName,
        ifu: comp.ifu,
        rccm: comp.rccm,
        address: comp.address,
        phone: comp.phone,
        email: comp.email,
        role: m.role,
        license: {
          status: isExpired && lic?.status === 'TRIAL' ? 'EXPIRED' : lic?.status || 'EXPIRED',
          mode: lic?.mode || 'TRIAL',
          planCode: lic?.planCode || 'PRO',
          seats: lic?.seats || 5,
          daysRemaining,
          isExpired,
          trialEndsAt: lic?.trialEndsAt || null,
        },
      };
    });
  },

  /**
   * Vérifie l'appartenance d'un utilisateur à une entreprise identifiée par son slug.
   */
  async getCompanyBySlugForUser(slug: string, userId: string) {
    const company = await prisma.company.findUnique({
      where: { slug },
      include: {
        license: true,
        settings: true,
      },
    });

    if (!company) {
      throw new ForbiddenError('Entreprise introuvable');
    }

    const membership = await prisma.membership.findUnique({
      where: {
        userId_companyId: {
          userId,
          companyId: company.id,
        },
      },
    });

    if (!membership || !membership.isActive) {
      throw new ForbiddenError('Vous n’avez pas accès aux données de cette entreprise.');
    }

    return {
      company,
      membership,
    };
  },
};
