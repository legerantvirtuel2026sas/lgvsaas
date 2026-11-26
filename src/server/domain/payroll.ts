/**
 * Moteur de calcul de la paie aux normes béninoises (Section 1.11 & 10 de PROJECT.md)
 * Tous les calculs sont strictement effectués en FCFA entiers sans décimales.
 */

export interface PayrollCalculationInput {
  baseSalary: number;
  transportAllowance?: number;
  mealAllowance?: number;
  rendementAllowance?: number;
  responsibilityAllowance?: number;
  overtime?: number;
  commissions?: number;
  exceptionalBonus?: number;
  otherAllowances?: number;
  advanceDeduction?: number;
  otherDeductions?: number;
  cnssEmployeeRate?: number; // 3.6% par défaut
  deductCnssFromTaxableBase?: boolean; // Option assiette imposable
}

export interface PayrollCalculationResult {
  baseSalary: number;
  totalAllowances: number;
  grossSalary: number;
  cnssEmployee: number;
  cnssEmployer: number;
  cnssEmployerRetirement: number;
  cnssEmployerFamily: number;
  cnssEmployerAccident: number;
  taxableBase: number;
  itsAmount: number;
  advanceDeduction: number;
  otherDeductions: number;
  netToPay: number;
  employerTotalCost: number;
}

/**
 * Calcule l'ITS (Impôt sur le Traitement des Salaires) selon le barème progressif mensuel du CGI Bénin :
 * - 0 à 60 000 : 0 %
 * - 60 001 à 150 000 : 10 %
 * - 150 001 à 250 000 : 15 %
 * - 250 001 à 500 000 : 19 %
 * - Au-delà de 500 000 : 30 %
 */
export function calculateBeninIts(taxableBase: number): number {
  const base = Math.max(0, Math.round(taxableBase));
  if (base <= 60000) return 0;

  let its = 0;

  // Tranche 1 : 0 à 60 000 -> 0%
  // Tranche 2 : 60 001 à 150 000 (tranche de 90 000) -> 10%
  if (base > 60000) {
    const taxableInTranche2 = Math.min(base - 60000, 90000);
    its += Math.round(taxableInTranche2 * 0.10);
  }

  // Tranche 3 : 150 001 à 250 000 (tranche de 100 000) -> 15%
  if (base > 150000) {
    const taxableInTranche3 = Math.min(base - 150000, 100000);
    its += Math.round(taxableInTranche3 * 0.15);
  }

  // Tranche 4 : 250 001 à 500 000 (tranche de 250 000) -> 19%
  if (base > 250000) {
    const taxableInTranche4 = Math.min(base - 250000, 250000);
    its += Math.round(taxableInTranche4 * 0.19);
  }

  // Tranche 5 : au-delà de 500 000 -> 30%
  if (base > 500000) {
    const taxableInTranche5 = base - 500000;
    its += Math.round(taxableInTranche5 * 0.30);
  }

  return Math.round(its);
}

/**
 * Calcule un bulletin de paie complet selon les normes de la CNSS et de la DGI du Bénin.
 */
export function calculatePayslip(input: PayrollCalculationInput): PayrollCalculationResult {
  const baseSalary = Math.round(Math.max(0, input.baseSalary));
  const transport = Math.round(Math.max(0, input.transportAllowance || 0));
  const meal = Math.round(Math.max(0, input.mealAllowance || 0));
  const rendement = Math.round(Math.max(0, input.rendementAllowance || 0));
  const responsibility = Math.round(Math.max(0, input.responsibilityAllowance || 0));
  const overtime = Math.round(Math.max(0, input.overtime || 0));
  const commissions = Math.round(Math.max(0, input.commissions || 0));
  const bonus = Math.round(Math.max(0, input.exceptionalBonus || 0));
  const other = Math.round(Math.max(0, input.otherAllowances || 0));

  const totalAllowances = transport + meal + rendement + responsibility + overtime + commissions + bonus + other;
  const grossSalary = baseSalary + totalAllowances;

  // Cotisation CNSS Salarié : 3.6%
  const cnssRate = input.cnssEmployeeRate !== undefined ? input.cnssEmployeeRate : 0.036;
  const cnssEmployee = Math.round(grossSalary * cnssRate);

  // Cotisation CNSS Employeur : Retraite (6.4%) + Famille (9%) + Accidents (2%) = 17.4%
  const cnssEmployerRetirement = Math.round(grossSalary * 0.064);
  const cnssEmployerFamily = Math.round(grossSalary * 0.090);
  const cnssEmployerAccident = Math.round(grossSalary * 0.020);
  const cnssEmployer = cnssEmployerRetirement + cnssEmployerFamily + cnssEmployerAccident;

  // Assiette imposable ITS (par défaut : brut moins CNSS salarié)
  const deductCnss = input.deductCnssFromTaxableBase !== false;
  const taxableBase = deductCnss ? Math.max(0, grossSalary - cnssEmployee) : grossSalary;

  // Impôt sur le traitement des salaires (ITS)
  const itsAmount = calculateBeninIts(taxableBase);

  // Retenues supplémentaires (avances et autres)
  const advanceDeduction = Math.round(Math.max(0, input.advanceDeduction || 0));
  const deductions = Math.round(Math.max(0, input.otherDeductions || 0));
  const netToPay = grossSalary - cnssEmployee - itsAmount - advanceDeduction - deductions;
  const employerTotalCost = grossSalary + cnssEmployer;

  return {
    baseSalary,
    totalAllowances,
    grossSalary,
    cnssEmployee,
    cnssEmployer,
    cnssEmployerRetirement,
    cnssEmployerFamily,
    cnssEmployerAccident,
    taxableBase,
    itsAmount,
    advanceDeduction,
    otherDeductions: deductions,
    netToPay,
    employerTotalCost,
  };
}
