import { z } from 'zod';

export const createCompanySchema = z.object({
  legalName: z
    .string()
    .min(2, 'La raison sociale doit comporter au moins 2 caractères')
    .max(150, 'La raison sociale ne peut dépasser 150 caractères'),
  tradeName: z.string().max(150).optional(),
  ifu: z
    .string()
    .trim()
    .regex(/^\d{13}$/, 'L’IFU béninois doit comporter exactement 13 chiffres'),
  rccm: z.string().max(50).optional(),
  address: z
    .string()
    .min(3, 'L’adresse doit comporter au moins 3 caractères')
    .max(255, 'L’adresse est trop longue'),
  phone: z
    .string()
    .min(8, 'Le numéro de téléphone est trop court')
    .max(20, 'Le numéro de téléphone est trop long'),
  email: z.string().email('Adresse email professionnelle invalide'),
  sector: z.string().max(100).optional(),
  logoUrl: z.string().url('URL du logo invalide').optional().or(z.literal('')),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;

/**
 * Génère un slug d'URL propre et normalisé à partir d'un nom commercial ou d'une raison sociale.
 */
export function generateCompanySlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
    .replace(/[^a-z0-9]+/g, '-') // Remplace les caractères non alphanumériques par des tirets
    .replace(/^-+|-+$/g, '') // Supprime les tirets de début et fin
    .slice(0, 50);
}
