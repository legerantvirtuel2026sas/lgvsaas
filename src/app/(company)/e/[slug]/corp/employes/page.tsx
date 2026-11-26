'use client';

import * as React from 'react';
import {
  Pencil,
  Trash2,
  Lock,
  Plus,
  Check,
  FileText,
  Play,
  Printer,
  X,
  ShieldCheck,
  Building2,
  User,
  Wallet,
  Percent,
  Calculator,
  Calendar,
  CreditCard,
  Search,
  Filter,
  Eye,
  Power,
  DollarSign,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable, ColumnDef } from '@/components/data-table/data-table';
import { formatFcfa } from '@/server/domain/money';
import { calculatePayslip, calculateBeninIts } from '@/server/domain/payroll';
import {
  EmployeeItem,
  PayrollRunItem,
  PayslipItem,
  loadEmployees,
  saveEmployees,
  loadPayrollRuns,
  savePayrollRuns,
  EmployeeAdvance,
  recomputeRunTotals,
  recomputePayslipTotals,
} from '@/lib/payroll-store';

import { EmployeeModal } from './components/EmployeeModal';
import { EmployeeProfileModal } from './components/EmployeeProfileModal';
import { PayrollRunWizardModal } from './components/PayrollRunWizardModal';
import { PayslipModal } from './components/PayslipModal';
import { PayrollHistoryModal } from './components/PayrollHistoryModal';
import { PayrollPaymentsModal } from './components/PayrollPaymentsModal';
import { PayrollRegularizationModal } from './components/PayrollRegularizationModal';
import { PayrollComplementaryModal } from './components/PayrollComplementaryModal';

