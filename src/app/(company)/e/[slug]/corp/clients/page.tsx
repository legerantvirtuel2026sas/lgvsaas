'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DataTable, ColumnDef } from '@/components/data-table/data-table';
import { formatFcfa } from '@/server/domain/money';

interface CustomerRow extends Record<string, unknown> {
  id: string;
  name: string;
  type: string;
  ifu: string;
  phone: string;
  email: string;
  currentDebt: number;
  creditLimit: number;
}

export default function CustomersPage({ params }: { params: { slug: string } }) {
  const companySlug = params.slug;

  const [customers, setCustomers] = React.useState<CustomerRow[]>([
    {
      id: 'cust_1',
      name: 'Société Béninoise d’Import-Export',
      type: 'COMPANY',
      ifu: '0202611111111',
      phone: '+229 97 22 33 44',
      email: 'comptabilite@sbie.bj',
      currentDebt: 0,
      creditLimit: 5000000,
    },
    {
      id: 'cust_2',
      name: 'Établissements Alafia & Fils',
      type: 'COMPANY',
      ifu: '0202622222222',
      phone: '+229 96 55 66 77',
      email: 'alafia@yahoo.fr',
      currentDebt: 450000,
      creditLimit: 1000000,
    },
    {
      id: 'cust_3',
      name: 'Jean-Baptiste ADANHO',
      type: 'INDIVIDUAL',
      ifu: 'Particulier',
      phone: '+229 95 88 99 00',
      email: 'jb.adanho@gmail.com',
      currentDebt: 0,
      creditLimit: 0,
    },
  ]);

  const [showAddModal, setShowAddModal] = React.useState(false);
  const [name, setName] = React.useState('');
  const [ifu, setIfu] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [creditLimit, setCreditLimit] = React.useState('0');

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    const newCust: CustomerRow = {
      id: `cust_${Date.now()}`,
      name,
      type: ifu ? 'COMPANY' : 'INDIVIDUAL',
      ifu: ifu || 'Particulier',
      phone,
      email: email || '',
      currentDebt: 0,
      creditLimit: parseInt(creditLimit, 10) || 0,
    };
    setCustomers([newCust, ...customers]);
    setShowAddModal(false);
    setName('');
    setIfu('');
    setPhone('');
    setEmail('');
    setCreditLimit('0');
  };

  const handleDelete = (cust: CustomerRow) => {
    if (cust.currentDebt > 0) {
      alert(`Suppression bloquée : ce client a un encours de créance de ${formatFcfa(cust.currentDebt)}.`);
      return;
    }
    if (confirm(`Supprimer le client ${cust.name} ?`)) {
      setCustomers(customers.filter((c) => c.id !== cust.id));
    }
  };

  const columns: ColumnDef<CustomerRow>[] = [
    {
      id: 'name',
      header: 'Client / Raison sociale',
      accessorKey: 'name',
      sortable: true,
      cell: (row) => (
        <div>
          <div className="font-semibold text-gray-900">{row.name}</div>
          <div className="text-xs text-gray-400">
            {row.type === 'COMPANY' ? 'Entreprise B2B' : 'Particulier'}
          </div>
        </div>
      ),
    },
    {
      id: 'ifu',
      header: 'IFU DGI',
      accessorKey: 'ifu',
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-xs">
          {row.ifu !== 'Particulier' ? row.ifu : <span className="text-gray-400 italic">Non assujetti</span>}
        </span>
      ),
    },
    {
      id: 'phone',
      header: 'Téléphone',
      accessorKey: 'phone',
    },
    {
      id: 'currentDebt',
      header: 'Créance en cours',
      accessorKey: 'currentDebt',
      sortable: true,
      type: 'number',
      cell: (row) => (
        <span className={`font-semibold ${row.currentDebt > 0 ? 'text-red-600' : 'text-gray-900'}`}>
          {formatFcfa(row.currentDebt)}
        </span>
      ),
    },
    {
      id: 'creditLimit',
      header: 'Plafond autorisé',
      accessorKey: 'creditLimit',
      type: 'number',
      cell: (row) => <span>{formatFcfa(row.creditLimit)}</span>,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={() => handleDelete(row)} className="text-xs text-red-600">
            Supprimer
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Référentiel Clients</h1>
          <p className="mt-1 text-sm text-gray-600">
            Fichier centralisé des clients particuliers et entreprises pour la facturation et les relances.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={() => setShowAddModal(true)}>+ Nouveau client</Button>
        </div>
      </div>

      <DataTable columns={columns} data={customers} />

      {/* Modal d'ajout de client */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Ajouter un nouveau client</h3>
            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <Input
                label="Nom ou Raison sociale *"
                placeholder="Ex: Société Béninoise SARL"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Numéro IFU (Obligatoire si B2B)"
                  placeholder="0202612345678"
                  value={ifu}
                  onChange={(e) => setIfu(e.target.value)}
                />
                <Input
                  label="Téléphone *"
                  placeholder="+229 97 00 00 00"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Email professionnel"
                  type="email"
                  placeholder="contact@client.bj"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  label="Plafond de crédit autorisé (FCFA)"
                  type="number"
                  placeholder="0"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                  Annuler
                </Button>
                <Button type="submit">Enregistrer le client</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
