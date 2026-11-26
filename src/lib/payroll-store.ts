/**
 * Magasin partagé de gestion du personnel et de la paie pour LGV SaaS (Bénin)
 * Conforme aux normes CNSS (21%) et CGI Bénin (barème progressif ITS).
 */

export interface EmployeeSalaryHistory {
  id: string;
  effectiveDate: string;
  baseSalary: number;
  transportAllowance: number;
  otherAllowances: number;
  reason: string;
  recordedAt: string;
}

export interface EmployeeAdvance {
  id: string;
  employeeId: string;
  grantedDate: string;
  amount: number;
  monthlyDeduction: number;
  reason: string;
  repaidAmount: number;
  status: 'EN_COURS' | 'SOLDE';
  paymentMethod: 'ESPECES' | 'VIREMENT' | 'MOBILE_MONEY';
  repayments: Array<{
    date: string;
    amount: number;
    payrollPeriod?: string;
    reference?: string;
  }>;
}

export interface EmployeeItem extends Record<string, unknown> {
  id: string;
  registrationNumber: string; // Ex: EMP-001
  firstName: string;
  lastName: string;
  fullName: string;
  gender: 'M' | 'F';
  birthDate?: string;
  phone: string;
  email?: string;
  address?: string;
  jobTitle: string;
  department: string; // Ex: Commercial, Comptabilité, Logistique, Direction
  establishment: string;
  hireDate: string;
  contractType: 'CDI' | 'CDD' | 'STAGE' | 'PRESTATION';
  contractEndDate?: string;
  baseSalary: number;
  paymentFrequency: 'MENSUEL' | 'QUINZAINE';
  paymentMethod: 'VIREMENT' | 'ESPECES' | 'MOBILE_MONEY' | 'CHEQUE';
  bankDetails?: {
    bankName?: string;
    ibanOrRib?: string;
    mobileMoneyNumber?: string;
  };
  transportAllowance: number;
  mealAllowance: number;
  rendementAllowance: number;
  responsibilityAllowance: number;
  cnssNumber: string;
  ifuNumber?: string;
  status: 'ACTIF' | 'SUSPENDU' | 'SORTI';
  departureDate?: string;
  departureReason?: string;
  salaryHistory: EmployeeSalaryHistory[];
  advances: EmployeeAdvance[];
  hasPayslips: boolean;
}

export interface PaymentTransaction {
  id: string;
  date: string;
  amount: number;
  paymentMethod: string;
  reference: string;
  notes?: string;
  createdAt: string;
  status: 'VALIDATED' | 'CANCELLED';
  cancelledAt?: string;
  cancellationReason?: string;
}

export type PayrollType = 'MAIN' | 'REGULARIZATION' | 'COMPLEMENTARY';

export interface RegularizationDetail {
  originalPayslipId: string;
  originalPayslipNumber: string;
  reason: string;
  adjustmentType: 'PRIME' | 'HEURES_SUP' | 'RAPPEL' | 'INDEMNITE' | 'RETENUE';
  grossDelta: number;
  cnssEmployeeDelta: number;
  cnssEmployerDelta: number;
  itsDelta: number;
  netDelta: number;
}

export interface PayslipItem {
  id: string;
  payslipNumber: string; // Ex: BUL-2026-11-001 ou REG-2026-11-001 ou BUL-COMP-2026-11-001
  slipType?: PayrollType;
  originalPayslipId?: string;
  originalPayslipNumber?: string;
  regularizationReason?: string;
  regularizationDetails?: RegularizationDetail;
  runId: string;
  companySlug: string;
  employeeId: string;
  employeeName: string;
  employeeMatricule: string;
  employeeJob: string;
  employeeDepartment: string;
  employeeCnss: string;
  periodMonth: number;
  periodYear: number;
  baseSalary: number;
  transportAllowance: number;
  mealAllowance: number;
  rendementAllowance: number;
  responsibilityAllowance: number;
  overtimeAmount: number;
  commissions: number;
  exceptionalBonus: number;
  totalAllowances: number;
  grossSalary: number;
  cnssEmployee: number; // 3.6%
  cnssEmployer: number; // 17.4%
  cnssEmployerRetirement: number; // 6.4%
  cnssEmployerFamily: number; // 9.0%
  cnssEmployerAccident: number; // 2.0%
  taxableBase: number;
  itsAmount: number;
  advanceDeduction: number;
  otherDeductions: number;
  netToPay: number;
  employerTotalCost: number;
  paymentStatus: 'NON_PAYE' | 'PARTIEL' | 'PAYE' | 'TROP_PERCU';
  paidAmount: number;
  remainingAmount: number;
  overpaidAmount?: number;
  transactions?: PaymentTransaction[];
  paymentDate?: string;
  paymentMethod?: string;
  paymentReference?: string;
  createdAt: string;
}

