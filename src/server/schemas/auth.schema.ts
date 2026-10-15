import { z } from 'zod';

export const registerSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Le nom complet doit comporter au moins 2 caractères')
    .max(100, 'Le nom complet ne peut dépasser 100 caractères'),
  email: z
    .string()
    .email('Adresse email invalide')
    .max(150, 'L’adresse email est trop longue'),
  password: z
    .string()
    .min(10, 'Le mot de passe doit comporter au moins 10 caractères')
    .max(128, 'Le mot de passe est trop long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre'
    ),
  phone: z
    .string()
    .min(8, 'Le numéro de téléphone est trop court')
    .max(20, 'Le numéro de téléphone est trop long')
    .regex(/^(\+229)?[0-9\s]{8,15}$/, 'Format de téléphone invalide (+229 conseillé)'),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email('Adresse email invalide'),
  password: z.string().min(1, 'Le mot de passe est requis'),
  twoFactorCode: z
    .string()
    .length(6, 'Le code 2FA doit comporter 6 chiffres')
    .regex(/^\d+$/, 'Le code 2FA ne contient que des chiffres')
    .optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email('Adresse email invalide'),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
