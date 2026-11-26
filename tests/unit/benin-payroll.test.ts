import { describe, it, expect } from 'vitest';
import { calculateBeninIts, calculatePayslip } from '../../src/server/domain/payroll';
import {
  recomputePayslipTotals,
  recomputeRunTotals,
  PayslipItem,
  PayrollRunItem,
  PaymentTransaction,
} from '../../src/lib/payroll-store';

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

  describe('Règles de gestion des règlements, soldes et trop-perçus (Section Règlements)', () => {
    const baseMockSlip: PayslipItem = {
      id: 'slip_1',
      payslipNumber: 'BUL-2026-11-001',
      runId: 'run_2026-11',
      companySlug: 'abp-technologie',
      employeeId: 'emp_1',
      employeeName: 'Romaric KOUASSI',
      employeeMatricule: 'EMP-001',
      employeeJob: 'Commercial',
      employeeDepartment: 'Ventes',
      employeeCnss: '1234567890',
      periodMonth: 11,
      periodYear: 2026,
      baseSalary: 250000,
      transportAllowance: 0,
      mealAllowance: 0,
      rendementAllowance: 0,
      responsibilityAllowance: 0,
      overtimeAmount: 0,
      commissions: 0,
      exceptionalBonus: 0,
      totalAllowances: 0,
      grossSalary: 250000,
      cnssEmployee: 9000,
      cnssEmployer: 43500,
      cnssEmployerRetirement: 16000,
      cnssEmployerFamily: 22500,
      cnssEmployerAccident: 5000,
      taxableBase: 241000,
      itsAmount: 22650,
      advanceDeduction: 0,
      otherDeductions: 0,
      netToPay: 218350,
      employerTotalCost: 293500,
      paymentStatus: 'NON_PAYE',
      paidAmount: 0,
      remainingAmount: 218350,
      overpaidAmount: 0,
      transactions: [],
      createdAt: '2026-11-26T00:00:00.000Z',
    };

    it('gère correctement les statuts Non payé, Partiel, Réglé, et Trop-perçu avec transactions', () => {
      // 1. Initial : Non payé
      const s1 = recomputePayslipTotals(baseMockSlip);
      expect(s1.paidAmount).toBe(0);
      expect(s1.remainingAmount).toBe(218350);
      expect(s1.overpaidAmount).toBe(0);
      expect(s1.paymentStatus).toBe('NON_PAYE');

      // 2. Acompte partiel de 100 000 FCFA
      const tx1: PaymentTransaction = {
        id: 'tx_1',
        date: '2026-11-26',
        amount: 100000,
        paymentMethod: 'Virement bancaire',
        reference: 'VIR-001',
        createdAt: '2026-11-26T10:00:00.000Z',
        status: 'VALIDATED',
      };
      const s2 = recomputePayslipTotals({ ...baseMockSlip, transactions: [tx1] });
      expect(s2.paidAmount).toBe(100000);
      expect(s2.remainingAmount).toBe(118350);
      expect(s2.overpaidAmount).toBe(0);
      expect(s2.paymentStatus).toBe('PARTIEL');

      // 3. Règlement du solde de 118 350 FCFA
      const tx2: PaymentTransaction = {
        id: 'tx_2',
        date: '2026-11-26',
        amount: 118350,
        paymentMethod: 'Virement bancaire',
        reference: 'VIR-002',
        createdAt: '2026-11-26T11:00:00.000Z',
        status: 'VALIDATED',
      };
      const s3 = recomputePayslipTotals({ ...baseMockSlip, transactions: [tx1, tx2] });
      expect(s3.paidAmount).toBe(218350);
      expect(s3.remainingAmount).toBe(0);
      expect(s3.overpaidAmount).toBe(0);
      expect(s3.paymentStatus).toBe('PAYE');

      // 4. Versement en doublon / excédent de 110 000 FCFA -> Total 328 350 FCFA
      const tx3: PaymentTransaction = {
        id: 'tx_3',
        date: '2026-11-26',
        amount: 110000,
        paymentMethod: 'Espèces (Caisse)',
        reference: 'VIR-EMP-001-2026-11',
        createdAt: '2026-11-26T12:00:00.000Z',
        status: 'VALIDATED',
      };
      const s4 = recomputePayslipTotals({ ...baseMockSlip, transactions: [tx1, tx2, tx3] });
      expect(s4.paidAmount).toBe(328350);
      expect(s4.remainingAmount).toBe(0);
      expect(s4.overpaidAmount).toBe(110000);
      expect(s4.paymentStatus).toBe('TROP_PERCU');

      // 5. Annulation de la transaction excédentaire tx3 avec justification
      const tx3Cancelled: PaymentTransaction = {
        ...tx3,
        status: 'CANCELLED',
        cancelledAt: '2026-11-26T13:00:00.000Z',
        cancellationReason: 'Annulation du doublon',
      };
      const s5 = recomputePayslipTotals({ ...baseMockSlip, transactions: [tx1, tx2, tx3Cancelled] });
      expect(s5.paidAmount).toBe(218350);
      expect(s5.remainingAmount).toBe(0);
      expect(s5.overpaidAmount).toBe(0);
      expect(s5.paymentStatus).toBe('PAYE');
    });

    it('calcule rigoureusement les 4 indicateurs de run sans compenser indûment les trop-perçus avec les impayés', () => {
      // Configuration fidèle à l'anomalie constatée par l'utilisateur :
      // Romaric : 218 350 net, 328 350 versé (trop-perçu 110 000)
      // Béatrice : 110 112 net, 110 112 versé (solde 0, trop-perçu 0)
      // Gérard : 62 394 net, 124 788 versé (trop-perçu 62 394)
      const slipRomaric = recomputePayslipTotals({
        ...baseMockSlip,
        id: 'slip_romaric',
        netToPay: 218350,
        paidAmount: 328350,
      });

      const slipBeatrice = recomputePayslipTotals({
        ...baseMockSlip,
        id: 'slip_beatrice',
        netToPay: 110112,
        paidAmount: 110112,
      });

      const slipGerard = recomputePayslipTotals({
        ...baseMockSlip,
        id: 'slip_gerard',
        netToPay: 62394,
        paidAmount: 124788,
      });

      const mockRun: PayrollRunItem = {
        id: 'run_nov_2026',
        periodKey: '2026-11',
        month: 11,
        year: 2026,
        monthLabel: 'Novembre 2026',
        establishment: 'Tous les établissements',
        status: 'VALIDATED',
        employeeCount: 3,
        totalGross: 435000,
        totalCnssEmployee: 15660,
        totalCnssEmployer: 75690,
        totalCnss: 91350,
        totalIts: 28484,
        totalNet: 390856,
        totalAdvancesDeducted: 0,
        totalEmployerCost: 510690,
        totalPaidToEmployees: 563250,
        remainingEmployeesPay: 0,
        cnssDeclaredAmount: 91350,
        cnssPaidAmount: 0,
        cnssPaymentStatus: 'EN_ATTENTE',
        dgiDeclaredAmount: 28484,
        dgiPaidAmount: 0,
        dgiPaymentStatus: 'EN_ATTENTE',
        payslips: [slipRomaric, slipBeatrice, slipGerard],
      };

      const recomputed = recomputeRunTotals(mockRun);

      // 1. Total net à payer : 390 856 FCFA
      expect(recomputed.totalNet).toBe(390856);

      // 2. Total effectivement payé : 563 250 FCFA
      expect(recomputed.totalPaidToEmployees).toBe(563250);

      // 3. Total restant à payer : 0 FCFA (et NON -172 394 FCFA !)
      expect(recomputed.remainingEmployeesPay).toBe(0);

      // 4. Total des trop-perçus : 110 000 + 62 394 = 172 394 FCFA
      expect(recomputed.totalOverpaidEmployees).toBe(172394);

      // Vérification supplémentaire : si un 4e salarié a un salaire impayé de 50 000 FCFA
      const slipImpaye = recomputePayslipTotals({
        ...baseMockSlip,
        id: 'slip_impaye',
        netToPay: 50000,
        paidAmount: 0,
      });

      const runAvecImpaye = recomputeRunTotals({
        ...mockRun,
        payslips: [slipRomaric, slipBeatrice, slipGerard, slipImpaye],
      });

      // Le reste à payer doit être de 50 000 FCFA et NE DOIT PAS être masqué par le trop-perçu de 172 394 FCFA !
      expect(runAvecImpaye.remainingEmployeesPay).toBe(50000);
      expect(runAvecImpaye.totalOverpaidEmployees).toBe(172394);
    });
  });
});
