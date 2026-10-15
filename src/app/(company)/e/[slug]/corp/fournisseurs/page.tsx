'use client';

import * as React from 'react';
import { Pencil, Trash2, Lock, AlertCircle, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable, ColumnDef } from '@/components/data-table/data-table';
import { formatFcfa } from '@/server/domain/money';

interface SupplierRow extends Record<string, unknown> {
  id: string;
  name: string;
  ifu: string;
  phone: string;
  email: string;
  address?: string;
  currentDebt: number;
  paymentTermsDays: number;
  hasInvoices?: boolean;
}

export default function SuppliersPage({ params }: { params: { slug: string } }) {
  const [suppliers, setSuppliers] = React.useState<SupplierRow[]>([
    {
      id: 'sup_1',
      name: 'GROUPE CFAO MOTORS BENIN',
      ifu: '0201900012345',
      phone: '+229 21 31 20 00',
      email: 'contact@cfaogroup.com',
      address: 'Boulevard de la Marina, Cotonou',
      currentDebt: 1250000,
      paymentTermsDays: 30,
      hasInvoices: true,
    },
    {
      id: 'sup_2',
      name: 'PAPETERIE NATIONALE BENINOISE',
      ifu: '0202111199887',
      phone: '+229 97 45 67 89',
      email: 'ventes@papeterie-bj.com',
      address: 'Avenue Clozel, Cotonou',
      currentDebt: 0,
      paymentTermsDays: 15,
      hasInvoices: true,
    },
    {
      id: 'sup_3',
      name: 'ETS BABA & FRERES QUINCAILLERIE',
      ifu: '0202455512123',
      phone: '+229 96 11 22 33',
      email: 'baba.quincaillerie@gmail.com',
      address: 'Marché Dantokpa, Cotonou',
      currentDebt: 0,
      paymentTermsDays: 0,
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
  const [paymentTermsDays, setPaymentTermsDays] = React.useState('30');

  // Modal d'édition
  const [editingSupplier, setEditingSupplier] = React.useState<SupplierRow | null>(null);
  const [editName, setEditName] = React.useState('');
  const [editIfu, setEditIfu] = React.useState('');
  const [editPhone, setEditPhone] = React.useState('');
  const [editEmail, setEditEmail] = React.useState('');
  const [editAddress, setEditAddress] = React.useState('');
  const [editPaymentTermsDays, setEditPaymentTermsDays] = React.useState('30');

  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    const newSup: SupplierRow = {
      id: `sup_${Date.now()}`,
      name: name.trim(),
      ifu: ifu.trim() || 'Non renseigné',
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      currentDebt: 0,
      paymentTermsDays: parseInt(paymentTermsDays, 10) || 0,
      hasInvoices: false,
    };
    setSuppliers([newSup, ...suppliers]);
    setShowAddModal(false);
    setName('');
    setIfu('');
    setPhone('');
    setEmail('');
    setAddress('');
    setPaymentTermsDays('30');
    showToast(`Fournisseur "${newSup.name}" créé avec succès.`);
  };

  const handleOpenEdit = (sup: SupplierRow) => {
    setEditingSupplier(sup);
    setEditName(sup.name);
    setEditIfu(sup.ifu === 'Non renseigné' ? '' : sup.ifu);
    setEditPhone(sup.phone);
    setEditEmail(sup.email || '');
    setEditAddress(sup.address || '');
    setEditPaymentTermsDays(String(sup.paymentTermsDays || 0));
  };

  const handleUpdateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;

    const isLocked = editingSupplier.hasInvoices || editingSupplier.currentDebt > 0;

    const updated = suppliers.map((s) => {
      if (s.id === editingSupplier.id) {
        return {
          ...s,
          name: isLocked ? s.name : editName.trim(),
          ifu: isLocked ? s.ifu : (editIfu.trim() || 'Non renseigné'),
          phone: editPhone.trim(),
          email: editEmail.trim(),
          address: editAddress.trim(),
          paymentTermsDays: parseInt(editPaymentTermsDays, 10) || 0,
        };
      }
      return s;
    });

    setSuppliers(updated);
    setEditingSupplier(null);
    showToast(`Modifications enregistrées pour "${editingSupplier.name}".`);
  };

  const handleDelete = (sup: SupplierRow) => {
    if (sup.currentDebt > 0) {
      alert(`⚠️ Suppression impossible : une dette fournisseur en cours de ${formatFcfa(sup.currentDebt)} est rattachée à "${sup.name}".`);
      return;
    }
    if (sup.hasInvoices) {
      alert(`⚠️ Suppression impossible : des factures d'achat officielles ont déjà été enregistrées avec "${sup.name}". Les données sont conservées pour la comptabilité.`);
      return;
    }
    if (confirm(`Confirmez-vous la suppression du fournisseur "${sup.name}" ?`)) {
      setSuppliers(suppliers.filter((s) => s.id !== sup.id));
      showToast(`Fournisseur "${sup.name}" supprimé.`);
    }
  };

  const columns: ColumnDef<SupplierRow>[] = [
    {
      id: 'name',
      header: 'Fournisseur / Raison sociale',
      accessorKey: 'name',
      sortable: true,
      cell: (row) => (
        <div>
          <div className="font-semibold text-gray-900 flex items-center gap-1.5">
            {row.name}
            {(row.hasInvoices || row.currentDebt > 0) && (
              <span title="Factures d'achat liées : identité verrouillée" className="text-gray-400">
                <Lock className="w-3.5 h-3.5 inline text-amber-500" />
              </span>
            )}
          </div>
          {row.address && <div className="text-xs text-gray-400">{row.address}</div>}
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
          {row.ifu !== 'Non renseigné' ? row.ifu : <span className="text-gray-400 italic">Non renseigné</span>}
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
      header: 'Dette en cours',
      accessorKey: 'currentDebt',
      sortable: true,
      type: 'number',
      cell: (row) => (
        <span className={`font-semibold ${row.currentDebt > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
          {formatFcfa(row.currentDebt)}
        </span>
      ),
    },
    {
      id: 'paymentTermsDays',
      header: 'Délai règlement',
      accessorKey: 'paymentTermsDays',
      type: 'number',
      cell: (row) => (
        <span className="text-xs text-gray-600">
          {row.paymentTermsDays > 0 ? `${row.paymentTermsDays} jours` : 'Comptant'}
        </span>
      ),
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
          <h1 className="text-2xl font-bold text-gray-900">Référentiel Fournisseurs</h1>
          <p className="mt-1 text-sm text-gray-600">
            Fichier des partenaires, prestataires et fournisseurs pour la gestion des achats et approvisionnements.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            Nouveau fournisseur
          </Button>
        </div>
      </div>

      <DataTable columns={columns} data={suppliers} />

      {/* MODAL 1 : AJOUT DE FOURNISSEUR */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Ajouter un nouveau fournisseur</h3>
            <form onSubmit={handleCreateSupplier} className="space-y-4">
              <Input
                label="Nom ou Raison sociale *"
                placeholder="Ex: CFAO Motors Bénin"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Numéro IFU DGI"
                  placeholder="0201912345678"
                  value={ifu}
                  onChange={(e) => setIfu(e.target.value)}
                />
                <Input
                  label="Téléphone *"
                  placeholder="+229 21 00 00 00"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Email professionnel"
                  type="email"
                  placeholder="contact@fournisseur.bj"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  label="Délai de règlement accordé (Jours)"
                  type="number"
                  placeholder="30"
                  value={paymentTermsDays}
                  onChange={(e) => setPaymentTermsDays(e.target.value)}
                />
              </div>

              <Input
                label="Adresse géographique"
                placeholder="Ex: Cotonou, Zone Industrielle"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />

              <div className="pt-3 flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                  Annuler
                </Button>
                <Button type="submit">Enregistrer le fournisseur</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2 : MODIFICATION DE FOURNISSEUR */}
      {editingSupplier && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-blue-600" />
                Modifier le fournisseur
              </h3>
              {(editingSupplier.hasInvoices || editingSupplier.currentDebt > 0) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  <Lock className="w-3.5 h-3.5" />
                  Factures d'achat liées
                </span>
              )}
            </div>

            {(editingSupplier.hasInvoices || editingSupplier.currentDebt > 0) && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Ce fournisseur est rattaché à des factures d'achat comptabilisées. Par conformité fiscale et traçabilité, sa <strong>raison sociale</strong> et son <strong>IFU</strong> ne peuvent plus être modifiés.
                </span>
              </div>
            )}

            <form onSubmit={handleUpdateSupplier} className="space-y-4">
              <div>
                <Input
                  label="Nom ou Raison sociale *"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={editingSupplier.hasInvoices || editingSupplier.currentDebt > 0}
                  required
                />
                {(editingSupplier.hasInvoices || editingSupplier.currentDebt > 0) && (
                  <p className="text-[11px] text-gray-400 mt-1">Champ verrouillé pour conformité</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Numéro IFU DGI"
                    value={editIfu}
                    onChange={(e) => setEditIfu(e.target.value)}
                    disabled={editingSupplier.hasInvoices || editingSupplier.currentDebt > 0}
                  />
                  {(editingSupplier.hasInvoices || editingSupplier.currentDebt > 0) && (
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
                  label="Délai de règlement accordé (Jours)"
                  type="number"
                  value={editPaymentTermsDays}
                  onChange={(e) => setEditPaymentTermsDays(e.target.value)}
                />
              </div>

              <Input
                label="Adresse géographique"
                placeholder="Ex: Cotonou, Zone Industrielle"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
              />

              <div className="pt-3 flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setEditingSupplier(null)}>
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
