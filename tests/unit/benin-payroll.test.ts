import { describe, it, expect } from 'vitest';
import { calculateBeninIts, calculatePayslip } from '../../src/server/domain/payroll';

describe('Calculs de paie et fiscalité sociale aux normes béninoises (Module M10)', () => {
  it('applique le barème progressif mensuel de l’ITS du CGI Bénin', () => {
    // 1. Tranche 0 à 60 000 FCFA : exonéré (0 FCFA d'ITS)
    expect(calculateBeninIts(50000)).toBe(0);
    expect(calculateBeninIts(60000)).toBe(0);

    // 2. Tranche 60 001 à 150 000 FCFA à 10% :
    // Pour 100 000 FCFA : base taxable au-delà de 60 000 = 40 000 -> 40 000 * 10% = 4 000 FCFA
    expect(calculateBeninIts(100000)).toBe(4000);

    // Pour 150 000 FCFA : 90 000 * 10% = 9 000 FCFA
    expect(calculateBeninIts(150000)).toBe(9000);

    // 3. Tranche 150 001 à 250 000 FCFA à 15% :
    // Pour 200 000 FCFA : 9 000 + (50 000 * 15% = 7 500) = 16 500 FCFA
    expect(calculateBeninIts(200000)).toBe(16500);

    // 4. Tranche 250 001 à 500 000 FCFA à 19% :
    // Pour 300 000 FCFA : 9 000 + (100 000 * 15% = 15 000) + (50 000 * 19% = 9 500) = 33 500 FCFA
    expect(calculateBeninIts(300000)).toBe(33500);
  });

  it('calcule un bulletin de paie complet avec CNSS salarié 3.6% et net à payer en entier FCFA', () => {
    // Salaire de base : 200 000 FCFA
    // Prime de transport : 20 000 FCFA
    // Brut : 220 000 FCFA
    // CNSS Salarié (3.6%) : 220 000 * 0.036 = 7 920 FCFA
    // Assiette imposable ITS : 220 000 - 7 920 = 212 080 FCFA
    // ITS sur 212 080 :
    //   Tranche 2 (60k-150k) : 90 000 * 10% = 9 000 FCFA
    //   Tranche 3 (150k-250k) : (212 080 - 150 000 = 62 080) * 15% = 9 312 FCFA
    //   Total ITS = 9 000 + 9 312 = 18 312 FCFA
    // Net à payer = 220 000 - 7 920 (CNSS) - 18 312 (ITS) = 193 768 FCFA
    const payslip = calculatePayslip({
      baseSalary: 200000,
      transportAllowance: 20000,
    });

    expect(payslip.grossSalary).toBe(220000);
    expect(payslip.cnssEmployee).toBe(7920);
    expect(payslip.taxableBase).toBe(212080);
    expect(payslip.itsAmount).toBe(18312);
    expect(payslip.netToPay).toBe(193768);
    // Vérification stricte sans décimale
    expect(Number.isInteger(payslip.netToPay)).toBe(true);
  });

  it('gère les rubriques supplémentaires (primes, heures sup, avances) et le coût employeur (17.4%)', () => {
    const payslip = calculatePayslip({
      baseSalary: 150000,
      transportAllowance: 15000,
      rendementAllowance: 10000,
      overtime: 25000,
      advanceDeduction: 20000,
    });

    // Brut = 150000 + 15000 + 10000 + 25000 = 200 000 FCFA
    expect(payslip.grossSalary).toBe(200000);
    // CNSS Salarié (3.6%) = 200 000 * 0.036 = 7 200 FCFA
    expect(payslip.cnssEmployee).toBe(7200);
    // CNSS Employeur = 6.4% + 9% + 2% = 17.4% -> 12 800 + 18 000 + 4 000 = 34 800 FCFA
    expect(payslip.cnssEmployerRetirement).toBe(12800);
    expect(payslip.cnssEmployerFamily).toBe(18000);
    expect(payslip.cnssEmployerAccident).toBe(4000);
    expect(payslip.cnssEmployer).toBe(34800);
    expect(payslip.employerTotalCost).toBe(234800);

    // Base ITS = 200 000 - 7 200 = 192 800 FCFA
    expect(payslip.taxableBase).toBe(192800);
    // ITS: 90 000 * 10% = 9 000 + (192 800 - 150 000 = 42 800) * 15% = 6 420 -> 15 420 FCFA
    expect(payslip.itsAmount).toBe(15420);
    // Net = 200 000 - 7 200 - 15 420 - 20 000 = 157 380 FCFA
    expect(payslip.advanceDeduction).toBe(20000);
    expect(payslip.netToPay).toBe(157380);
  });

  it('calcule correctement la tranche supérieure à 500 000 FCFA à 30% d’ITS', () => {
    // Pour une base taxable de 700 000 FCFA :
    // 60k-150k : 90 000 * 10% = 9 000 FCFA
    // 150k-250k : 100 000 * 15% = 15 000 FCFA
    // 250k-500k : 250 000 * 19% = 47 500 FCFA
    // > 500k : (700 000 - 500 000 = 200 000) * 30% = 60 000 FCFA
    // Total ITS = 9 000 + 15 000 + 47 500 + 60 000 = 131 500 FCFA
    expect(calculateBeninIts(700000)).toBe(131500);
  });
});
