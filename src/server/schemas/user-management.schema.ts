import { z } from 'zod';
import { ALL_PERMISSIONS } from '../auth/permissions';

export const inviteUserSchema = z.object({
  companyId: z.string().min(1, 'Identifiant d’entreprise requis'),
  email: z.string().email('Adresse email invalide'),
  fullName: z.string().min(2, 'Le nom complet doit comporter au moins 2 caractères'),
  phone: z.string().optional(),
  role: z.enum(['ADMIN', 'USER']),
  permissions: z.array(z.string()).default([]),
});

export type InviteUserInput = z.infer<typeof inviteUserSchema>;

export const updateUserPermissionsSchema = z.object({
  companyId: z.string().min(1),
  targetUserId: z.string().min(1),
  role: z.enum(['OWNER', 'ADMIN', 'USER']),
  permissions: z.array(z.enum(ALL_PERMISSIONS)),
  isActive: z.boolean().default(true),
});

export type UpdateUserPermissionsInput = z.infer<typeof updateUserPermissionsSchema>;

export const attachUserCrossCompanySchema = z.object({
  sourceCompanyId: z.string().min(1),
  targetCompanyId: z.string().min(1),
  targetUserId: z.string().min(1),
});

export type AttachUserCrossCompanyInput = z.infer<typeof attachUserCrossCompanySchema>;
