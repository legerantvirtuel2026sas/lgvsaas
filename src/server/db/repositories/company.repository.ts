import { prisma } from '../client';

export interface CreateCompanyInput {
  slug: string;
  legalName: string;
  tradeName?: string;
  ifu: string;
  rccm?: string;
  address: string;
  phone: string;
  email: string;
}

export const companyRepository = {
  async findById(companyId: string) {
    return prisma.company.findUnique({
      where: { id: companyId },
      include: {
        license: true,
        settings: true,
      },
    });
  },

  async findBySlug(slug: string) {
    return prisma.company.findUnique({
      where: { slug },
      include: {
        license: true,
        settings: true,
      },
    });
  },

  async findByIfu(ifu: string) {
    return prisma.company.findUnique({
      where: { ifu },
    });
  },

  async create(data: CreateCompanyInput) {
    return prisma.company.create({
      data: {
        slug: data.slug,
        legalName: data.legalName,
        tradeName: data.tradeName,
        ifu: data.ifu,
        rccm: data.rccm,
        address: data.address,
        phone: data.phone,
        email: data.email,
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
      include: {
        settings: true,
      },
    });
  },
};