export interface PayrollRunItem {
  id: string;
  runType?: PayrollType; // 'MAIN' (défaut), 'REGULARIZATION', 'COMPLEMENTARY'
  notes?: string;
  periodKey: string; // Ex: "2026-11"
  month: number;
  year: number;
  monthLabel: string; // Ex: "Novembre 2026"
  establishment: string;
  status: 'DRAFT' | 'VALIDATED' | 'PAID';
  employeeCount: number;
  totalGross: number;
  totalCnssEmployee: number;
  totalCnssEmployer: number;
  totalCnss: number;
  totalIts: number;
  totalNet: number;
  totalAdvancesDeducted: number;
  totalEmployerCost: number;
  totalPaidToEmployees: number;
  remainingEmployeesPay: number;
  totalOverpaidEmployees?: number;
  // Obligations CNSS
  cnssDeclaredAmount: number;
  cnssPaidAmount: number;
  cnssPaymentStatus: 'EN_ATTENTE' | 'PARTIEL' | 'PAYE';
  cnssPaymentDate?: string;
  cnssPaymentRef?: string;
  // Obligations DGI (ITS)
  dgiDeclaredAmount: number;
  dgiPaidAmount: number;
  dgiPaymentStatus: 'EN_ATTENTE' | 'PARTIEL' | 'PAYE';
  dgiPaymentDate?: string;
  dgiPaymentRef?: string;
  validatedAt?: string;
  validatedBy?: string;
  payslips: PayslipItem[];
}

export const DEFAULT_EMPLOYEES: EmployeeItem[] = [
  {
    id: 'emp_1',
    registrationNumber: 'EMP-001',
    firstName: 'Romaric',
    lastName: 'KOUASSI',
    fullName: 'Romaric KOUASSI',
    gender: 'M',
    birthDate: '1988-04-12',
    phone: '+229 97 11 22 33',
    email: 'r.kouassi@entreprise.bj',
    address: 'Cadjehoun, Cotonou',
    jobTitle: 'Responsable Commercial',
    department: 'Commercial & Ventes',
    establishment: 'Siège Principal Cotonou',
    hireDate: '2024-02-01',
    contractType: 'CDI',
    baseSalary: 250000,
    paymentFrequency: 'MENSUEL',
    paymentMethod: 'VIREMENT',
    bankDetails: {
      bankName: 'BOA Bénin',
      ibanOrRib: 'BJ061 01001 00123456789 45',
    },
    transportAllowance: 0,
    mealAllowance: 0,
    rendementAllowance: 0,
    responsibilityAllowance: 0,
    cnssNumber: '1234567890',
    ifuNumber: '1202011111111',
    status: 'ACTIF',
    salaryHistory: [
      {
        id: 'hist_1',
        effectiveDate: '2024-02-01',
        baseSalary: 250000,
        transportAllowance: 0,
        otherAllowances: 0,
        reason: 'Rémunération initiale à l’embauche',
        recordedAt: '2024-02-01T08:00:00.000Z',
      },
    ],
    advances: [],
    hasPayslips: true,
  },
  {
    id: 'emp_2',
    registrationNumber: 'EMP-002',
    firstName: 'Béatrice',
    lastName: 'SOGLO',
    fullName: 'Béatrice SOGLO',
    gender: 'F',
    birthDate: '1993-09-24',
    phone: '+229 96 33 44 55',
    email: 'b.soglo@entreprise.bj',
    address: 'Akpakpa, Cotonou',
    jobTitle: 'Chargée de Clientèle',
    department: 'Commercial & Ventes',
    establishment: 'Siège Principal Cotonou',
    hireDate: '2025-06-15',
    contractType: 'CDI',
    baseSalary: 120000,
    paymentFrequency: 'MENSUEL',
    paymentMethod: 'VIREMENT',
    bankDetails: {
      bankName: 'Ecobank Bénin',
      ibanOrRib: 'BJ062 01002 00987654321 12',
    },
    transportAllowance: 0,
    mealAllowance: 0,
    rendementAllowance: 0,
    responsibilityAllowance: 0,
    cnssNumber: '9876543210',
    ifuNumber: '2202022222222',
    status: 'ACTIF',
    salaryHistory: [
      {
        id: 'hist_2',
        effectiveDate: '2025-06-15',
        baseSalary: 120000,
        transportAllowance: 0,
        otherAllowances: 0,
        reason: 'Rémunération initiale à l’embauche',
        recordedAt: '2025-06-15T08:00:00.000Z',
      },
    ],
    advances: [],
    hasPayslips: true,
  },
  {
    id: 'emp_3',
    registrationNumber: 'EMP-003',
    firstName: 'Gérard',
    lastName: 'HOUNGBEDJI',
    fullName: 'Gérard HOUNGBEDJI',
    gender: 'M',
    birthDate: '1996-11-05',
    phone: '+229 95 66 77 88',
    email: 'g.houngbedji@entreprise.bj',
    address: 'Godomey, Abomey-Calavi',
    jobTitle: 'Agent de Magasin / Stock',
    department: 'Logistique & Stock',
    establishment: 'Siège Principal Cotonou',
    hireDate: '2026-01-01',
    contractType: 'CDI',
    baseSalary: 65000,
    paymentFrequency: 'MENSUEL',
    paymentMethod: 'ESPECES',
    transportAllowance: 0,
    mealAllowance: 0,
    rendementAllowance: 0,
    responsibilityAllowance: 0,
    cnssNumber: '5566778899',
    ifuNumber: '3202033333333',
    status: 'ACTIF',
    salaryHistory: [
      {
        id: 'hist_3',
        effectiveDate: '2026-01-01',
        baseSalary: 65000,
        transportAllowance: 0,
        otherAllowances: 0,
        reason: 'Rémunération initiale à l’embauche',
        recordedAt: '2026-01-01T08:00:00.000Z',
      },
    ],
    advances: [],
    hasPayslips: false,
  },
];

