'use client';

import * as React from 'react';
import {
  Pencil,
  Trash2,
  Lock,
  AlertCircle,
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable, ColumnDef } from '@/components/data-table/data-table';
import { formatFcfa } from '@/server/domain/money';
import { calculatePayslip, calculateBeninIts } from '@/server/domain/payroll';

interface EmployeeRow extends Record<string, unknown> {
  id: string;
  registrationNumber: string;
  fullName: string;
  jobTitle: string;
  baseSalary: number;
  cnssNumber: string;
  phone?: string;
  hireDate: string;
  hasPayslips?: boolean;
}

export default function EmployeesPage({ params }: { params: { slug: string } }) {
  const companySlug = params.slug;
  const companyDisplayName = companySlug.replace(/-/g, ' ').toUpperCase();

  const [employees, setEmployees] = React.useState<EmployeeRow[]>([
    {
      id: 'emp_1',
      registrationNumber: 'EMP-001',
      fullName: 'Romaric KOUASSI',
      jobTitle: 'Responsable Commercial',
      baseSalary: 250000,
      cnssNumber: '1234567890',
      phone: '+229 97 11 22 33',
      hireDate: '01/02/2024',
      hasPayslips: true,
    },
    {
      id: 'emp_2',
      registrationNumber: 'EMP-002',
      fullName: 'Béatrice SOGLO',
      jobTitle: 'Chargée de Clientèle',
      baseSalary: 120000,
      cnssNumber: '9876543210',
      phone: '+229 96 33 44 55',
      hireDate: '15/06/2025',
      hasPayslips: true,
    },
    {
      id: 'emp_3',
      registrationNumber: 'EMP-003',
      fullName: 'Gérard HOUNGBEDJI',
      jobTitle: 'Agent de Magasin / Stock',
      baseSalary: 65000,
      cnssNumber: '5566778899',
      phone: '+229 95 66 77 88',
      hireDate: '01/01/2026',
      hasPayslips: false,
    },
  ]);

  // Modal d'ajout
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [matricule, setMatricule] = React.useState('EMP-004');
  const [fullName, setFullName] = React.useState('');
  const [jobTitle, setJobTitle] = React.useState('');
  const [baseSalary, setBaseSalary] = React.useState('80000');
  const [cnss, setCnss] = React.useState('');
  const [phone, setPhone] = React.useState('');

  // Modal d'édition
  const [editingEmployee, setEditingEmployee] = React.useState<EmployeeRow | null>(null);
  const [editFullName, setEditFullName] = React.useState('');
  const [editJobTitle, setEditJobTitle] = React.useState('');
  const [editBaseSalary, setEditBaseSalary] = React.useState('');
  const [editCnss, setEditCnss] = React.useState('');
  const [editPhone, setEditPhone] = React.useState('');

  // Modales de paie
  const [viewingPayslipEmployee, setViewingPayslipEmployee] = React.useState<EmployeeRow | null>(null);
  const [showPayrollRunModal, setShowPayrollRunModal] = React.useState(false);

  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // =========================================================================
  // CALCULS FISCAUX & SOCIAUX AUX NORMES BÉNINOISES (CNSS 21% & BARÈME ITS CGI)
  // =========================================================================
  const employeePayrollData = React.useMemo(() => {
    return employees.map((emp) => {
      const payslip = calculatePayslip({ baseSalary: emp.baseSalary });
      return {
        ...emp,
        payslip,
      };
    });
  }, [employees]);

  // Masse salariale brute
  const totalPayroll = React.useMemo(() => {
    return employeePayrollData.reduce((sum, e) => sum + e.payslip.grossSalary, 0);
  }, [employeePayrollData]);

  // Cotisations CNSS : 3.6% part salarié + 17.4% part employeur = 21.0%
  const totalCnssEmployee = React.useMemo(() => {
    return employeePayrollData.reduce((sum, e) => sum + e.payslip.cnssEmployee, 0);
  }, [employeePayrollData]);

  const totalCnssEmployer = React.useMemo(() => {
    return employeePayrollData.reduce((sum, e) => sum + e.payslip.cnssEmployer, 0);
  }, [employeePayrollData]);

  const totalCnss = totalCnssEmployee + totalCnssEmployer; // 91 350 FCFA pour 435 000 FCFA

  // Impôt sur les Traitements et Salaires (ITS) selon barème progressif mensuel CGI Bénin
  const totalIts = React.useMemo(() => {
    return employeePayrollData.reduce((sum, e) => sum + e.payslip.itsAmount, 0);
  }, [employeePayrollData]);

  // Taux effectif moyen d'ITS sur la masse salariale
  const effectiveItsRate = totalPayroll > 0 ? ((totalIts / totalPayroll) * 100).toFixed(2) : '0';

  // Net total à virer aux salariés
  const totalNetPay = React.useMemo(() => {
    return employeePayrollData.reduce((sum, e) => sum + e.payslip.netToPay, 0);
  }, [employeePayrollData]);

  // Coût total employeur (Masse salariale + CNSS patronale 17.4%)
  const totalEmployerCost = totalPayroll + totalCnssEmployer;

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    const newEmp: EmployeeRow = {
      id: `emp_${Date.now()}`,
      registrationNumber: matricule.toUpperCase().trim(),
      fullName: fullName.trim(),
      jobTitle: jobTitle.trim(),
      baseSalary: parseInt(baseSalary, 10) || 52000,
      cnssNumber: cnss.trim() || 'En cours',
      phone: phone.trim(),
      hireDate: new Date().toLocaleDateString('fr-BJ'),
      hasPayslips: false,
    };
    setEmployees([...employees, newEmp]);
    setShowAddModal(false);
    setFullName('');
    setJobTitle('');
    setPhone('');
    setBaseSalary('80000');
    setMatricule(`EMP-00${employees.length + 2}`);
    showToast(`Salarié "${newEmp.fullName}" enregistré avec succès.`);
  };

  const handleOpenEdit = (emp: EmployeeRow) => {
    setEditingEmployee(emp);
    setEditFullName(emp.fullName);
    setEditJobTitle(emp.jobTitle);
    setEditBaseSalary(String(emp.baseSalary));
    setEditCnss(emp.cnssNumber === 'En cours' ? '' : emp.cnssNumber);
    setEditPhone(emp.phone || '');
  };

  const handleUpdateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    const isLocked = !!editingEmployee.hasPayslips;

    const updated = employees.map((emp) => {
      if (emp.id === editingEmployee.id) {
        return {
          ...emp,
          fullName: isLocked ? emp.fullName : editFullName.trim(),
          jobTitle: editJobTitle.trim(),
          baseSalary: parseInt(editBaseSalary, 10) || 52000,
          cnssNumber: editCnss.trim() || 'En cours',
          phone: editPhone.trim(),
        };
      }
      return emp;
    });

    setEmployees(updated);
    setEditingEmployee(null);
    showToast(`Fiche salarié "${editingEmployee.fullName}" mise à jour.`);
  };

  const handleDelete = (emp: EmployeeRow) => {
    if (emp.hasPayslips) {
      alert(`⚠️ Suppression impossible : des bulletins de paie et cotisations CNSS/ITS officielles ont déjà été générés pour "${emp.fullName}".`);
      return;
    }
    if (confirm(`Confirmez-vous la suppression du salarié "${emp.fullName}" (${emp.registrationNumber}) ?`)) {
      setEmployees(employees.filter((e) => e.id !== emp.id));
      showToast(`Salarié "${emp.fullName}" supprimé.`);
    }
  };

  const columns: ColumnDef<EmployeeRow>[] = [
    {
      id: 'registrationNumber',
      header: 'Matricule',
      accessorKey: 'registrationNumber',
      sortable: true,
      cell: (row) => <span className="font-mono text-xs font-bold text-gray-900">{row.registrationNumber}</span>,
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
      id: 'baseSalary',
      header: 'Salaire de Base',
      accessorKey: 'baseSalary',
      sortable: true,
      type: 'number',
      cell: (row) => <span className="font-semibold text-gray-900">{formatFcfa(row.baseSalary)}</span>,
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
            <span className="text-[10px] text-gray-400 block">({rate}%)</span>
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
      id: 'hireDate',
      header: 'Date d’embauche',
      accessorKey: 'hireDate',
      sortable: true,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (row) => {
        const isDeleteBlocked = !!row.hasPayslips;
        return (
          <div className="flex items-center space-x-1">
            {/* Bouton Voir bulletin */}
            <div className="relative group/bulletin">
              <button
                type="button"
                onClick={() => setViewingPayslipEmployee(row)}
                className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center"
                title="Voir le bulletin de paie détaillé"
                aria-label="Voir bulletin"
              >
                <FileText className="w-4 h-4" />
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/bulletin:flex flex-col items-center z-30 pointer-events-none">
                <span className="bg-gray-900 text-white text-[11px] font-medium py-0.5 px-2 rounded shadow-md whitespace-nowrap">
                  Bulletin de paie
                </span>
                <div className="w-2 h-1 bg-gray-900 clip-triangle -mt-px"></div>
              </div>
            </div>

            {/* Bouton Modifier */}
            <div className="relative group/edit">
              <button
                type="button"
                onClick={() => handleOpenEdit(row)}
                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center"
                title="Modifier"
                aria-label="Modifier"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/edit:flex flex-col items-center z-30 pointer-events-none">
                <span className="bg-gray-900 text-white text-[11px] font-medium py-0.5 px-2 rounded shadow-md whitespace-nowrap">
                  Modifier
                </span>
                <div className="w-2 h-1 bg-gray-900 clip-triangle -mt-px"></div>
              </div>
            </div>

            {/* Bouton Supprimer */}
            <div className="relative group/del">
              <button
                type="button"
                onClick={() => handleDelete(row)}
                className={`p-1.5 rounded-lg transition-colors flex items-center justify-center ${
                  isDeleteBlocked
                    ? 'text-gray-300 hover:text-red-500 hover:bg-red-50'
                    : 'text-red-600 hover:text-red-800 hover:bg-red-50'
                }`}
                title={isDeleteBlocked ? 'Suppression bloquée (bulletins émis)' : 'Supprimer'}
                aria-label="Supprimer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/del:flex flex-col items-center z-30 pointer-events-none">
                <span className="bg-gray-900 text-white text-[11px] font-medium py-0.5 px-2 rounded shadow-md whitespace-nowrap">
                  {isDeleteBlocked ? 'Suppression bloquée' : 'Supprimer'}
                </span>
                <div className="w-2 h-1 bg-gray-900 clip-triangle -mt-px"></div>
              </div>
            </div>
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
      <div className="border-b border-gray-200 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ressources Humaines & Paie (Bénin)</h1>
          <p className="mt-1 text-sm text-gray-600">
            Fiches salariés, calcul légal des cotisations CNSS (21%) et retenue à la source de l’ITS (barème progressif CGI Bénin).
          </p>
        </div>

        {/* Boutons d'action correctement dimensionnés sans débordement de texte */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
          <Button
            variant="outline"
            onClick={() => setShowPayrollRunModal(true)}
            className="h-10 px-4 border-blue-600 bg-blue-50/70 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm whitespace-nowrap shrink-0 transition-all"
            title="Lancer le calcul et la clôture de la paie mensuelle"
          >
            <Play className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="whitespace-nowrap">Exécuter la paie mensuelle</span>
          </Button>

          <Button
            onClick={() => setShowAddModal(true)}
            className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm whitespace-nowrap shrink-0 transition-all border border-blue-600"
          >
            <Plus className="w-4 h-4 shrink-0 text-white" />
            <span className="whitespace-nowrap">Nouveau salarié</span>
          </Button>
        </div>
      </div>

      {/* Synthèse sociale et fiscale certifiée aux normes béninoises */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <span>{employees.length} salariés actifs</span>
            <span className="font-semibold text-emerald-700">Net viré : {formatFcfa(totalNetPay)}</span>
          </div>
        </div>

        {/* 2. Cotisations CNSS totales (21%) */}
        <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-800 uppercase tracking-wider block">
                Cotisations CNSS totales (21,0%)
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

        {/* 3. Retenue ITS DGI à déclarer (Barème progressif mensuel) */}
        <div className="bg-white p-5 rounded-2xl border border-purple-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-800 uppercase tracking-wider block">
                Retenue ITS DGI à déclarer
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
              <span>Barème progressif CGI Bénin :</span>
              <span className="font-bold text-[10px]">Tranches 0% à 30%</span>
            </div>
            <span className="text-[10px] text-gray-500 block mt-0.5">
              Exonéré ≤ 60 000 • 10% (60k-150k) • 15% (150k-250k)
            </span>
          </div>
        </div>
      </div>

      {/* Tableau des salariés */}
      <DataTable columns={columns} data={employees} />

      {/* ========================================================================= */}
      {/* MODAL 1 : EXÉCUTION DU LIVRE DE PAIE MENSUEL (LIVRE DE SALAIRES) */}
      {/* ========================================================================= */}
      {showPayrollRunModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto print:block">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-6 my-auto border border-gray-200 max-h-[95vh] flex flex-col print:max-h-none print:h-auto print:shadow-none print:border-none print:p-0 print:w-full print:max-w-none print:block">
            
            {/* Barre d'action modale */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 print:hidden">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900">
                    Livre de Paie & Clôture Mensuelle • Novembre 2026
                  </h3>
                  <p className="text-xs text-gray-500">
                    Calcul certifié conforme Code de Sécurité Sociale CNSS (21%) et CGI Bénin (ITS) pour {companyDisplayName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => window.print()}
                  className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimer le Livre de Paie</span>
                </Button>
                <button
                  type="button"
                  onClick={() => setShowPayrollRunModal(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Corps du livre de paie */}
            <div className="overflow-y-auto flex-1 space-y-6 pr-1 print:overflow-visible print:pr-0">
              
              {/* En-tête officiel imprimable */}
              <div className="flex items-start justify-between border-b pb-4">
                <div>
                  <span className="text-xl font-black text-blue-700 block">{companyDisplayName}</span>
                  <p className="text-xs text-gray-600">IFU : 0202612345678 • N° Employeur CNSS : 2026-AB123</p>
                  <p className="text-xs text-gray-600">Cotonou, Bénin • Tél : +229 97 00 00 00</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded font-bold text-xs">
                    ÉTAT MENSUEL DES SALAIRES
                  </span>
                  <p className="text-xs text-gray-500 mt-1 font-mono">Période : Novembre 2026</p>
                </div>
              </div>

              {/* Tableau récapitulatif par salarié */}
              <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-xs">
                <table className="w-full text-left text-xs divide-y divide-gray-200">
                  <thead className="bg-gray-100 text-gray-700 uppercase font-bold text-[10px]">
                    <tr>
                      <th className="p-2.5">Matricule & Salarié</th>
                      <th className="p-2.5 text-right">Salaire Brut</th>
                      <th className="p-2.5 text-right">CNSS Salarié (3,6%)</th>
                      <th className="p-2.5 text-right">Base ITS</th>
                      <th className="p-2.5 text-right">Retenue ITS</th>
                      <th className="p-2.5 text-right">Net à Payer</th>
                      <th className="p-2.5 text-right">CNSS Patronale (17,4%)</th>
                      <th className="p-2.5 text-right">Coût Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {employeePayrollData.map((e) => (
                      <tr key={e.id} className="hover:bg-gray-50">
                        <td className="p-2.5">
                          <span className="font-bold text-gray-900 block">{e.fullName}</span>
                          <span className="font-mono text-[10px] text-gray-500">{e.registrationNumber} • {e.jobTitle}</span>
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-gray-900">
                          {formatFcfa(e.payslip.grossSalary)}
                        </td>
                        <td className="p-2.5 text-right font-mono text-blue-700 font-semibold">
                          -{formatFcfa(e.payslip.cnssEmployee)}
                        </td>
                        <td className="p-2.5 text-right font-mono text-gray-600">
                          {formatFcfa(e.payslip.taxableBase)}
                        </td>
                        <td className="p-2.5 text-right font-mono text-purple-700 font-bold">
                          -{formatFcfa(e.payslip.itsAmount)}
                        </td>
                        <td className="p-2.5 text-right font-mono font-black text-emerald-700 text-sm">
                          {formatFcfa(e.payslip.netToPay)}
                        </td>
                        <td className="p-2.5 text-right font-mono text-blue-900 font-semibold">
                          +{formatFcfa(e.payslip.cnssEmployer)}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-gray-900">
                          {formatFcfa(e.payslip.grossSalary + e.payslip.cnssEmployer)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-bold border-t-2 border-gray-300">
                    <tr>
                      <td className="p-3 uppercase text-gray-900">TOTAUX GÉNÉRAUX</td>
                      <td className="p-3 text-right font-mono text-gray-900">{formatFcfa(totalPayroll)}</td>
                      <td className="p-3 text-right font-mono text-blue-700">-{formatFcfa(totalCnssEmployee)}</td>
                      <td className="p-3 text-right font-mono text-gray-600">—</td>
                      <td className="p-3 text-right font-mono text-purple-700">-{formatFcfa(totalIts)}</td>
                      <td className="p-3 text-right font-mono text-emerald-700 text-sm">={formatFcfa(totalNetPay)}</td>
                      <td className="p-3 text-right font-mono text-blue-900">+{formatFcfa(totalCnssEmployer)}</td>
                      <td className="p-3 text-right font-mono text-gray-900">{formatFcfa(totalEmployerCost)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Récapitulatif des cotisations et impôts à verser */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                <div>
                  <span className="text-gray-500 block text-[11px] uppercase font-bold">À verser aux Salariés :</span>
                  <strong className="text-emerald-700 text-base font-black font-mono block mt-0.5">
                    {formatFcfa(totalNetPay)}
                  </strong>
                  <span className="text-[10px] text-gray-500">Virements bancaires ou espèces</span>
                </div>

                <div>
                  <span className="text-gray-500 block text-[11px] uppercase font-bold">À déclarer & verser à la CNSS :</span>
                  <strong className="text-blue-700 text-base font-black font-mono block mt-0.5">
                    {formatFcfa(totalCnss)}
                  </strong>
                  <span className="text-[10px] text-gray-500">Part salarié (3,6%) + employeur (17,4%)</span>
                </div>

                <div>
                  <span className="text-gray-500 block text-[11px] uppercase font-bold">À déclarer & verser à la DGI :</span>
                  <strong className="text-purple-700 text-base font-black font-mono block mt-0.5">
                    {formatFcfa(totalIts)}
                  </strong>
                  <span className="text-[10px] text-gray-500">Retenue à la source ITS (0% à 30%)</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t print:hidden">
                <span className="text-xs text-gray-500">
                  Calculs certifiés conformes au barème du CGI et du Code de Sécurité Sociale du Bénin.
                </span>
                <Button
                  onClick={() => {
                    setShowPayrollRunModal(false);
                    showToast('Paie mensuelle de Novembre 2026 exécutée et clôturée avec succès.');
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-10 px-5 rounded-xl shadow-sm"
                >
                  Valider et Clôturer la Paie
                </Button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2 : BULLETIN DE PAIE INDIVIDUEL OFFICIEL (FORMAT BÉNINOIS) */}
      {/* ========================================================================= */}
      {viewingPayslipEmployee && (() => {
        const p = calculatePayslip({ baseSalary: viewingPayslipEmployee.baseSalary });
        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto print:block">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6 my-auto border border-gray-200 max-h-[95vh] flex flex-col print:max-h-none print:h-auto print:shadow-none print:border-none print:p-0 print:w-full print:max-w-none print:block">
              
              {/* Barre de navigation modale */}
              <div className="flex items-center justify-between pb-3 border-b print:hidden">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span className="font-bold text-sm text-gray-900">
                    Bulletin de Paie Officiel • {viewingPayslipEmployee.fullName}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => window.print()}
                    className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center gap-1"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimer</span>
                  </Button>
                  <button
                    type="button"
                    onClick={() => setViewingPayslipEmployee(null)}
                    className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* CORPS DU BULLETIN DE PAIE FORMAT A4 */}
              <div className="overflow-y-auto flex-1 space-y-5 text-xs text-gray-800 pr-1 print:overflow-visible print:pr-0">
                
                {/* En-tête employeur */}
                <div className="flex items-start justify-between border-b pb-4">
                  <div>
                    <span className="text-xl font-black text-blue-700 block">{companyDisplayName}</span>
                    <p className="text-[11px] text-gray-600">IFU : 0202612345678 • N° CNSS Employeur : 2026-AB123</p>
                    <p className="text-[11px] text-gray-600">Cotonou, République du Bénin</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-3 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded font-black text-xs uppercase">
                      BULLETIN DE PAIE
                    </span>
                    <p className="text-xs font-bold text-gray-900 mt-1">Période : Novembre 2026</p>
                    <p className="text-[10px] text-gray-500 font-mono">Paiement : Virement bancaire</p>
                  </div>
                </div>

                {/* Coordonnées du salarié */}
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-bold block mb-0.5">Salarié :</span>
                    <strong className="text-sm text-gray-900 block">{viewingPayslipEmployee.fullName}</strong>
                    <span className="text-gray-600 block">Poste : {viewingPayslipEmployee.jobTitle}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 uppercase font-bold block mb-0.5">Matricule & Identifiants :</span>
                    <span className="font-mono font-bold text-blue-700 block">{viewingPayslipEmployee.registrationNumber}</span>
                    <span className="text-gray-600 block">N° CNSS : {viewingPayslipEmployee.cnssNumber}</span>
                    <span className="text-gray-500 text-[10px] block">Embauché(e) le : {viewingPayslipEmployee.hireDate}</span>
                  </div>
                </div>

                {/* Tableau des rubriques de paie */}
                <table className="w-full text-left text-xs border border-gray-200">
                  <thead className="bg-gray-100 text-gray-700 uppercase font-bold text-[10px]">
                    <tr className="border-b">
                      <th className="p-2.5">Rubrique de paie</th>
                      <th className="p-2.5 text-right">Base / Assiette</th>
                      <th className="p-2.5 text-center">Taux</th>
                      <th className="p-2.5 text-right">Part Salariale</th>
                      <th className="p-2.5 text-right">Part Patronale</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-mono">
                    <tr>
                      <td className="p-2.5 font-sans font-semibold">Salaire de Base Brut</td>
                      <td className="p-2.5 text-right">{formatFcfa(p.baseSalary)}</td>
                      <td className="p-2.5 text-center">—</td>
                      <td className="p-2.5 text-right font-bold text-gray-900">+{formatFcfa(p.baseSalary)}</td>
                      <td className="p-2.5 text-right text-gray-400">—</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-sans">Cotisation CNSS Régime Général</td>
                      <td className="p-2.5 text-right">{formatFcfa(p.grossSalary)}</td>
                      <td className="p-2.5 text-center">3,6% / 17,4%</td>
                      <td className="p-2.5 text-right text-blue-700 font-bold">-{formatFcfa(p.cnssEmployee)}</td>
                      <td className="p-2.5 text-right text-blue-900 font-semibold">{formatFcfa(p.cnssEmployer)}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-sans">
                        Retenue fiscale ITS (DGI Bénin)
                        <span className="block font-sans text-[10px] text-gray-500 font-normal">
                          Assiette imposable : {formatFcfa(p.taxableBase)}
                        </span>
                      </td>
                      <td className="p-2.5 text-right">{formatFcfa(p.taxableBase)}</td>
                      <td className="p-2.5 text-center">Barème CGI</td>
                      <td className="p-2.5 text-right text-purple-700 font-bold">-{formatFcfa(p.itsAmount)}</td>
                      <td className="p-2.5 text-right text-gray-400">—</td>
                    </tr>
                  </tbody>
                </table>

                {/* Cadre Net à Payer */}
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-300 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-emerald-800 uppercase block">NET À PAYER AU SALARIÉ</span>
                    <span className="text-[11px] text-emerald-700">Net d'impôt et de cotisations sociales</span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-emerald-700 font-mono block">
                      {formatFcfa(p.netToPay)}
                    </span>
                  </div>
                </div>

                {/* Charges patronales et coût global */}
                <div className="p-3 bg-gray-50 rounded-lg border text-[11px] flex items-center justify-between text-gray-600">
                  <span>Charges patronales CNSS (17,4%) : <strong>{formatFcfa(p.cnssEmployer)}</strong></span>
                  <span>Coût total entreprise : <strong>{formatFcfa(p.grossSalary + p.cnssEmployer)}</strong></span>
                </div>

                {/* Mentions de fin de bulletin */}
                <div className="pt-4 border-t grid grid-cols-2 gap-4 text-[10px] text-gray-500">
                  <div>
                    <p className="font-bold">Pour faire valoir ce que de droit.</p>
                    <p>Fiche établie conformément aux dispositions du Code du Travail du Bénin.</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold uppercase">Signature & Cachet de l'Employeur</p>
                    <div className="h-10 mt-1 border-b border-dashed border-gray-300"></div>
                  </div>
                </div>

              </div>

            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* MODAL 3 : AJOUT DE SALARIÉ */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Enregistrer un salarié</h3>
            <form onSubmit={handleCreateEmployee} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Matricule interne *"
                  value={matricule}
                  onChange={(e) => setMatricule(e.target.value)}
                  required
                />
                <Input
                  label="N° Immatriculation CNSS"
                  placeholder="1234567890"
                  value={cnss}
                  onChange={(e) => setCnss(e.target.value)}
                />
              </div>

              <Input
                label="Nom complet du salarié *"
                placeholder="Prénom et NOM"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Poste / Fonction *"
                  placeholder="Ex: Comptable, Vendeur..."
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  required
                />
                <Input
                  label="Téléphone"
                  placeholder="+229 97 00 00 00"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <Input
                label="Salaire de base brut (FCFA) *"
                type="number"
                placeholder="52000"
                value={baseSalary}
                onChange={(e) => setBaseSalary(e.target.value)}
                required
              />

              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-xs text-blue-800">
                Le salaire de base doit respecter le SMIG béninois (52 000 FCFA). Les cotisations CNSS (21%) et l’ITS sont calculés automatiquement.
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                  Annuler
                </Button>
                <Button type="submit">Créer la fiche salarié</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4 : MODIFICATION DE SALARIÉ */}
      {/* ========================================================================= */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-blue-600" />
                Modifier le salarié ({editingEmployee.registrationNumber})
              </h3>
              {editingEmployee.hasPayslips && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  <Lock className="w-3.5 h-3.5" />
                  Bulletins émis
                </span>
              )}
            </div>

            {editingEmployee.hasPayslips && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Ce salarié dispose de bulletins de paie et de déclarations fiscales et sociales validées. Par traçabilité légale, son <strong>nom complet</strong> et son <strong>matricule</strong> ne peuvent plus être modifiés.
                </span>
              </div>
            )}

            <form onSubmit={handleUpdateEmployee} className="space-y-4">
              <div>
                <Input
                  label="Nom complet du salarié *"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  disabled={editingEmployee.hasPayslips}
                  required
                />
                {editingEmployee.hasPayslips && (
                  <p className="text-[11px] text-gray-400 mt-1">Identité légale verrouillée</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Poste / Fonction *"
                  value={editJobTitle}
                  onChange={(e) => setEditJobTitle(e.target.value)}
                  required
                />
                <Input
                  label="Téléphone"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="N° Immatriculation CNSS"
                  value={editCnss}
                  onChange={(e) => setEditCnss(e.target.value)}
                />
                <Input
                  label="Salaire de base brut (FCFA) *"
                  type="number"
                  value={editBaseSalary}
                  onChange={(e) => setEditBaseSalary(e.target.value)}
                  required
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setEditingEmployee(null)}>
                  Annuler
                </Button>
                <Button type="submit">Sauvegarder les modifications</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
