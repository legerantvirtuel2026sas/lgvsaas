import { z } from 'zod';

export const customerSchema = z.object({
  companyId: z.string().min(1),
  type: z.enum(['INDIVIDUAL', 'COMPANY']).default('COMPANY'),
  name: z.string().min(2, 'Le nom du client est requis').max(150),
  ifu: z.string().optional().or(z.literal('')),
  rccm: z.string().optional().or(z.literal('')),
  phone: z.string().min(6, 'Numéro de téléphone requis'),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  creditLimit: z.number().int().nonnegative().default(0), // Plafond en FCFA
});

export type CustomerInput = z.infer<typeof customerSchema>;

export const supplierSchema = z.object({
  companyId: z.string().min(1),
  name: z.string().min(2, 'Le nom du fournisseur est requis').max(150),
  ifu: z.string().optional().or(z.literal('')),
  rccm: z.string().optional().or(z.literal('')),
  phone: z.string().min(6, 'Numéro de téléphone requis'),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  paymentTermsDays: z.number().int().nonnegative().default(0), // 0, 30, 60 jours
});

export type SupplierInput = z.infer<typeof supplierSchema>;

export const productSchema = z.object({
  companyId: z.string().min(1),
  sku: z.string().min(1, 'La référence ou code article est requis').max(50),
  name: z.string().min(2, 'La désignation de l’article est requise').max(150),
  categoryId: z.string().optional().or(z.literal('')),
  unitId: z.string().optional().or(z.literal('')),
  salePriceHt: z.number().int().positive('Le prix de vente HT doit être strictement supérieur à 0'),
  costPrice: z.number().int().nonnegative('Le prix de revient d’achat HT doit être positif ou nul'),
  taxGroup: z.enum(['A', 'B', 'C', 'D']).default('B'), // Groupe B = Taxable 18%
  trackStock: z.boolean().default(true),
  minStockAlert: z.number().int().nonnegative().default(5),
});

export type ProductInput = z.infer<typeof productSchema>;

export const categorySchema = z.object({
  companyId: z.string().min(1),
  name: z.string().min(2, 'Le nom de la catégorie est requis').max(100),
  description: z.string().optional(),
});

export type CategoryInput = z.infer<typeof categorySchema>;
