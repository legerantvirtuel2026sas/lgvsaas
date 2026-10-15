'use client';

import * as React from 'react';
import { Pencil, Trash2, Lock, AlertCircle, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DataTable, ColumnDef } from '@/components/data-table/data-table';
import { formatFcfa } from '@/server/domain/money';

interface ProductRow extends Record<string, unknown> {
  id: string;
  sku: string;
  name: string;
  category: string;
  salePriceHt: number;
  costPrice: number | null;
  taxGroup: 'A' | 'B' | 'C' | 'D';
  currentStock: number;
  minStockAlert: number;
  hasTransactions?: boolean;
}

export default function ArticlesPage({ params }: { params: { slug: string } }) {
  const [products, setProducts] = React.useState<ProductRow[]>([
    {
      id: 'prod_1',
      sku: 'RAM-A4-80G',
      name: 'Rame de papier A4 80g Double A',
      category: 'Fournitures de bureau',
      salePriceHt: 3500,
      costPrice: 2450,
      taxGroup: 'B',
      currentStock: 4, // Alerte stock
      minStockAlert: 15,
      hasTransactions: true,
    },
    {
      id: 'prod_2',
      sku: 'TONER-HP-05A',
      name: 'Cartouche de Toner HP LaserJet 05A Noir',
      category: 'Consommables',
      salePriceHt: 45000,
      costPrice: 32000,
      taxGroup: 'B',
      currentStock: 2, // Alerte stock
      minStockAlert: 5,
      hasTransactions: true,
    },
    {
      id: 'prod_3',
      sku: 'CLAV-LOGI-K120',
      name: 'Clavier USB Filaire Logitech K120',
      category: 'Informatique',
      salePriceHt: 6500,
      costPrice: 4200,
      taxGroup: 'B',
      currentStock: 0,
      minStockAlert: 5,
      hasTransactions: false,
    },
  ]);

  // Modal d'ajout
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [sku, setSku] = React.useState('');
  const [name, setName] = React.useState('');
  const [category, setCategory] = React.useState('Général');
  const [salePriceHt, setSalePriceHt] = React.useState('');
  const [costPrice, setCostPrice] = React.useState('');
  const [taxGroup, setTaxGroup] = React.useState<'A' | 'B' | 'C' | 'D'>('B');
  const [minStockAlert, setMinStockAlert] = React.useState('5');

  // Modal d'édition
  const [editingProduct, setEditingProduct] = React.useState<ProductRow | null>(null);
  const [editSku, setEditSku] = React.useState('');
  const [editName, setEditName] = React.useState('');
  const [editCategory, setEditCategory] = React.useState('Général');
  const [editSalePriceHt, setEditSalePriceHt] = React.useState('');
  const [editCostPrice, setEditCostPrice] = React.useState('');
  const [editTaxGroup, setEditTaxGroup] = React.useState<'A' | 'B' | 'C' | 'D'>('B');
  const [editMinStockAlert, setEditMinStockAlert] = React.useState('5');

  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const newProd: ProductRow = {
      id: `prod_${Date.now()}`,
      sku: sku.toUpperCase().trim(),
      name: name.trim(),
      category: category.trim() || 'Général',
      salePriceHt: parseInt(salePriceHt, 10) || 0,
      costPrice: parseInt(costPrice, 10) || 0,
      taxGroup,
      currentStock: 0,
      minStockAlert: parseInt(minStockAlert, 10) || 5,
      hasTransactions: false,
    };
    setProducts([newProd, ...products]);
    setShowAddModal(false);
    setSku('');
    setName('');
    setCategory('Général');
    setSalePriceHt('');
    setCostPrice('');
    showToast(`Article "${newProd.name}" (${newProd.sku}) créé avec succès.`);
  };

  const handleOpenEdit = (prod: ProductRow) => {
    setEditingProduct(prod);
    setEditSku(prod.sku);
    setEditName(prod.name);
    setEditCategory(prod.category);
    setEditSalePriceHt(String(prod.salePriceHt));
    setEditCostPrice(String(prod.costPrice ?? 0));
    setEditTaxGroup(prod.taxGroup);
    setEditMinStockAlert(String(prod.minStockAlert));
  };

  const handleUpdateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const isLocked = editingProduct.currentStock > 0 || !!editingProduct.hasTransactions;

    setProducts(
      products.map((p) => {
        if (p.id === editingProduct.id) {
          return {
            ...p,
            sku: isLocked ? p.sku : editSku.trim().toUpperCase(),
            name: isLocked ? p.name : editName.trim(),
            category: editCategory.trim() || 'Général',
            salePriceHt: parseInt(editSalePriceHt, 10) || 0,
            costPrice: parseInt(editCostPrice, 10) || 0,
            taxGroup: editTaxGroup,
            minStockAlert: parseInt(editMinStockAlert, 10) || 5,
          };
        }
        return p;
      })
    );

    setEditingProduct(null);
    showToast(`Article "${editingProduct.name}" mis à jour.`);
  };

  const handleDelete = (prod: ProductRow) => {
    if (prod.currentStock > 0) {
      alert(`⚠️ Suppression impossible : l'article "${prod.name}" possède un stock physique de ${prod.currentStock} unités.`);
      return;
    }
    if (prod.hasTransactions) {
      alert(`⚠️ Suppression impossible : l'article "${prod.name}" figure déjà sur des factures ou des mouvements d'achats/ventes.`);
      return;
    }
    if (confirm(`Confirmez-vous la suppression de l'article ${prod.sku} - ${prod.name} ?`)) {
      setProducts(products.filter((p) => p.id !== prod.id));
      showToast(`Article "${prod.name}" supprimé.`);
    }
  };

  const columns: ColumnDef<ProductRow>[] = [
    {
      id: 'sku',
      header: 'Réf. SKU',
      accessorKey: 'sku',
      sortable: true,
      cell: (row) => <span className="font-mono text-xs font-bold text-gray-900">{row.sku}</span>,
    },
    {
      id: 'name',
      header: 'Désignation',
      accessorKey: 'name',
      sortable: true,
      cell: (row) => (
        <div>
          <div className="font-semibold text-gray-900 flex items-center gap-1.5">
            {row.name}
            {(row.currentStock > 0 || row.hasTransactions) && (
              <span title="Opérations ou stock lié : référence verrouillée" className="text-gray-400">
                <Lock className="w-3.5 h-3.5 inline text-amber-500" />
              </span>
            )}
          </div>
          <div className="text-xs text-gray-400">{row.category}</div>
        </div>
      ),
    },
    {
      id: 'salePriceHt',
      header: 'Prix Vente HT',
      accessorKey: 'salePriceHt',
      sortable: true,
      type: 'number',
      cell: (row) => <span className="font-semibold text-blue-600">{formatFcfa(row.salePriceHt)}</span>,
    },
    {
      id: 'costPrice',
      header: 'Prix Revient',
      accessorKey: 'costPrice',
      sortable: true,
      type: 'number',
      cell: (row) => (
        <span className="text-xs text-gray-500 font-mono">
          {row.costPrice !== null ? formatFcfa(row.costPrice) : '••••••'}
        </span>
      ),
    },
    {
      id: 'taxGroup',
      header: 'TVA e-MECeF',
      accessorKey: 'taxGroup',
      cell: (row) => (
        <Badge variant={row.taxGroup === 'B' ? 'default' : 'secondary'}>
          Gr. {row.taxGroup} {row.taxGroup === 'B' ? '(18%)' : '(Exo)'}
        </Badge>
      ),
    },
    {
      id: 'currentStock',
      header: 'Stock actuel',
      accessorKey: 'currentStock',
      sortable: true,
      type: 'number',
      cell: (row) => {
        const isOutOfStock = row.currentStock <= 0;
        const isUnderMin = row.currentStock <= row.minStockAlert;
        return (
          <div className="flex items-center space-x-2">
            <span
              className={`font-bold ${
                isOutOfStock ? 'text-red-600' : isUnderMin ? 'text-amber-600' : 'text-gray-900'
              }`}
            >
              {row.currentStock}
            </span>
            {isOutOfStock ? (
              <Badge variant="destructive">Rupture</Badge>
            ) : isUnderMin ? (
              <Badge variant="warning">Alerte</Badge>
            ) : null}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (row) => {
        const isDeleteBlocked = row.currentStock > 0 || !!row.hasTransactions;
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
                title={isDeleteBlocked ? 'Suppression bloquée (stock ou écritures existantes)' : 'Supprimer'}
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
          <h1 className="text-2xl font-bold text-gray-900">Catalogue des Articles & Stock</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gestion du référentiel d’articles, prix de vente HT, prix de revient et alertes de stock.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            Nouvel article
          </Button>
        </div>
      </div>

      <DataTable columns={columns} data={products} />

      {/* MODAL 1 : AJOUT D'ARTICLE */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Ajouter un nouvel article</h3>
            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Référence / SKU *"
                  placeholder="EX: REF-001"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  required
                />
                <Input
                  label="Seuil d'alerte stock"
                  type="number"
                  placeholder="5"
                  value={minStockAlert}
                  onChange={(e) => setMinStockAlert(e.target.value)}
                />
              </div>

              <Input
                label="Désignation de l'article *"
                placeholder="Ex: Rame de papier A4 80g"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <Input
                label="Catégorie"
                placeholder="Ex: Fournitures, Informatique..."
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Prix de vente unitaire HT (FCFA) *"
                  type="number"
                  placeholder="3500"
                  value={salePriceHt}
                  onChange={(e) => setSalePriceHt(e.target.value)}
                  required
                />
                <Input
                  label="Prix de revient unitaire HT (FCFA) *"
                  type="number"
                  placeholder="2500"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Groupe de taxation e-MECeF
                </label>
                <select
                  value={taxGroup}
                  onChange={(e) => setTaxGroup(e.target.value as 'A' | 'B' | 'C' | 'D')}
                  className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm bg-white focus:ring-1 focus:ring-blue-500"
                >
                  <option value="B">Groupe B - Taxable 18% (Régime normal)</option>
                  <option value="A">Groupe A - Exonéré de TVA</option>
                  <option value="C">Groupe C - Exportation</option>
                  <option value="D">Groupe D - Régime d'exception</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                  Annuler
                </Button>
                <Button type="submit">Créer l'article</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2 : MODIFICATION D'ARTICLE */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-blue-600" />
                Modifier l'article
              </h3>
              {(editingProduct.currentStock > 0 || editingProduct.hasTransactions) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  <Lock className="w-3.5 h-3.5" />
                  Opérations liées
                </span>
              )}
            </div>

            {(editingProduct.currentStock > 0 || editingProduct.hasTransactions) && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Cet article possède du stock physique ou figure sur des factures de vente/achat déjà validées. La <strong>référence (SKU)</strong> et la <strong>désignation</strong> sont verrouillées pour garantir l'exactitude de l'inventaire et des bilans.
                </span>
              </div>
            )}

            <form onSubmit={handleUpdateProduct} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Référence / SKU *"
                    value={editSku}
                    onChange={(e) => setEditSku(e.target.value)}
                    disabled={editingProduct.currentStock > 0 || editingProduct.hasTransactions}
                    required
                  />
                  {(editingProduct.currentStock > 0 || editingProduct.hasTransactions) && (
                    <p className="text-[11px] text-gray-400 mt-1">Référence SKU verrouillée</p>
                  )}
                </div>
                <Input
                  label="Seuil d'alerte stock"
                  type="number"
                  value={editMinStockAlert}
                  onChange={(e) => setEditMinStockAlert(e.target.value)}
                />
              </div>

              <div>
                <Input
                  label="Désignation de l'article *"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={editingProduct.currentStock > 0 || editingProduct.hasTransactions}
                  required
                />
                {(editingProduct.currentStock > 0 || editingProduct.hasTransactions) && (
                  <p className="text-[11px] text-gray-400 mt-1">Désignation verrouillée</p>
                )}
              </div>

              <Input
                label="Catégorie"
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Prix de vente unitaire HT (FCFA) *"
                  type="number"
                  value={editSalePriceHt}
                  onChange={(e) => setEditSalePriceHt(e.target.value)}
                  required
                />
                <Input
                  label="Prix de revient unitaire HT (FCFA) *"
                  type="number"
                  value={editCostPrice}
                  onChange={(e) => setEditCostPrice(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Groupe de taxation e-MECeF
                </label>
                <select
                  value={editTaxGroup}
                  onChange={(e) => setEditTaxGroup(e.target.value as 'A' | 'B' | 'C' | 'D')}
                  className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm bg-white focus:ring-1 focus:ring-blue-500"
                >
                  <option value="B">Groupe B - Taxable 18% (Régime normal)</option>
                  <option value="A">Groupe A - Exonéré de TVA</option>
                  <option value="C">Groupe C - Exportation</option>
                  <option value="D">Groupe D - Régime d'exception</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setEditingProduct(null)}>
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