export default function EmployeesPage({ params }: { params: { slug: string } }) {
  const companySlug = params.slug;
  const companyDisplayName = companySlug.replace(/-/g, ' ').toUpperCase();

  // Données persistées
  const [employees, setEmployees] = React.useState<EmployeeItem[]>([]);
  const [runs, setRuns] = React.useState<PayrollRunItem[]>([]);
  const [isLoaded, setIsLoaded] = React.useState(false);

  // Recherche et filtres
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterDepartment, setFilterDepartment] = React.useState('ALL');
  const [filterStatus, setFilterStatus] = React.useState<'ALL' | 'ACTIF' | 'SUSPENDU' | 'SORTI'>('ALL');

  // Modales
  const [showEmployeeModal, setShowEmployeeModal] = React.useState(false);
  const [editingEmployee, setEditingEmployee] = React.useState<EmployeeItem | null>(null);

  const [showProfileModal, setShowProfileModal] = React.useState(false);
  const [selectedProfileEmployee, setSelectedProfileEmployee] = React.useState<EmployeeItem | null>(null);

  const [showWizardModal, setShowWizardModal] = React.useState(false);

  const [showPayslipModal, setShowPayslipModal] = React.useState(false);
  const [selectedPayslip, setSelectedPayslip] = React.useState<PayslipItem | null>(null);

  const [showHistoryModal, setShowHistoryModal] = React.useState(false);
  const [showPaymentsModal, setShowPaymentsModal] = React.useState(false);
  const [selectedRunForPayments, setSelectedRunForPayments] = React.useState<PayrollRunItem | null>(null);

  // Modales de régularisation et paie complémentaire
  const [showRegularizationModal, setShowRegularizationModal] = React.useState(false);
  const [selectedRunForRegularization, setSelectedRunForRegularization] = React.useState<PayrollRunItem | null>(null);

  const [showComplementaryModal, setShowComplementaryModal] = React.useState(false);
  const [selectedRunForComplementary, setSelectedRunForComplementary] = React.useState<PayrollRunItem | null>(null);

  // Modal d'impression groupée
  const [bulkPrintRun, setBulkPrintRun] = React.useState<PayrollRunItem | null>(null);

  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Chargement initial
  React.useEffect(() => {
    const loadedEmps = loadEmployees(companySlug);
    const loadedRuns = loadPayrollRuns(companySlug);

    setEmployees(loadedEmps);
    setRuns(loadedRuns);
    setIsLoaded(true);
  }, [companySlug]);

  // Sauvegarde à chaque modification d'employés
  const updateEmployees = (newEmployees: EmployeeItem[]) => {
    setEmployees(newEmployees);
    saveEmployees(companySlug, newEmployees);
  };

  // Sauvegarde à chaque modification de paie
  const updateRuns = (newRuns: PayrollRunItem[]) => {
    setRuns(newRuns);
    savePayrollRuns(companySlug, newRuns);
  };

  // =========================================================================
  // CALCULS SOCIAUX & FISCAUX CERTIFIÉS AUX NORMES BÉNINOISES (CNSS 21% & CGI ITS)
  // =========================================================================
  const activeEmployees = React.useMemo(() => {
    return employees.filter((e) => e.status === 'ACTIF');
  }, [employees]);

  const employeePayrollData = React.useMemo(() => {
    return activeEmployees.map((emp) => {
      const pendingAdvance = emp.advances?.find((a) => a.amount > a.repaidAmount);
      const advanceDeduct = pendingAdvance
        ? Math.min(pendingAdvance.monthlyDeduction, pendingAdvance.amount - pendingAdvance.repaidAmount)
        : 0;

      const payslip = calculatePayslip({
        baseSalary: emp.baseSalary,
        transportAllowance: emp.transportAllowance,
        mealAllowance: emp.mealAllowance,
        rendementAllowance: emp.rendementAllowance,
        responsibilityAllowance: emp.responsibilityAllowance,
        advanceDeduction: advanceDeduct,
      });

      return {
        ...emp,
        payslip,
      };
    });
  }, [activeEmployees]);

  // Masse salariale brute
  const totalPayroll = React.useMemo(() => {
    return employeePayrollData.reduce((sum, e) => sum + e.payslip.grossSalary, 0);
  }, [employeePayrollData]);

  // Cotisations CNSS : 3.6% salarié + 17.4% patronale = 21.0%
  const totalCnssEmployee = React.useMemo(() => {
    return employeePayrollData.reduce((sum, e) => sum + e.payslip.cnssEmployee, 0);
  }, [employeePayrollData]);

  const totalCnssEmployer = React.useMemo(() => {
    return employeePayrollData.reduce((sum, e) => sum + e.payslip.cnssEmployer, 0);
  }, [employeePayrollData]);

  const totalCnss = totalCnssEmployee + totalCnssEmployer;

  // Retenue fiscale ITS (CGI Bénin)
  const totalIts = React.useMemo(() => {
    return employeePayrollData.reduce((sum, e) => sum + e.payslip.itsAmount, 0);
  }, [employeePayrollData]);

  const effectiveItsRate = totalPayroll > 0 ? ((totalIts / totalPayroll) * 100).toFixed(2) : '0';

  // Net total à verser
  const totalNetPay = React.useMemo(() => {
    return employeePayrollData.reduce((sum, e) => sum + e.payslip.netToPay, 0);
  }, [employeePayrollData]);

  // Coût total employeur
  const totalEmployerCost = totalPayroll + totalCnssEmployer;

  // Tous les bulletins générés existants
  const allPayslips = React.useMemo(() => {
    return runs.flatMap((r) => r.payslips || []);
  }, [runs]);

  // =========================================================================
  // ACTIONS SALARIÉS (Création, Modification, Profil, Sortie)
  // =========================================================================
  const suggestedMatricule = React.useMemo(() => {
    const count = employees.length + 1;
    return `EMP-${String(count).padStart(3, '0')}`;
  }, [employees.length]);

  const handleSaveEmployee = (data: Partial<EmployeeItem>, revisionReason?: string) => {
    if (editingEmployee) {
      // Modification
      const oldBaseSalary = editingEmployee.baseSalary;
      const newBaseSalary = data.baseSalary || oldBaseSalary;
      const salaryChanged = oldBaseSalary !== newBaseSalary;

      const historyEntry = salaryChanged
        ? {
            id: `hist_${Date.now()}`,
            effectiveDate: new Date().toISOString().split('T')[0],
            baseSalary: newBaseSalary,
            transportAllowance: data.transportAllowance || 0,
            otherAllowances: (data.mealAllowance || 0) + (data.rendementAllowance || 0),
            reason: revisionReason?.trim() || 'Révision périodique',
            recordedAt: new Date().toISOString(),
          }
        : null;

      const updatedHistory = historyEntry
        ? [historyEntry, ...(editingEmployee.salaryHistory || [])]
        : editingEmployee.salaryHistory || [];

      const updated = employees.map((emp) => {
        if (emp.id === editingEmployee.id) {
          return {
            ...emp,
            ...data,
            salaryHistory: updatedHistory,
          } as EmployeeItem;
        }
        return emp;
      });

      updateEmployees(updated);
      showToast(`Salarié "${editingEmployee.fullName}" mis à jour avec succès.`);
    } else {
      // Création
      const newEmp: EmployeeItem = {
        id: `emp_${Date.now()}`,
        registrationNumber: data.registrationNumber || suggestedMatricule,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        fullName: data.fullName || `${data.firstName} ${data.lastName}`,
        gender: data.gender || 'M',
        birthDate: data.birthDate,
        phone: data.phone || '',
        email: data.email,
        address: data.address,
        jobTitle: data.jobTitle || 'Employé',
        department: data.department || 'Commercial & Ventes',
        establishment: data.establishment || 'Siège Principal Cotonou',
        hireDate: data.hireDate || new Date().toISOString().split('T')[0],
        contractType: data.contractType || 'CDI',
        contractEndDate: data.contractEndDate,
        baseSalary: data.baseSalary || 52000,
        paymentFrequency: data.paymentFrequency || 'MENSUEL',
        paymentMethod: data.paymentMethod || 'VIREMENT',
        bankDetails: data.bankDetails,
        transportAllowance: data.transportAllowance || 0,
        mealAllowance: data.mealAllowance || 0,
        rendementAllowance: data.rendementAllowance || 0,
        responsibilityAllowance: data.responsibilityAllowance || 0,
        cnssNumber: data.cnssNumber || 'En cours',
        ifuNumber: data.ifuNumber,
        status: data.status || 'ACTIF',
        salaryHistory: [
          {
            id: `hist_${Date.now()}`,
            effectiveDate: data.hireDate || new Date().toISOString().split('T')[0],
            baseSalary: data.baseSalary || 52000,
            transportAllowance: data.transportAllowance || 0,
            otherAllowances: (data.mealAllowance || 0) + (data.rendementAllowance || 0),
            reason: revisionReason?.trim() || 'Rémunération initiale à l’embauche',
            recordedAt: new Date().toISOString(),
          },
        ],
        advances: [],
        hasPayslips: false,
      };

      updateEmployees([...employees, newEmp]);
      showToast(`Salarié "${newEmp.fullName}" enregistré avec succès.`);
    }
  };

  // Ajout d'une avance sur salaire
  const handleAddAdvance = (
    employeeId: string,
    advanceData: Omit<EmployeeAdvance, 'id' | 'repaidAmount' | 'status' | 'repayments'>
  ) => {
    const newAdv: EmployeeAdvance = {
      ...advanceData,
      id: `adv_${Date.now()}`,
      repaidAmount: 0,
      status: 'EN_COURS',
      repayments: [],
    };

    const updated = employees.map((emp) => {
      if (emp.id === employeeId) {
        return {
          ...emp,
          advances: [newAdv, ...(emp.advances || [])],
        };
      }
      return emp;
    });

    updateEmployees(updated);
    showToast(`Avance de ${formatFcfa(newAdv.amount)} enregistrée avec succès.`);
  };

  // Sortie ou archivage d'un salarié (Ne supprime jamais physiquement si bulletins existants)
  const handleToggleDeactivate = (emp: EmployeeItem) => {
    if (emp.status === 'ACTIF') {
      const reason = prompt(`Précisez le motif de sortie pour "${emp.fullName}" (ex: Démission, Fin de contrat, Retraite) :`, 'Fin de contrat');
      if (reason === null) return;

      const updated = employees.map((e) => {
        if (e.id === emp.id) {
          return {
            ...e,
            status: 'SORTI' as const,
            departureDate: new Date().toISOString().split('T')[0],
            departureReason: reason.trim() || 'Cessation d’activité',
          };
        }
        return e;
      });
      updateEmployees(updated);
      showToast(`Salarié "${emp.fullName}" marqué comme Sorti de l'effectif.`);
    } else {
      if (confirm(`Voulez-vous réactiver "${emp.fullName}" dans l'effectif actif ?`)) {
        const updated = employees.map((e) => {
          if (e.id === emp.id) {
            return {
              ...e,
              status: 'ACTIF' as const,
              departureDate: undefined,
              departureReason: undefined,
            };
          }
          return e;
        });
        updateEmployees(updated);
        showToast(`Salarié "${emp.fullName}" réactivé avec succès.`);
      }
    }
  };

  // Validation d'une paie mensuelle
  const handleValidatePayroll = (newRun: PayrollRunItem) => {
    // 1. Mettre à jour l'historique des paies (ou remplacer si recalcul)
    const filteredRuns = runs.filter((r) => r.periodKey !== newRun.periodKey);
    const updatedRuns = [newRun, ...filteredRuns];
    updateRuns(updatedRuns);

    // 2. Marquer hasPayslips = true pour les salariés concernés et déduire les remboursements d'avances
    const updatedEmployees = employees.map((emp) => {
      const slip = newRun.payslips.find((p) => p.employeeId === emp.id);
      if (!slip) return emp;

      let updatedAdvances = emp.advances || [];
      if (slip.advanceDeduction > 0 && emp.advances && emp.advances.length > 0) {
        let deductLeft = slip.advanceDeduction;
        updatedAdvances = emp.advances.map((adv) => {
          if (adv.status === 'SOLDE' || deductLeft <= 0) return adv;
          const remaining = adv.amount - adv.repaidAmount;
          const toDeduct = Math.min(deductLeft, remaining);
          deductLeft -= toDeduct;
          const newRepaid = adv.repaidAmount + toDeduct;
          return {
            ...adv,
            repaidAmount: newRepaid,
            status: (newRepaid >= adv.amount ? 'SOLDE' : 'EN_COURS') as any,
            repayments: [
              ...(adv.repayments || []),
              {
                date: new Date().toISOString().split('T')[0],
                amount: toDeduct,
                payrollPeriod: newRun.monthLabel,
                reference: slip.payslipNumber,
              },
            ],
          };
        });
      }

      return {
        ...emp,
        hasPayslips: true,
        advances: updatedAdvances,
      };
    });

    updateEmployees(updatedEmployees);
    showToast(`Paie mensuelle de ${newRun.monthLabel} validée avec succès ! ${newRun.payslips.length} bulletins générés.`);
  };

  // Mise à jour des paiements d'une paie
  const handleUpdateRunPayments = (
    runId: string,
    updatedPayslips: PayslipItem[],
    cnssUpdate?: { paidAmount: number; paymentDate: string; paymentRef: string },
    dgiUpdate?: { paidAmount: number; paymentDate: string; paymentRef: string }
  ) => {
    const updatedRuns = runs.map((r) => {
      if (r.id === runId) {
        return recomputeRunTotals({
          ...r,
          payslips: updatedPayslips,
          cnssPaidAmount: cnssUpdate ? cnssUpdate.paidAmount : r.cnssPaidAmount,
          cnssPaymentDate: cnssUpdate ? cnssUpdate.paymentDate : r.cnssPaymentDate,
          cnssPaymentRef: cnssUpdate ? cnssUpdate.paymentRef : r.cnssPaymentRef,
          cnssPaymentStatus: cnssUpdate
            ? cnssUpdate.paidAmount >= r.totalCnss
              ? ('PAYE' as const)
              : ('PARTIEL' as const)
            : r.cnssPaymentStatus,
          dgiPaidAmount: dgiUpdate ? dgiUpdate.paidAmount : r.dgiPaidAmount,
          dgiPaymentDate: dgiUpdate ? dgiUpdate.paymentDate : r.dgiPaymentDate,
          dgiPaymentRef: dgiUpdate ? dgiUpdate.paymentRef : r.dgiPaymentRef,
          dgiPaymentStatus: dgiUpdate
            ? dgiUpdate.paidAmount >= r.totalIts
              ? ('PAYE' as const)
              : ('PARTIEL' as const)
            : r.dgiPaymentStatus,
        });
      }
      return r;
    });

    updateRuns(updatedRuns);
    showToast('Règlements mis à jour avec succès.');
  };

  // Enregistrement d'une régularisation de paie
  const handleSaveRegularization = (targetRun: PayrollRunItem, regularizationSlip: PayslipItem) => {
    const updatedPayslips = [...(targetRun.payslips || []), regularizationSlip];
    const updatedRun = recomputeRunTotals({
      ...targetRun,
      payslips: updatedPayslips,
    });

    const updatedRuns = runs.map((r) => (r.id === updatedRun.id ? updatedRun : r));
    updateRuns(updatedRuns);
    showToast(`Régularisation ${regularizationSlip.payslipNumber} validée pour ${regularizationSlip.employeeName}.`);
  };

  // Enregistrement d'une paie complémentaire (salarié omis)
  const handleSaveComplementaryPayslip = (targetRun: PayrollRunItem, complementarySlip: PayslipItem) => {
    const updatedPayslips = [...(targetRun.payslips || []), complementarySlip];
    const updatedRun = recomputeRunTotals({
      ...targetRun,
      payslips: updatedPayslips,
    });

    const updatedRuns = runs.map((r) => (r.id === updatedRun.id ? updatedRun : r));
    updateRuns(updatedRuns);

    // Mettre à jour hasPayslips sur la fiche salarié
    const updatedEmployees = employees.map((emp) => {
      if (emp.id !== complementarySlip.employeeId) return emp;
      return {
        ...emp,
        hasPayslips: true,
      };
    });
    updateEmployees(updatedEmployees);

    showToast(`Paie complémentaire ${complementarySlip.payslipNumber} validée pour ${complementarySlip.employeeName}.`);
  };

  // =========================================================================
  // FILTRAGE ET RECHERCHE DU TABLEAU
  // =========================================================================
  const filteredEmployees = React.useMemo(() => {
    return employees.filter((emp) => {
      // Filtre statut
      if (filterStatus !== 'ALL' && emp.status !== filterStatus) {
        return false;
      }
      // Filtre département
      if (filterDepartment !== 'ALL' && emp.department !== filterDepartment) {
        return false;
      }
      // Recherche textuelle
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = emp.fullName.toLowerCase().includes(q);
        const matchMat = emp.registrationNumber.toLowerCase().includes(q);
        const matchJob = emp.jobTitle.toLowerCase().includes(q);
        const matchDept = emp.department.toLowerCase().includes(q);
        const matchCnss = (emp.cnssNumber || '').toLowerCase().includes(q);
        if (!matchName && !matchMat && !matchJob && !matchDept && !matchCnss) {
          return false;
        }
      }
      return true;
    });
  }, [employees, filterStatus, filterDepartment, searchQuery]);

  // Liste unique des départements pour le sélecteur
  const uniqueDepartments = React.useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set);
  }, [employees]);

  // Colonnes du tableau de salariés
  const columns: ColumnDef<EmployeeItem>[] = [
    {
      id: 'registrationNumber',
      header: 'Matricule',
      accessorKey: 'registrationNumber',
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-xs font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded border">
          {row.registrationNumber}
        </span>
      ),
    },
    {
      id: 'fullName',
      header: 'Salarié',
      accessorKey: 'fullName',
      sortable: true,
      cell: (row) => (
        <div>
          <div className="font-semibold text-gray-900 flex items-center gap-1.5">
            {row.fullName}
            {row.hasPayslips && (
              <span title="Bulletins de paie enregistrés : identité légale verrouillée" className="text-gray-400">
                <Lock className="w-3.5 h-3.5 inline text-amber-500" />
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500">{row.jobTitle}</div>
        </div>
      ),
    },
    {
      id: 'department',
      header: 'Service / Dép.',
      accessorKey: 'department',
      sortable: true,
      cell: (row) => <span className="text-xs text-gray-700">{row.department}</span>,
    },
    {
      id: 'hireDate',
      header: 'Date d’embauche',
      accessorKey: 'hireDate',
      sortable: true,
      cell: (row) => <span className="text-xs text-gray-600">{new Date(row.hireDate).toLocaleDateString('fr-BJ')}</span>,
    },
    {
      id: 'baseSalary',
      header: 'Salaire de Base',
      accessorKey: 'baseSalary',
      sortable: true,
      type: 'number',
      cell: (row) => <span className="font-semibold text-gray-900 font-mono">{formatFcfa(row.baseSalary)}</span>,
    },
    {
      id: 'cnssDeduction',
      header: 'CNSS Salarié (3,6%)',
      cell: (row) => {
        const p = calculatePayslip({ baseSalary: row.baseSalary });
        return <span className="font-mono text-xs text-blue-700 font-bold">-{formatFcfa(p.cnssEmployee)}</span>;
      },
    },
    {
      id: 'itsDeduction',
      header: 'Retenue ITS DGI',
      cell: (row) => {
        const p = calculatePayslip({ baseSalary: row.baseSalary });
        const rate = ((p.itsAmount / row.baseSalary) * 100).toFixed(1);
        return (
          <div>
            <span className="font-mono text-xs text-purple-700 font-bold">-{formatFcfa(p.itsAmount)}</span>
            <span className="text-[10px] text-gray-400 block font-mono">({rate}%)</span>
          </div>
        );
      },
    },
    {
      id: 'netSalary',
      header: 'Net à Payer',
      cell: (row) => {
        const p = calculatePayslip({ baseSalary: row.baseSalary });
        return <span className="font-mono text-xs text-emerald-700 font-black">{formatFcfa(p.netToPay)}</span>;
      },
    },
    {
      id: 'cnssNumber',
      header: 'N° CNSS',
      accessorKey: 'cnssNumber',
      cell: (row) => <span className="font-mono text-xs text-gray-500">{row.cnssNumber}</span>,
    },
    {
      id: 'status',
      header: 'Statut',
      accessorKey: 'status',
      sortable: true,
      cell: (row) => (
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
            row.status === 'ACTIF'
              ? 'bg-emerald-100 text-emerald-800'
              : row.status === 'SUSPENDU'
              ? 'bg-amber-100 text-amber-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {row.status === 'ACTIF' ? 'Actif' : row.status === 'SUSPENDU' ? 'Suspendu' : 'Sorti'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (row) => {
        return (
          <div className="flex items-center space-x-1">
            {/* Consulter la fiche profil complète */}
            <button
              type="button"
              onClick={() => {
                setSelectedProfileEmployee(row);
                setShowProfileModal(true);
              }}
              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
              title="Consulter la fiche profil détaillée (contrat, historique salarial, avances)"
              aria-label="Consulter profil"
            >
              <Eye className="w-4 h-4" />
            </button>

            {/* Modifier le salarié */}
            <button
              type="button"
              onClick={() => {
                setEditingEmployee(row);
                setShowEmployeeModal(true);
              }}
              className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Modifier les informations"
              aria-label="Modifier"
            >
              <Pencil className="w-4 h-4" />
            </button>

            {/* Consulter le dernier bulletin */}
            <button
              type="button"
              onClick={() => {
                const latestSlip = allPayslips.find((p) => p.employeeId === row.id);
                if (latestSlip) {
                  setSelectedPayslip(latestSlip);
                  setShowPayslipModal(true);
                } else {
                  // Générer un aperçu de bulletin
                  const p = calculatePayslip({ baseSalary: row.baseSalary });
                  const draftSlip: PayslipItem = {
                    id: `draft_${row.id}`,
                    payslipNumber: `BUL-APERÇU-${row.registrationNumber}`,
                    runId: 'draft',
                    companySlug,
                    employeeId: row.id,
                    employeeName: row.fullName,
                    employeeMatricule: row.registrationNumber,
                    employeeJob: row.jobTitle,
                    employeeDepartment: row.department,
                    employeeCnss: row.cnssNumber,
                    periodMonth: new Date().getMonth() + 1,
                    periodYear: new Date().getFullYear(),
                    baseSalary: row.baseSalary,
                    transportAllowance: row.transportAllowance || 0,
                    mealAllowance: row.mealAllowance || 0,
                    rendementAllowance: row.rendementAllowance || 0,
                    responsibilityAllowance: row.responsibilityAllowance || 0,
                    overtimeAmount: 0,
                    commissions: 0,
                    exceptionalBonus: 0,
                    totalAllowances: p.totalAllowances,
                    grossSalary: p.grossSalary,
                    cnssEmployee: p.cnssEmployee,
                    cnssEmployer: p.cnssEmployer,
                    cnssEmployerRetirement: p.cnssEmployerRetirement,
                    cnssEmployerFamily: p.cnssEmployerFamily,
                    cnssEmployerAccident: p.cnssEmployerAccident,
                    taxableBase: p.taxableBase,
                    itsAmount: p.itsAmount,
                    advanceDeduction: 0,
                    otherDeductions: 0,
                    netToPay: p.netToPay,
                    employerTotalCost: p.employerTotalCost,
                    paymentStatus: 'NON_PAYE',
                    paidAmount: 0,
                    remainingAmount: p.netToPay,
                    createdAt: new Date().toISOString(),
                  };
                  setSelectedPayslip(draftSlip);
                  setShowPayslipModal(true);
                }
              }}
              className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
              title="Consulter le bulletin de paie officiel"
              aria-label="Voir bulletin"
            >
              <FileText className="w-4 h-4" />
            </button>

            {/* Sortie / Désactivation */}
            <button
              type="button"
              onClick={() => handleToggleDeactivate(row)}
              className={`p-1.5 rounded-lg transition-colors ${
                row.status === 'ACTIF'
                  ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                  : 'text-emerald-600 hover:bg-emerald-50'
              }`}
              title={row.status === 'ACTIF' ? 'Sortir le salarié de l’effectif' : 'Réactiver le salarié'}
              aria-label="Statut effectif"
            >
              <Power className="w-4 h-4" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-medium flex items-center gap-2 border border-gray-700 animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* En-tête de la page */}
      <div className="border-b border-gray-200 pb-5 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ressources Humaines & Paie (Bénin)</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gestion des salariés, calcul des cotisations sociales (CNSS 21%) et fiscales (retenue ITS selon CGI Bénin).
          </p>
        </div>

        {/* Boutons d'action de l'en-tête organisés en 2 rangées : 3 boutons en haut, 2 boutons en bas */}
        <div className="flex flex-col gap-2 shrink-0 xl:items-end">
          {/* Rangée supérieure : 3 boutons de consultation / régularisation */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Historique des paies */}
            <Button
              variant="outline"
              onClick={() => setShowHistoryModal(true)}
              className="h-9 px-3 border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-xs"
              title="Consulter l'historique des périodes de paie clôturées"
            >
              <Calendar className="w-3.5 h-3.5 text-gray-600 shrink-0" />
              <span>Historique des paies</span>
            </Button>

            {/* Suivi des règlements */}
            <Button
              variant="outline"
              onClick={() => {
                if (runs.length > 0) {
                  setSelectedRunForPayments(runs[0]);
                  setShowPaymentsModal(true);
                } else {
                  showToast("Aucune période de paie validée pour le moment. Exécutez d'abord la paie.");
                }
              }}
              className="h-9 px-3 border-emerald-300 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-xs"
              title="Suivi des règlements des salariés et des obligations DGI/CNSS"
            >
              <CreditCard className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>Suivi des règlements</span>
            </Button>

            {/* Régularisation de paie */}
            <Button
              variant="outline"
              onClick={() => {
                if (runs.length > 0) {
                  setSelectedRunForRegularization(runs[0]);
                  setShowRegularizationModal(true);
                } else {
                  showToast("Aucune paie validée pour le moment. Une paie doit exister pour effectuer une régularisation.");
                }
              }}
              className="h-9 px-3 border-amber-300 bg-amber-50/70 hover:bg-amber-100 text-amber-900 font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-xs"
              title="Corriger une omission ou effectuer une régularisation sur un bulletin validé"
            >
              <Calculator className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>Régularisation</span>
            </Button>
          </div>

          {/* Rangée inférieure : 2 boutons d'actions principales */}
          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            {/* Exécuter la paie mensuelle */}
            <Button
              variant="outline"
              onClick={() => setShowWizardModal(true)}
              className="h-10 px-4 border-blue-600 bg-blue-50/70 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
              title="Lancer l'assistant de préparation et calcul de la paie mensuelle"
            >
              <Play className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Exécuter la paie mensuelle</span>
            </Button>

            {/* Nouveau salarié */}
            <Button
              onClick={() => {
                setEditingEmployee(null);
                setShowEmployeeModal(true);
              }}
              className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all border border-blue-600"
            >
              <Plus className="w-4 h-4 shrink-0 text-white" />
              <span>Nouveau salarié</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Cartes d'indicateurs financiers (2 en haut et 2 en bas) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Masse salariale brute */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
              Masse salariale brute
            </span>
            <div className="text-2xl font-black text-gray-900 mt-1 font-mono">
              {formatFcfa(totalPayroll)}
            </div>
          </div>
          <div className="pt-2 mt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>{activeEmployees.length} salariés actifs</span>
            <span className="font-semibold text-emerald-700 font-mono">Net : {formatFcfa(totalNetPay)}</span>
          </div>
        </div>

        {/* 2. Cotisations CNSS totales (21%) */}
        <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-800 uppercase tracking-wider block">
                Cotisations CNSS (21,0%)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                Norme Bénin
              </span>
            </div>
            <div className="text-2xl font-black text-blue-700 mt-1 font-mono">
              {formatFcfa(totalCnss)}
            </div>
          </div>
          <div className="pt-2 mt-2 border-t border-blue-100 text-[11px] text-blue-900 space-y-0.5">
            <div className="flex justify-between">
              <span>Part salarié (3,6%) :</span>
              <strong className="font-mono">{formatFcfa(totalCnssEmployee)}</strong>
            </div>
            <div className="flex justify-between">
              <span>Part patronale (17,4%) :</span>
              <strong className="font-mono">{formatFcfa(totalCnssEmployer)}</strong>
            </div>
          </div>
        </div>

        {/* 3. Retenue ITS DGI à déclarer */}
        <div className="bg-white p-5 rounded-2xl border border-purple-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-800 uppercase tracking-wider block">
                Retenue ITS DGI
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-mono">
                {effectiveItsRate}% effectif
              </span>
            </div>
            <div className="text-2xl font-black text-purple-700 mt-1 font-mono">
              {formatFcfa(totalIts)}
            </div>
          </div>
          <div className="pt-2 mt-2 border-t border-purple-100 text-[11px] text-purple-900">
            <div className="flex justify-between items-center">
              <span>Barème progressif CGI :</span>
              <span className="font-bold text-[10px]">Tranches 0% à 30%</span>
            </div>
            <span className="text-[10px] text-gray-500 block mt-0.5">
              Exonéré ≤ 60k • 10% (60k-150k) • 15% (150k-250k)
            </span>
          </div>
        </div>

        {/* 4. Coût total personnel (Charges patronales incluses) */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
              Coût Total Entreprise
            </span>
            <div className="text-2xl font-black text-emerald-800 mt-1 font-mono">
              {formatFcfa(totalEmployerCost)}
            </div>
          </div>
          <div className="pt-2 mt-2 border-t border-emerald-100 text-[11px] text-emerald-900 space-y-0.5">
            <div className="flex justify-between">
              <span>Rémunérations nettes :</span>
              <strong className="font-mono">{formatFcfa(totalNetPay)}</strong>
            </div>
            <div className="flex justify-between">
              <span>Charges sociales & fiscales :</span>
              <strong className="font-mono">{formatFcfa(totalCnss + totalIts)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Barre de recherche et filtres de gestion du personnel */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher par nom, matricule, poste, N° CNSS..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 bg-gray-50 text-xs focus:bg-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Filtre service */}
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="h-10 rounded-xl border border-gray-200 bg-gray-50 px-3 text-xs focus:bg-white focus:border-blue-500 focus:outline-none"
          >
            <option value="ALL">Tous les services</option>
            {uniqueDepartments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          {/* Filtre statut */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="h-10 rounded-xl border border-gray-200 bg-gray-50 px-3 text-xs focus:bg-white focus:border-blue-500 focus:outline-none"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="ACTIF">🟢 Actifs uniquement</option>
            <option value="SUSPENDU">🟡 Suspendus</option>
            <option value="SORTI">🔴 Sortis de l'effectif</option>
          </select>

          {(searchQuery || filterDepartment !== 'ALL' || filterStatus !== 'ALL') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setFilterDepartment('ALL');
                setFilterStatus('ALL');
              }}
              className="h-10 text-xs px-2.5 text-gray-500"
            >
              Réinitialiser
            </Button>
          )}
        </div>
      </div>

      {/* Tableau des salariés */}
      <DataTable columns={columns} data={filteredEmployees} />

      {/* ========================================================================= */}
      {/* MODALE : CRÉATION / MODIFICATION SALARIÉ (SECTIONS A, B, C, D, E) */}
      {/* ========================================================================= */}
      <EmployeeModal
        isOpen={showEmployeeModal}
        onClose={() => {
          setShowEmployeeModal(false);
          setEditingEmployee(null);
        }}
        onSave={handleSaveEmployee}
        initialEmployee={editingEmployee}
        suggestedMatricule={suggestedMatricule}
      />

      {/* ========================================================================= */}
      {/* MODALE : FICHE DÉTAILLÉE DU SALARIÉ (PROFIL, AVANCES, HISTORIQUE, CONTRAT) */}
      {/* ========================================================================= */}
      <EmployeeProfileModal
        isOpen={showProfileModal}
        onClose={() => {
          setShowProfileModal(false);
          setSelectedProfileEmployee(null);
        }}
        employee={selectedProfileEmployee}
        payslips={allPayslips}
        onAddAdvance={handleAddAdvance}
        onViewPayslip={(slip) => {
          setSelectedPayslip(slip);
          setShowPayslipModal(true);
        }}
        onEditEmployee={(emp) => {
          setEditingEmployee(emp);
          setShowEmployeeModal(true);
        }}
      />

      {/* ========================================================================= */}
      {/* MODALE : ASSISTANT DE PRÉPARATION ET CLÔTURE DE PAIE MENSUELLE (5 ÉTAPES) */}
      {/* ========================================================================= */}
      <PayrollRunWizardModal
        isOpen={showWizardModal}
        onClose={() => setShowWizardModal(false)}
        companySlug={companySlug}
        companyDisplayName={companyDisplayName}
        employees={employees}
        existingRuns={runs}
        onValidatePayroll={handleValidatePayroll}
        onOpenRunDetails={(run) => {
          setSelectedRunForPayments(run);
          setShowPaymentsModal(true);
        }}
        onOpenPaymentsForRun={(run) => {
          setSelectedRunForPayments(run);
          setShowPaymentsModal(true);
        }}
        onPrintAllSlipsForRun={(run) => {
          setBulkPrintRun(run);
        }}
        onOpenRegularization={(run) => {
          setSelectedRunForRegularization(run);
          setShowRegularizationModal(true);
        }}
        onOpenComplementary={(run) => {
          setSelectedRunForComplementary(run);
          setShowComplementaryModal(true);
        }}
      />

      {/* ========================================================================= */}
      {/* MODALE : BULLETIN DE PAIE INDIVIDUEL OFFICIEL (IMPRESSION A4) */}
      {/* ========================================================================= */}
      <PayslipModal
        isOpen={showPayslipModal}
        onClose={() => {
          setShowPayslipModal(false);
          setSelectedPayslip(null);
        }}
        payslip={selectedPayslip}
        companyDisplayName={companyDisplayName}
      />

      {/* ========================================================================= */}
      {/* MODALE : HISTORIQUE DES PÉRIODES DE PAIE TRAITÉES */}
      {/* ========================================================================= */}
      <PayrollHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        runs={runs}
        onOpenRunDetails={(run) => {
          // Afficher le livre de paie
          setShowHistoryModal(false);
          setSelectedRunForPayments(run);
          setShowPaymentsModal(true);
        }}
        onOpenPaymentsForRun={(run) => {
          setShowHistoryModal(false);
          setSelectedRunForPayments(run);
          setShowPaymentsModal(true);
        }}
        onPrintAllSlipsForRun={(run) => {
          setShowHistoryModal(false);
          setBulkPrintRun(run);
        }}
        onOpenRegularization={(run) => {
          setShowHistoryModal(false);
          setSelectedRunForRegularization(run);
          setShowRegularizationModal(true);
        }}
        onOpenComplementary={(run) => {
          setShowHistoryModal(false);
          setSelectedRunForComplementary(run);
          setShowComplementaryModal(true);
        }}
      />

      {/* ========================================================================= */}
      {/* MODALE : RÉGULARISATION DE PAIE (AJUSTEMENTS ET CORRECTIONS CIBLÉES) */}
      {/* ========================================================================= */}
      <PayrollRegularizationModal
        isOpen={showRegularizationModal}
        onClose={() => {
          setShowRegularizationModal(false);
          setSelectedRunForRegularization(null);
        }}
        companySlug={companySlug}
        companyDisplayName={companyDisplayName}
        runs={runs}
        employees={employees}
        initialRun={selectedRunForRegularization}
        onSaveRegularization={handleSaveRegularization}
      />

      {/* ========================================================================= */}
      {/* MODALE : PAIE COMPLÉMENTAIRE (SALARIÉS OMIS LORS DE LA CLÔTURE) */}
      {/* ========================================================================= */}
      <PayrollComplementaryModal
        isOpen={showComplementaryModal}
        onClose={() => {
          setShowComplementaryModal(false);
          setSelectedRunForComplementary(null);
        }}
        companySlug={companySlug}
        companyDisplayName={companyDisplayName}
        runs={runs}
        employees={employees}
        initialRun={selectedRunForComplementary}
        onSaveComplementaryPayslip={handleSaveComplementaryPayslip}
      />

      {/* ========================================================================= */}
      {/* MODALE : SUIVI DES RÈGLEMENTS DES SALARIÉS, DE LA CNSS ET DE LA DGI */}
      {/* ========================================================================= */}
      <PayrollPaymentsModal
        isOpen={showPaymentsModal}
        onClose={() => {
          setShowPaymentsModal(false);
          setSelectedRunForPayments(null);
        }}
        run={selectedRunForPayments || (runs.length > 0 ? runs[0] : null)}
        onUpdateRunPayments={handleUpdateRunPayments}
      />

      {/* ========================================================================= */}
      {/* MODALE D'IMPRESSION GROUPÉE DE TOUS LES BULLETINS D'UNE PÉRIODE */}
      {/* ========================================================================= */}
      {bulkPrintRun && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto print:block">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-6 my-auto border border-gray-200 max-h-[95vh] flex flex-col print:max-h-none print:h-auto print:shadow-none print:border-none print:p-0 print:w-full print:max-w-none print:block">
            <div className="flex items-center justify-between pb-3 border-b print:hidden">
              <div>
                <h3 className="font-bold text-base text-gray-900">
                  Impression groupée des bulletins • {bulkPrintRun.monthLabel} ({bulkPrintRun.payslips?.length || 0} bulletins)
                </h3>
                <p className="text-xs text-gray-500">
                  Chaque bulletin sera imprimé sur sa propre page A4 prête à distribuer ou archiver.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => window.print()}
                  className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Lancer l'impression groupée</span>
                </Button>
                <button
                  type="button"
                  onClick={() => setBulkPrintRun(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 space-y-8 print:overflow-visible print:space-y-0">
              {bulkPrintRun.payslips?.map((slip, idx) => (
                <div key={slip.id} className="p-6 border border-gray-200 rounded-2xl bg-white space-y-4 print:border-none print:rounded-none print:p-0 print:break-after-page print:mb-0">
                  {/* En-tête */}
                  <div className="flex items-start justify-between border-b pb-3">
                    <div>
                      <span className="text-lg font-black text-blue-700 block">{companyDisplayName}</span>
                      <p className="text-[10px] text-gray-600">IFU : 0202612345678 • N° CNSS Employeur : 2026-AB123</p>
                      <p className="text-[10px] text-gray-600">Cotonou, République du Bénin</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2.5 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded font-black text-[11px] uppercase">
                        BULLETIN DE PAIE
                      </span>
                      <p className="text-xs font-bold text-gray-900 mt-1 font-mono">{slip.payslipNumber}</p>
                      <p className="text-xs text-blue-700 font-semibold">{bulkPrintRun.monthLabel}</p>
                    </div>
                  </div>

                  {/* Coordonnées */}
                  <div className="p-3 bg-gray-50 rounded-xl border text-xs grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-bold block">Salarié :</span>
                      <strong className="text-sm text-gray-900 block">{slip.employeeName}</strong>
                      <span className="text-gray-600">{slip.employeeJob}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 uppercase font-bold block">Matricule & CNSS :</span>
                      <span className="font-mono font-bold text-blue-700 block">{slip.employeeMatricule}</span>
                      <span className="text-gray-600">N° CNSS : {slip.employeeCnss}</span>
                    </div>
                  </div>

                  {/* Tableau des rubriques */}
                  <table className="w-full text-left text-xs border border-gray-200">
                    <thead className="bg-gray-100 font-bold text-[10px] uppercase">
                      <tr className="border-b">
                        <th className="p-2">Rubrique</th>
                        <th className="p-2 text-right">Base</th>
                        <th className="p-2 text-center">Taux</th>
                        <th className="p-2 text-right">Part Salarié</th>
                        <th className="p-2 text-right">Part Patronale</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-mono">
                      <tr>
                        <td className="p-2 font-sans font-semibold">Salaire de Base Brut</td>
                        <td className="p-2 text-right">{formatFcfa(slip.baseSalary)}</td>
                        <td className="p-2 text-center">—</td>
                        <td className="p-2 text-right font-bold text-gray-900">+{formatFcfa(slip.baseSalary)}</td>
                        <td className="p-2 text-right text-gray-400">—</td>
                      </tr>
                      {slip.totalAllowances > 0 && (
                        <tr>
                          <td className="p-2 font-sans">Primes et indemnités</td>
                          <td className="p-2 text-right">{formatFcfa(slip.totalAllowances)}</td>
                          <td className="p-2 text-center">—</td>
                          <td className="p-2 text-right font-bold text-gray-900">+{formatFcfa(slip.totalAllowances)}</td>
                          <td className="p-2 text-right text-gray-400">—</td>
                        </tr>
                      )}
                      <tr>
                        <td className="p-2 font-sans">Cotisation CNSS Régime Général</td>
                        <td className="p-2 text-right">{formatFcfa(slip.grossSalary)}</td>
                        <td className="p-2 text-center">3,6% / 17,4%</td>
                        <td className="p-2 text-right text-blue-700 font-bold">-{formatFcfa(slip.cnssEmployee)}</td>
                        <td className="p-2 text-right text-blue-900 font-semibold">+{formatFcfa(slip.cnssEmployer)}</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-sans">Retenue ITS (DGI Bénin)</td>
                        <td className="p-2 text-right">{formatFcfa(slip.taxableBase)}</td>
                        <td className="p-2 text-center">Barème CGI</td>
                        <td className="p-2 text-right text-purple-700 font-bold">-{formatFcfa(slip.itsAmount)}</td>
                        <td className="p-2 text-right text-gray-400">—</td>
                      </tr>
                      {slip.advanceDeduction > 0 && (
                        <tr>
                          <td className="p-2 font-sans">Retenue avance sur salaire</td>
                          <td className="p-2 text-right">—</td>
                          <td className="p-2 text-center">—</td>
                          <td className="p-2 text-right text-rose-700 font-bold">-{formatFcfa(slip.advanceDeduction)}</td>
                          <td className="p-2 text-right text-gray-400">—</td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* Net */}
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-300 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-800 uppercase block">NET À PAYER</span>
                      <span className="text-[10px] text-emerald-700">Net d'impôt et de charges sociales</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-black text-emerald-800 font-mono block">
                        {formatFcfa(slip.netToPay)}
                      </span>
                    </div>
                  </div>

                  {/* Signature */}
                  <div className="pt-3 border-t grid grid-cols-2 gap-4 text-[9px] text-gray-500">
                    <div>
                      <p>Bulletin certifié conforme aux dispositions du Code du Travail du Bénin.</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold uppercase">Signature & Cachet Employeur</p>
                      <div className="h-8 border-b border-dashed border-gray-300"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t flex justify-end print:hidden">
              <Button type="button" variant="outline" onClick={() => setBulkPrintRun(null)}>
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
