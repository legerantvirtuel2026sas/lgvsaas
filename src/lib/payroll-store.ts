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

export interface PayslipItem {
  id: string;
  payslipNumber: string; // Ex: BUL-2026-11-001
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
  paymentStatus: 'NON_PAYE' | 'PARTIEL' | 'PAYE';
  paidAmount: number;
  remainingAmount: number;
  paymentDate?: string;
  paymentMethod?: string;
  paymentReference?: string;
  createdAt: string;
}

export interface PayrollRunItem {
  id: string;
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

export function loadPayrollRuns(companySlug: string): PayrollRunItem[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = localStorage.getItem(getRunsStorageKey(companySlug));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
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
