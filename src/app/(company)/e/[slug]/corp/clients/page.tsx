'use client';

import * as React from 'react';
import { Pencil, Trash2, Lock, AlertCircle, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  address?: string;
  currentDebt: number;
  creditLimit: number;
  hasInvoices?: boolean;
}

export default function CustomersPage({ params }: { params: { slug: string } }) {
  const [customers, setCustomers] = React.useState<CustomerRow[]>([
    {
      id: 'cust_1',
      name: 'Société Béninoise d’Import-Export',
      type: 'COMPANY',
      ifu: '0202611111111',
      phone: '+229 97 22 33 44',
      email: 'comptabilite@sbie.bj',
      address: 'Zone Industrielle Akpakpa, Cotonou',
      currentDebt: 0,
      creditLimit: 5000000,
      hasInvoices: true,
    },
    {
      id: 'cust_2',
      name: 'Établissements Alafia & Fils',
      type: 'COMPANY',
      ifu: '0202622222222',
      phone: '+229 96 55 66 77',
      email: 'alafia@yahoo.fr',
      address: 'Marché Dantokpa, Cotonou',
      currentDebt: 450000,
      creditLimit: 1000000,
      hasInvoices: true,
    },
    {
      id: 'cust_3',
      name: 'Jean-Baptiste ADANHO',
      type: 'INDIVIDUAL',
      ifu: 'Particulier',
      phone: '+229 95 88 99 00',
      email: 'jb.adanho@gmail.com',
      address: 'Haie Vive, Cotonou',
      currentDebt: 0,
      creditLimit: 0,
      hasInvoices: false,
    },
  ]);

  // Modal d'ajout
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [name, setName] = React.useState('');
  const [ifu, setIfu] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [creditLimit, setCreditLimit] = React.useState('0');

  // Modal d'édition
  const [editingCustomer, setEditingCustomer] = React.useState<CustomerRow | null>(null);
  const [editName, setEditName] = React.useState('');
  const [editIfu, setEditIfu] = React.useState('');
  const [editPhone, setEditPhone] = React.useState('');
  const [editEmail, setEditEmail] = React.useState('');
  const [editAddress, setEditAddress] = React.useState('');
  const [editCreditLimit, setEditCreditLimit] = React.useState('0');

  // Message d'alerte / notification
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    const newCust: CustomerRow = {
      id: `cust_${Date.now()}`,
      name: name.trim(),
      type: ifu ? 'COMPANY' : 'INDIVIDUAL',
      ifu: ifu.trim() || 'Particulier',
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      currentDebt: 0,
      creditLimit: parseInt(creditLimit, 10) || 0,
      hasInvoices: false,
    };
    setCustomers([newCust, ...customers]);
    setShowAddModal(false);
    setName('');
    setIfu('');
    setPhone('');
    setEmail('');
    setAddress('');
    setCreditLimit('0');
    showToast(`Client "${newCust.name}" créé avec succès.`);
  };

  const handleOpenEdit = (cust: CustomerRow) => {
    setEditingCustomer(cust);
    setEditName(cust.name);
    setEditIfu(cust.ifu === 'Particulier' ? '' : cust.ifu);
    setEditPhone(cust.phone);
    setEditEmail(cust.email || '');
    setEditAddress(cust.address || '');
    setEditCreditLimit(String(cust.creditLimit || 0));
  };

  const handleUpdateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    const isLocked = editingCustomer.hasInvoices || editingCustomer.currentDebt > 0;

    const updated = customers.map((c) => {
      if (c.id === editingCustomer.id) {
        return {
          ...c,
          // Si verrouillé par des opérations antérieures, garder le nom et l'IFU d'origine
          name: isLocked ? c.name : editName.trim(),
          ifu: isLocked ? c.ifu : (editIfu.trim() || 'Particulier'),
          type: isLocked ? c.type : (editIfu.trim() ? 'COMPANY' : 'INDIVIDUAL'),
          phone: editPhone.trim(),
          email: editEmail.trim(),
          address: editAddress.trim(),
          creditLimit: parseInt(editCreditLimit, 10) || 0,
        };
      }
      return c;
    });

    setCustomers(updated);
    setEditingCustomer(null);
    showToast(`Modifications enregistrées pour "${editingCustomer.name}".`);
  };

  const handleDelete = (cust: CustomerRow) => {
    // Règle d'intégrité stricte demandée par l'utilisateur
    if (cust.currentDebt > 0) {
      alert(`⚠️ Suppression impossible : le client "${cust.name}" a un encours de créance de ${formatFcfa(cust.currentDebt)}.`);
      return;
    }
    if (cust.hasInvoices) {
      alert(`⚠️ Suppression impossible : des factures officielles ont déjà été délivrées au client "${cust.name}". Les données sont conservées pour la conformité fiscale.`);
      return;
    }
    if (confirm(`Confirmez-vous la suppression du client "${cust.name}" ?`)) {
      setCustomers(customers.filter((c) => c.id !== cust.id));
      showToast(`Client "${cust.name}" supprimé.`);
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
          <div className="font-semibold text-gray-900 flex items-center gap-1.5">
            {row.name}
            {(row.hasInvoices || row.currentDebt > 0) && (
              <span title="Opérations liées : identité verrouillée" className="text-gray-400">
                <Lock className="w-3.5 h-3.5 inline text-amber-500" />
              </span>
            )}
          </div>
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
      cell: (row) => {
        const isDeleteBlocked = row.hasInvoices || row.currentDebt > 0;
        return (
          <div className="flex items-center space-x-1">
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
                title={isDeleteBlocked ? 'Suppression bloquée (opérations liées)' : 'Supprimer'}
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
          <h1 className="text-2xl font-bold text-gray-900">Référentiel Clients</h1>
          <p className="mt-1 text-sm text-gray-600">
            Fichier centralisé des clients particuliers et entreprises pour la facturation et les relances.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            Nouveau client
          </Button>
        </div>
      </div>

      <DataTable columns={columns} data={customers} />

      {/* MODAL 1 : AJOUT DE CLIENT */}
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

              <Input
                label="Adresse géographique"
                placeholder="Ex: Cotonou, Ganhi Rue du Commerce"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />

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

      {/* MODAL 2 : MODIFICATION DE CLIENT */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-blue-600" />
                Modifier le client
              </h3>
              {(editingCustomer.hasInvoices || editingCustomer.currentDebt > 0) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  <Lock className="w-3.5 h-3.5" />
                  Factures liées
                </span>
              )}
            </div>

            {(editingCustomer.hasInvoices || editingCustomer.currentDebt > 0) && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Ce client est impliqué dans des factures ou possède un encours de créance. Par conformité fiscale et traçabilité légale, sa <strong>raison sociale</strong> et son <strong>IFU</strong> ne peuvent plus être modifiés.
                </span>
              </div>
            )}

            <form onSubmit={handleUpdateCustomer} className="space-y-4">
              <div>
                <Input
                  label="Nom ou Raison sociale *"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={editingCustomer.hasInvoices || editingCustomer.currentDebt > 0}
                  required
                />
                {(editingCustomer.hasInvoices || editingCustomer.currentDebt > 0) && (
                  <p className="text-[11px] text-gray-400 mt-1">Champ verrouillé pour conformité</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Numéro IFU DGI"
                    value={editIfu}
                    onChange={(e) => setEditIfu(e.target.value)}
                    disabled={editingCustomer.hasInvoices || editingCustomer.currentDebt > 0}
                  />
                  {(editingCustomer.hasInvoices || editingCustomer.currentDebt > 0) && (
                    <p className="text-[11px] text-gray-400 mt-1">Identifiant fiscal verrouillé</p>
                  )}
                </div>
                <Input
                  label="Téléphone *"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Email professionnel"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
                <Input
                  label="Plafond de crédit autorisé (FCFA)"
                  type="number"
                  value={editCreditLimit}
                  onChange={(e) => setEditCreditLimit(e.target.value)}
                />
              </div>

              <Input
                label="Adresse géographique"
                placeholder="Ex: Cotonou, Ganhi"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
              />

              <div className="pt-3 flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setEditingCustomer(null)}>
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
