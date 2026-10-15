import { prisma } from '../client';
import { Role } from '../../auth/permissions';

export const membershipRepository = {
  async findByCompanyAndUser(companyId: string, userId: string) {
    return prisma.membership.findUnique({
      where: {
        userId_companyId: {
          userId,
          companyId,
        },
      },
      include: {
        company: true,
        user: true,
      },
    });
  },

  async listActiveOwners(companyId: string) {
    return prisma.membership.findMany({
      where: {
        companyId,
        role: 'OWNER',
        isActive: true,
      },
    });
  },

  async listByCompany(companyId: string) {
    return prisma.membership.findMany({
      where: {
        companyId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
          },
        },
      },
    });
  },

  async create(data: {
    userId: string;
    companyId: string;
    role: Role;
    permissions: string[];
  }) {
    return prisma.membership.create({
      data: {
        userId: data.userId,
        companyId: data.companyId,
        role: data.role,
        permissions: data.permissions,
        isActive: true,
      },
    });
  },
};
