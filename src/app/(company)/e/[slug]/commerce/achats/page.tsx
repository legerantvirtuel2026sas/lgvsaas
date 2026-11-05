'use client';

import * as React from 'react';
import { Plus, Check, Building2, UserPlus, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DataTable, ColumnDef } from '@/components/data-table/data-table';
import { formatFcfa } from '@/server/domain/money';
import {
  loadSuppliers,
  saveSuppliers,
  DEFAULT_SUPPLIERS,
  SupplierItem,
} from '@/lib/suppliers-store';

interface PurchaseRow extends Record<string, unknown> {
  id: string;
  invoiceNumber: string;
  date: string;
  supplierName: string;
  totalNetHt: number;
  totalVat: number;
  totalTtc: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'DRAFT' | 'VALIDATED' | 'CANCELLED';
  paymentMode: 'COMPTANT' | 'A_TERME';
}

export default function PurchasesPage({ params }: { params: { slug: string } }) {
  const companySlug = params.slug;

  // Liste des fournisseurs synchronisée avec LGV Corp (Communs)
  const [suppliers, setSuppliers] = React.useState<SupplierItem[]>(DEFAULT_SUPPLIERS);

  // Synchronisation dynamique du référentiel fournisseurs
  React.useEffect(() => {
    const loaded = loadSuppliers(companySlug);
    setSuppliers(loaded);

    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.companySlug === companySlug && customEvent.detail?.suppliers) {
        setSuppliers(customEvent.detail.suppliers);
      }
    };

    window.addEventListener('lgv_suppliers_changed', handleSync);
    return () => window.removeEventListener('lgv_suppliers_changed', handleSync);
  }, [companySlug]);

  const [invoices, setInvoices] = React.useState<PurchaseRow[]>([
    {
      id: 'inv_1',
      invoiceNumber: 'ACH-2026-0001',
      date: '14/10/2026',
      supplierName: 'PAPETERIE NATIONALE BENINOISE',
      totalNetHt: 260000,
      totalVat: 46800,
      totalTtc: 306800,
      paidAmount: 306800,
      remainingAmount: 0,
      status: 'VALIDATED',
      paymentMode: 'COMPTANT',
    },
    {
      id: 'inv_2',
      invoiceNumber: 'ACH-2026-0002',
      date: '15/10/2026',
      supplierName: 'GROUPE CFAO MOTORS BENIN',
      totalNetHt: 125000,
      totalVat: 22500,
      totalTtc: 147500,
      paidAmount: 0,
      remainingAmount: 147500,
      status: 'DRAFT',
      paymentMode: 'A_TERME',
    },
  ]);

  // Modal principale : Nouvelle facture d'achat
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [selectedSupplierName, setSelectedSupplierName] = React.useState('');
  const [productName, setProductName] = React.useState('Rame de Papier A4 80g');
  const [quantity, setQuantity] = React.useState('50');
  const [unitPriceHt, setUnitPriceHt] = React.useState('2600');
  const [paymentMode, setPaymentMode] = React.useState<'COMPTANT' | 'A_TERME'>('COMPTANT');

  // Modal secondaire : Création rapide de fournisseur
  const [showQuickSupplierModal, setShowQuickSupplierModal] = React.useState(false);
  const [quickName, setQuickName] = React.useState('');
  const [quickIfu, setQuickIfu] = React.useState('');
  const [quickPhone, setQuickPhone] = React.useState('');
  const [quickEmail, setQuickEmail] = React.useState('');
  const [quickAddress, setQuickAddress] = React.useState('');
  const [quickTerms, setQuickTerms] = React.useState('30');

  // Notification Toast
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Fournisseur actuellement sélectionné dans le formulaire
  const currentSelectedSupplier = suppliers.find((s) => s.name === selectedSupplierName);

  // Ouverture du modal de facture avec pré-sélection intelligente
  const handleOpenNewInvoice = () => {
    if (!selectedSupplierName && suppliers.length > 0) {
      setSelectedSupplierName(suppliers[0].name);
    }
    setShowAddModal(true);
  };

  // Création du brouillon de facture d'achat
  const handleCreateDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierName.trim()) {
      alert('Veuillez sélectionner un fournisseur pour cette facture.');
      return;
    }

    const qty = parseInt(quantity, 10) || 1;
    const price = parseInt(unitPriceHt, 10) || 0;
    const netHt = qty * price;
    const vat = Math.round(netHt * 0.18);
    const ttc = netHt + vat;

    const newInv: PurchaseRow = {
      id: `inv_${Date.now()}`,
      invoiceNumber: `ACH-2026-000${invoices.length + 1}`,
      date: new Date().toLocaleDateString('fr-BJ', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
      supplierName: selectedSupplierName.trim(),
      totalNetHt: netHt,
      totalVat: vat,
      totalTtc: ttc,
      paidAmount: 0,
      remainingAmount: ttc,
      status: 'DRAFT',
      paymentMode,
    };

    setInvoices([newInv, ...invoices]);
    setShowAddModal(false);
    showToast(`Brouillon de facture "${newInv.invoiceNumber}" créé avec le fournisseur "${selectedSupplierName}".`);
  };

  // Validation rapide et enregistrement d'un nouveau fournisseur dans LGV Corp
  const handleCreateQuickSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = quickName.trim();
    if (!trimmedName) {
      alert('Le nom du fournisseur est obligatoire.');
      return;
    }

    const newSup: SupplierItem = {
      id: `sup_${Date.now()}`,
      name: trimmedName,
      ifu: quickIfu.trim() || 'Non renseigné',
      phone: quickPhone.trim() || 'Non renseigné',
      email: quickEmail.trim(),
      address: quickAddress.trim(),
      currentDebt: 0,
      paymentTermsDays: parseInt(quickTerms, 10) || 0,
      hasInvoices: false,
    };

    const nextSuppliers = [newSup, ...suppliers];
    setSuppliers(nextSuppliers);
    saveSuppliers(companySlug, nextSuppliers);

    // Sélection automatique immédiate dans le formulaire de facture
    setSelectedSupplierName(newSup.name);

    // Réinitialisation du formulaire rapide et fermeture du pop-up
    setQuickName('');
    setQuickIfu('');
    setQuickPhone('');
    setQuickEmail('');
    setQuickAddress('');
    setQuickTerms('30');
    setShowQuickSupplierModal(false);

    showToast(`Fournisseur "${newSup.name}" créé dans LGV Corp et sélectionné automatiquement.`);
  };

  // Validation d'une facture d'achat
  const handleValidate = (id: string) => {
    setInvoices(
      invoices.map((inv) => {
        if (inv.id !== id) return inv;
        const isComptant = inv.paymentMode === 'COMPTANT';
        return {
          ...inv,
          status: 'VALIDATED',
          paidAmount: isComptant ? inv.totalTtc : 0,
          remainingAmount: isComptant ? 0 : inv.totalTtc,
        };
      })
    );
    showToast('Facture validée : entrée en stock physique effectuée et CMUP recalculé.');
  };

  const columns: ColumnDef<PurchaseRow>[] = [
    {
      id: 'invoiceNumber',
      header: 'N° Facture Achat',
      accessorKey: 'invoiceNumber',
      sortable: true,
      cell: (row) => <span className="font-mono text-xs font-bold text-gray-900">{row.invoiceNumber}</span>,
    },
    {
      id: 'date',
      header: 'Date',
      accessorKey: 'date',
      sortable: true,
    },
    {
      id: 'supplierName',
      header: 'Fournisseur',
      accessorKey: 'supplierName',
      sortable: true,
      cell: (row) => (
        <span className="font-semibold text-gray-900 flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          {row.supplierName}
        </span>
      ),
    },
    {
      id: 'totalNetHt',
      header: 'Total HT',
      accessorKey: 'totalNetHt',
      type: 'number',
      cell: (row) => <span>{formatFcfa(row.totalNetHt)}</span>,
    },
    {
      id: 'totalVat',
      header: 'TVA (18%)',
      accessorKey: 'totalVat',
      type: 'number',
      cell: (row) => <span className="text-xs text-gray-500">{formatFcfa(row.totalVat)}</span>,
    },
    {
      id: 'totalTtc',
      header: 'Total TTC',
      accessorKey: 'totalTtc',
      sortable: true,
      type: 'number',
      cell: (row) => <span className="font-bold text-gray-900">{formatFcfa(row.totalTtc)}</span>,
    },
    {
      id: 'status',
      header: 'Statut',
      accessorKey: 'status',
      cell: (row) => (
        <Badge variant={row.status === 'VALIDATED' ? 'success' : 'warning'}>
          {row.status === 'VALIDATED' ? 'Validée (En stock)' : 'Brouillon'}
        </Badge>
      ),
    },
    {
      id: 'remainingAmount',
      header: 'Dette restante',
      accessorKey: 'remainingAmount',
      type: 'number',
      cell: (row) => (
        <span className={`text-xs font-semibold ${row.remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
          {row.remainingAmount > 0 ? formatFcfa(row.remainingAmount) : 'Soldée'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (row) => (
        <div>
          {row.status === 'DRAFT' && (
            <Button size="sm" onClick={() => handleValidate(row.id)} className="text-xs">
              Valider & Entrer stock
            </Button>
          )}
        </div>
      ),
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
          <h1 className="text-2xl font-bold text-gray-900">Achats Fournisseurs & Réapprovisionnements</h1>
          <p className="mt-1 text-sm text-gray-600">
            Factures d'achat avec TVA déductible, sélection des fournisseurs enregistrés dans LGV Corp et entrée en stock.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={handleOpenNewInvoice} className="flex items-center gap-1.5 shadow-sm">
            <Plus className="w-4 h-4" />
            Nouvelle facture d'achat
          </Button>
        </div>
      </div>

      <DataTable columns={columns} data={invoices} />

      {/* MODAL 1 : NOUVELLE FACTURE D'ACHAT */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Nouvelle facture d'achat
              </h3>
              <span className="text-xs text-gray-400 font-medium">Brouillon</span>
            </div>

            <form onSubmit={handleCreateDraft} className="space-y-4">
              {/* Sélecteur de fournisseur avec bouton d'ajout rapide + */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-gray-700">
                    Fournisseur (Référentiel LGV Corp) *
                  </label>
                  <span className="text-[11px] text-gray-400">
                    {suppliers.length} fournisseur{suppliers.length > 1 ? 's' : ''} enregistré{suppliers.length > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <select
                      value={selectedSupplierName}
                      onChange={(e) => setSelectedSupplierName(e.target.value)}
                      required
                      className="w-full h-10 pl-3 pr-8 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium text-gray-900"
                    >
                      <option value="">-- Sélectionner un fournisseur dans la liste --</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name} {s.ifu && s.ifu !== 'Non renseigné' ? `(IFU : ${s.ifu})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Bouton + Nouveau fournisseur */}
                  <button
                    type="button"
                    onClick={() => setShowQuickSupplierModal(true)}
                    className="h-10 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm shrink-0"
                    title="Ajouter un nouveau fournisseur s'il n'est pas dans la liste"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nouveau</span>
                  </button>
                </div>

                {/* Détails du fournisseur sélectionné */}
                {currentSelectedSupplier && (
                  <div className="mt-1.5 p-2.5 bg-blue-50/60 rounded-lg border border-blue-100 text-[11px] text-gray-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span>
                      IFU : <strong className="text-gray-900 font-mono">{currentSelectedSupplier.ifu}</strong>
                    </span>
                    <span>
                      Tél : <strong className="text-gray-900">{currentSelectedSupplier.phone}</strong>
                    </span>
                    <span>
                      Délai de règlement : <strong className="text-blue-700 font-bold">{currentSelectedSupplier.paymentTermsDays || 0} jours</strong>
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Désignation de l'article *"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Ex: Rame de Papier A4 80g"
                  required
                />
                <Input
                  label="Quantité commandée *"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="50"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Prix d'achat unitaire HT (FCFA) *"
                  type="number"
                  value={unitPriceHt}
                  onChange={(e) => setUnitPriceHt(e.target.value)}
                  placeholder="2600"
                  required
                />
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Mode de règlement</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as 'COMPTANT' | 'A_TERME')}
                    className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm bg-white focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="COMPTANT">Comptant (Paiement immédiat)</option>
                    <option value="A_TERME">À terme (Échéancier de dette)</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-600">
                La validation de la facture créditera automatiquement le stock physique restant et recalculera le Coût Moyen Unitaire Pondéré (CMUP).
              </div>

              <div className="pt-2 border-t border-gray-100 flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                  Annuler
                </Button>
                <Button type="submit">Créer le brouillon</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2 : CRÉATION RAPIDE DE FOURNISSEUR (SUB-MODAL POP-UP) */}
      {showQuickSupplierModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                Nouveau fournisseur
              </h3>
              <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                LGV Corp
              </span>
            </div>

            <p className="text-xs text-gray-500">
              Renseignez ce fournisseur pour l'enregistrer dans votre annuaire et le sélectionner immédiatement sur votre facture.
            </p>

            <form onSubmit={handleCreateQuickSupplier} className="space-y-3.5">
              <Input
                label="Nom du Fournisseur / Raison sociale *"
                placeholder="Ex: ETS ALBARIKA PAPETERIE"
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Numéro IFU (Bénin)"
                  placeholder="Ex: 0202512345678"
                  value={quickIfu}
                  onChange={(e) => setQuickIfu(e.target.value)}
                />
                <Input
                  label="Téléphone *"
                  placeholder="+229 97 00 00 00"
                  value={quickPhone}
                  onChange={(e) => setQuickPhone(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Adresse email"
                  type="email"
                  placeholder="contact@fournisseur.bj"
                  value={quickEmail}
                  onChange={(e) => setQuickEmail(e.target.value)}
                />
                <Input
                  label="Délai de paiement (jours)"
                  type="number"
                  placeholder="30"
                  value={quickTerms}
                  onChange={(e) => setQuickTerms(e.target.value)}
                />
              </div>

              <Input
                label="Adresse / Ville"
                placeholder="Ex: Haie Vive, Cotonou"
                value={quickAddress}
                onChange={(e) => setQuickAddress(e.target.value)}
              />

              <div className="pt-3 border-t border-gray-100 flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowQuickSupplierModal(false)}
                >
                  Fermer
                </Button>
                <Button type="submit">
                  Enregistrer & Sélectionner
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