const EMPLOYEES_STORAGE_PREFIX = 'lgv_payroll_employees_';
const RUNS_STORAGE_PREFIX = 'lgv_payroll_runs_';

export function getEmployeesStorageKey(companySlug: string): string {
  return `${EMPLOYEES_STORAGE_PREFIX}${companySlug || 'default'}`;
}

export function getRunsStorageKey(companySlug: string): string {
  return `${RUNS_STORAGE_PREFIX}${companySlug || 'default'}`;
}

export function loadEmployees(companySlug: string): EmployeeItem[] {
  if (typeof window === 'undefined') {
    return DEFAULT_EMPLOYEES;
  }
  try {
    const raw = localStorage.getItem(getEmployeesStorageKey(companySlug));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Erreur lecture salariés locaux :', err);
  }
  saveEmployees(companySlug, DEFAULT_EMPLOYEES);
  return DEFAULT_EMPLOYEES;
}

export function saveEmployees(companySlug: string, employees: EmployeeItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getEmployeesStorageKey(companySlug);
    localStorage.setItem(key, JSON.stringify(employees));
    window.dispatchEvent(
      new CustomEvent('lgv_payroll_employees_changed', {
        detail: { companySlug, employees },
      })
    );
  } catch (err) {
    console.warn('Erreur sauvegarde salariés locaux :', err);
  }
}

