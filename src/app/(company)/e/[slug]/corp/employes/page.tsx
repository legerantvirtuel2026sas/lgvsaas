'use client';

import * as React from 'react';
import { Pencil, Trash2, Lock, AlertCircle, Plus, Check, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable, ColumnDef } from '@/components/data-table/data-table';
import { formatFcfa } from '@/server/domain/money';

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

  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

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
      hireDate: '15/10/2026',
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

  const handleRunPayroll = () => {
    alert('Calcul mensuel de paie exécuté avec succès pour le mois d’octobre 2026 selon le barème ITS et les taux CNSS béninois.');
  };

  const handleViewPayslip = (emp: EmployeeRow) => {
    alert(`Affichage du bulletin de paie de ${emp.fullName} (${formatFcfa(emp.baseSalary)} brut).`);
  };

  const totalPayroll = employees.reduce((acc, curr) => acc + curr.baseSalary, 0);
  const totalCnss = Math.round(totalPayroll * 0.21); // 3.6% + 17.4%
  const totalIts = Math.round(totalPayroll * 0.0567);

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
                onClick={() => handleViewPayslip(row)}
                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center"
                title="Voir bulletin"
                aria-label="Voir bulletin"
              >
                <FileText className="w-4 h-4" />
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/bulletin:flex flex-col items-center z-30 pointer-events-none">
                <span className="bg-gray-900 text-white text-[11px] font-medium py-0.5 px-2 rounded shadow-md whitespace-nowrap">
                  Voir bulletin
                </span>
                <div className="w-2 h-1 bg-gray-900 clip-triangle -mt-px"></div>
              </div>
            </div>

            {/* Bouton Modifier avec icône crayon et tooltip */}
            <div className="relative group/edit">
              <button
                type="button"
                onClick={() => handleOpenEdit(row)}
                className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center"
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

            {/* Bouton Supprimer avec icône poubelle et tooltip */}
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

      <div className="border-b border-gray-200 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ressources Humaines & Paie (Bénin)</h1>
          <p className="mt-1 text-sm text-gray-600">
            Fiches salariés, contrats de travail, calcul des cotisations CNSS et prélèvement à la source de l’ITS.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={handleRunPayroll}>
            Exécuter la paie mensuelle
          </Button>
          <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            Nouveau salarié
          </Button>
        </div>
      </div>

      {/* Synthèse sociale et fiscale */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-semibold text-gray-400 uppercase">Masse salariale brute</span>
          <div className="text-2xl font-black text-gray-900 mt-1">{formatFcfa(totalPayroll)}</div>
          <span className="text-xs text-gray-500">{employees.length} salariés actifs</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-semibold text-gray-400 uppercase">Cotisations CNSS totales</span>
          <div className="text-2xl font-black text-blue-600 mt-1">{formatFcfa(totalCnss)}</div>
          <span className="text-xs text-blue-600">Part salarié (3.6%) + employeur (17.4%)</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-semibold text-gray-400 uppercase">Retenue ITS DGI à déclarer</span>
          <div className="text-2xl font-black text-purple-600 mt-1">{formatFcfa(totalIts)}</div>
          <span className="text-xs text-purple-600">Barème progressif CGI Bénin</span>
        </div>
      </div>

      <DataTable columns={columns} data={employees} />

      {/* MODAL 1 : AJOUT DE SALARIÉ */}
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

              <div className="p-3 bg-purple-50 rounded-lg border border-purple-100 text-xs text-purple-800">
                Le salaire de base doit respecter le SMIG béninois (52 000 FCFA). Les cotisations CNSS et l’ITS sont calculés automatiquement.
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

      {/* MODAL 2 : MODIFICATION DE SALARIÉ */}
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
