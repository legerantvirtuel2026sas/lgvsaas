'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  hireDate: string;
}

export default function EmployeesPage({ params }: { params: { slug: string } }) {
  const companySlug = params.slug;

  const [employees, setEmployees] = React.useState<EmployeeRow[]>([
    {
      id: 'emp_1',
      registrationNumber: 'EMP-001',
      fullName: 'Romaric KOUASSI',
      jobTitle: 'Responsable Commercial',
      baseSalary: 250000,
      cnssNumber: '1234567890',
      hireDate: '01/02/2024',
    },
    {
      id: 'emp_2',
      registrationNumber: 'EMP-002',
      fullName: 'Béatrice SOGLO',
      jobTitle: 'Chargée de Clientèle',
      baseSalary: 120000,
      cnssNumber: '9876543210',
      hireDate: '15/06/2025',
    },
    {
      id: 'emp_3',
      registrationNumber: 'EMP-003',
      fullName: 'Gérard HOUNGBEDJI',
      jobTitle: 'Agent de Magasin / Stock',
      baseSalary: 65000,
      cnssNumber: '5566778899',
      hireDate: '01/01/2026',
    },
  ]);

  const [showAddModal, setShowAddModal] = React.useState(false);
  const [matricule, setMatricule] = React.useState('EMP-004');
  const [fullName, setFullName] = React.useState('');
  const [jobTitle, setJobTitle] = React.useState('');
  const [baseSalary, setBaseSalary] = React.useState('80000');
  const [cnss, setCnss] = React.useState('');

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    const newEmp: EmployeeRow = {
      id: `emp_${Date.now()}`,
      registrationNumber: matricule.toUpperCase().trim(),
      fullName: fullName.trim(),
      jobTitle: jobTitle.trim(),
      baseSalary: parseInt(baseSalary, 10) || 52000,
      cnssNumber: cnss.trim() || 'En cours',
      hireDate: '15/10/2026',
    };
    setEmployees([...employees, newEmp]);
    setShowAddModal(false);
    setFullName('');
    setJobTitle('');
    setBaseSalary('80000');
  };

  const handleRunPayroll = () => {
    alert('Calcul mensuel de paie exécuté avec succès pour le mois d’octobre 2026 selon le barème ITS et les taux CNSS béninois.');
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
          <div className="font-semibold text-gray-900">{row.fullName}</div>
          <div className="text-xs text-gray-400">{row.jobTitle}</div>
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
      header: 'Bulletins',
      cell: (row) => (
        <Button variant="outline" size="sm" className="text-xs">
          Voir bulletin
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
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
          <Button onClick={() => setShowAddModal(true)}>+ Nouveau salarié</Button>
        </div>
      </div>

      {/* Synthèse sociale et fiscale */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-semibold text-gray-400 uppercase">Masse salariale brute</span>
          <div className="text-2xl font-black text-gray-900 mt-1">{formatFcfa(435000)}</div>
          <span className="text-xs text-gray-500">3 salariés actifs</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-semibold text-gray-400 uppercase">Cotisations CNSS totales</span>
          <div className="text-2xl font-black text-blue-600 mt-1">{formatFcfa(91350)}</div>
          <span className="text-xs text-blue-600">Part salarié (3.6%) + employeur (17.4%)</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-semibold text-gray-400 uppercase">Retenue ITS DGI à déclarer</span>
          <div className="text-2xl font-black text-purple-600 mt-1">{formatFcfa(24660)}</div>
          <span className="text-xs text-purple-600">Barème progressif CGI Bénin</span>
        </div>
      </div>

      <DataTable columns={columns} data={employees} />

      {/* Modal d'ajout de salarié */}
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
                  label="Salaire de base brut (FCFA) *"
                  type="number"
                  placeholder="52000"
                  value={baseSalary}
                  onChange={(e) => setBaseSalary(e.target.value)}
                  required
                />
              </div>

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
    </div>
  );
}