export function recomputePayslipTotals(slip: PayslipItem): PayslipItem {
  let transactions = slip.transactions || [];

  // Migration rétrocompatible : si paidAmount > 0 sans transactions, synthétiser l'historique
  if (transactions.length === 0 && slip.paidAmount > 0) {
    if (slip.paidAmount > slip.netToPay) {
      // Écart existant (par ex. Romaric ou Gérard ayant eu paiement groupé + individuel)
      transactions = [
        {
          id: `tx_${slip.id}_base`,
          date: slip.paymentDate || '2026-11-26',
          amount: slip.netToPay,
          paymentMethod: slip.paymentMethod || 'Virement bancaire',
          reference: slip.paymentReference || `VIR-MASSE-${slip.periodYear}-${String(slip.periodMonth).padStart(2, '0')}`,
          notes: 'Règlement initial validé',
          createdAt: new Date().toISOString(),
          status: 'VALIDATED',
        },
        {
          id: `tx_${slip.id}_extra`,
          date: slip.paymentDate || '2026-11-26',
          amount: slip.paidAmount - slip.netToPay,
          paymentMethod: slip.paymentMethod || 'Espèces (Caisse)',
          reference: slip.paymentReference ? `${slip.paymentReference}-DUP` : 'VIR-DOUBLON-1',
          notes: 'Versement excédentaire (doublon à vérifier/régulariser)',
          createdAt: new Date().toISOString(),
          status: 'VALIDATED',
        },
      ];
    } else {
      transactions = [
        {
          id: `tx_${slip.id}_base`,
          date: slip.paymentDate || '2026-11-26',
          amount: slip.paidAmount,
          paymentMethod: slip.paymentMethod || 'Virement bancaire',
          reference: slip.paymentReference || `VIR-${slip.employeeMatricule}`,
          notes: 'Règlement validé',
          createdAt: new Date().toISOString(),
          status: 'VALIDATED',
        },
      ];
    }
  }

  const activeTransactions = transactions.filter((t) => t.status === 'VALIDATED');
  const paidAmount = activeTransactions.reduce((sum, t) => sum + t.amount, 0);

  // Règle d'or :
  // Solde restant dû = MAX(0, Net à payer - Total payé)
  // Trop-perçu = MAX(0, Total payé - Net à payer)
  const remainingAmount = Math.max(0, slip.netToPay - paidAmount);
  const overpaidAmount = Math.max(0, paidAmount - slip.netToPay);

  let paymentStatus: 'NON_PAYE' | 'PARTIEL' | 'PAYE' | 'TROP_PERCU' = 'NON_PAYE';
  if (paidAmount === 0) {
    paymentStatus = 'NON_PAYE';
  } else if (paidAmount < slip.netToPay) {
    paymentStatus = 'PARTIEL';
  } else if (paidAmount === slip.netToPay) {
    paymentStatus = 'PAYE';
  } else {
    paymentStatus = 'TROP_PERCU';
  }

  const latestTx = activeTransactions[activeTransactions.length - 1];

  return {
    ...slip,
    transactions,
    paidAmount,
    remainingAmount,
    overpaidAmount,
    paymentStatus,
    paymentDate: latestTx?.date || slip.paymentDate,
    paymentMethod: latestTx?.paymentMethod || slip.paymentMethod,
    paymentReference: latestTx?.reference || slip.paymentReference,
  };
}

export function recomputeRunTotals(run: PayrollRunItem): PayrollRunItem {
  const updatedPayslips = (run.payslips || []).map(recomputePayslipTotals);

  const totalGross = updatedPayslips.reduce((sum, p) => sum + p.grossSalary, 0);
  const totalCnssEmployee = updatedPayslips.reduce((sum, p) => sum + p.cnssEmployee, 0);
  const totalCnssEmployer = updatedPayslips.reduce((sum, p) => sum + p.cnssEmployer, 0);
  const totalCnss = totalCnssEmployee + totalCnssEmployer;
  const totalIts = updatedPayslips.reduce((sum, p) => sum + p.itsAmount, 0);
  const totalNet = updatedPayslips.reduce((sum, p) => sum + p.netToPay, 0);
  const totalPaidToEmployees = updatedPayslips.reduce((sum, p) => sum + p.paidAmount, 0);

  // Règle d'or : le solde restant global est la somme des soldes positifs uniquement
  // (un trop-perçu chez l'un ne doit JAMAIS masquer l'impayé d'un autre)
  const remainingEmployeesPay = updatedPayslips.reduce((sum, p) => sum + p.remainingAmount, 0);

  // Somme des trop-perçus individuels à régulariser
  const totalOverpaidEmployees = updatedPayslips.reduce((sum, p) => sum + (p.overpaidAmount || 0), 0);
  const totalAdvancesDeducted = updatedPayslips.reduce((sum, p) => sum + (p.advanceDeduction || 0), 0);
  const totalEmployerCost = totalGross + totalCnssEmployer;
  const employeeCount = new Set(updatedPayslips.map((p) => p.employeeId)).size;

  return {
    ...run,
    payslips: updatedPayslips,
    employeeCount,
    totalGross,
    totalCnssEmployee,
    totalCnssEmployer,
    totalCnss,
    totalIts,
    totalNet,
    totalAdvancesDeducted,
    totalEmployerCost,
    totalPaidToEmployees,
    remainingEmployeesPay,
    totalOverpaidEmployees,
  };
}

export function loadPayrollRuns(companySlug: string): PayrollRunItem[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = localStorage.getItem(getRunsStorageKey(companySlug));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(recomputeRunTotals);
      }
    }
  } catch (err) {
    console.warn('Erreur lecture historique paies :', err);
  }
  return [];
}

export function savePayrollRuns(companySlug: string, runs: PayrollRunItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getRunsStorageKey(companySlug);
    localStorage.setItem(key, JSON.stringify(runs));
    window.dispatchEvent(
      new CustomEvent('lgv_payroll_runs_changed', {
        detail: { companySlug, runs },
      })
    );
  } catch (err) {
    console.warn('Erreur sauvegarde historique paies :', err);
  }
}
