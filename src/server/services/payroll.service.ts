import { prisma } from '../db/client';
import { assertAuthorized, AuthContext, ForbiddenError } from '../auth/guards';
import { calculatePayslip } from '../domain/payroll';
import { recordAuditEvent } from './audit';

export interface CreateEmployeeInput {
  companyId: string;
  registrationNumber: string;
  firstName: string;
  lastName: string;
  ifu?: string;
  phone: string;
  email?: string;
  jobTitle: string;
  category?: string;
  cnssNumber?: string;
  hireDate: Date;
  baseSalary: number; // en FCFA
  transportAllowance?: number;
}

export const payrollService = {
  /**
   * Crée une fiche salarié avec son contrat de travail initial.
   */
  async createEmployee(ctx: AuthContext, input: CreateEmployeeInput) {
    await assertAuthorized(ctx, 'employees.create');
    if (input.companyId !== ctx.companyId) throw new ForbiddenError();

    const employee = await prisma.employee.create({
      data: {
        companyId: ctx.companyId,
        registrationNumber: input.registrationNumber.trim().toUpperCase(),
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        ifu: input.ifu?.trim() || null,
        phone: input.phone.trim(),
        email: input.email?.trim() || null,
        jobTitle: input.jobTitle.trim(),
        category: input.category || null,
        cnssNumber: input.cnssNumber?.trim() || null,
        hireDate: input.hireDate,
        contracts: {
          create: {
            type: 'CDI',
            baseSalary: Math.round(input.baseSalary),
            transportAllowance: Math.round(input.transportAllowance || 0),
            startDate: input.hireDate,
            active: true,
          },
        },
      },
      include: { contracts: true },
    });

    await recordAuditEvent({
      companyId: ctx.companyId,
      userId: ctx.userId,
      action: 'employees.created',
      resource: 'employee',
      resourceId: employee.id,
      details: { matricule: employee.registrationNumber },
    });

    return employee;
  },

  /**
   * Exécute le calcul mensuel de la paie pour l'ensemble des salariés actifs.
   */
  async executeMonthlyPayroll(ctx: AuthContext, companyId: string, month: number, year: number) {
    await assertAuthorized(ctx, 'payroll.manage');
    if (companyId !== ctx.companyId) throw new ForbiddenError();

    const employees = await prisma.employee.findMany({
      where: { companyId, archivedAt: null },
      include: {
        contracts: { where: { active: true } },
      },
    });

    if (employees.length === 0) {
      throw new Error('Aucun salarié actif enregistré dans cette entreprise.');
    }

    // Calculer les bulletins
    const computedSlips = employees.map((emp, index) => {
      const contract = emp.contracts[0];
      const baseSalary = contract?.baseSalary || 52000;
      const transport = contract?.transportAllowance || 0;

      const calc = calculatePayslip({
        baseSalary,
        transportAllowance: transport,
      });

      const slipNumber = `BUL-${year}-${String(month).padStart(2, '0')}-${String(index + 1).padStart(3, '0')}`;

      return {
        employeeId: emp.id,
        payslipNumber: slipNumber,
        ...calc,
      };
    });

    const totalGross = computedSlips.reduce((sum, s) => sum + s.grossSalary, 0);
    const totalCnss = computedSlips.reduce((sum, s) => sum + s.cnssEmployee, 0);
    const totalIts = computedSlips.reduce((sum, s) => sum + s.itsAmount, 0);
    const totalNet = computedSlips.reduce((sum, s) => sum + s.netToPay, 0);

    const run = await prisma.$transaction(async (tx) => {
      const r = await tx.payrollRun.upsert({
        where: {
          companyId_year_month: {
            companyId,
            year,
            month,
          },
        },
        create: {
          companyId,
          year,
          month,
          status: 'VALIDATED',
          totalGross,
          totalCnss,
          totalIts,
          totalNet,
          validatedAt: new Date(),
          validatedBy: ctx.userId,
        },
        update: {
          totalGross,
          totalCnss,
          totalIts,
          totalNet,
          validatedAt: new Date(),
          validatedBy: ctx.userId,
        },
      });

      // Supprimer les anciens bulletins du mois si recalcul
      await tx.payslip.deleteMany({ where: { runId: r.id } });

      for (const slip of computedSlips) {
        await tx.payslip.create({
          data: {
            companyId,
            runId: r.id,
            employeeId: slip.employeeId,
            payslipNumber: slip.payslipNumber,
            baseSalary: slip.baseSalary,
            totalAllowances: slip.totalAllowances,
            grossSalary: slip.grossSalary,
            cnssEmployee: slip.cnssEmployee,
            cnssEmployer: slip.cnssEmployer,
            taxableBase: slip.taxableBase,
            itsAmount: slip.itsAmount,
            otherDeductions: slip.otherDeductions,
            netToPay: slip.netToPay,
            paymentMethod: 'Virement',
          },
        });
      }

      return r;
    });

    await recordAuditEvent({
      companyId,
      userId: ctx.userId,
      action: 'payroll.run_executed',
      resource: 'payroll_run',
      resourceId: run.id,
      details: { month, year, totalNet, slipsCount: computedSlips.length },
    });

    return run;
  },

  async listEmployees(ctx: AuthContext, companyId: string) {
    await assertAuthorized(ctx, 'employees.view');
    if (companyId !== ctx.companyId) throw new ForbiddenError();

    return prisma.employee.findMany({
      where: { companyId, archivedAt: null },
      include: {
        contracts: { where: { active: true } },
      },
      orderBy: { registrationNumber: 'asc' },
    });
  },
};
