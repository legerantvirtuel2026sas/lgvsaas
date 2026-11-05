'use client';

import * as React from 'react';
import {
  Pencil,
  Trash2,
  Lock,
  AlertCircle,
  Plus,
  Check,
  Download,
  Package,
  Boxes,
  AlertTriangle,
} from 'lucide-react';
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
  const companySlug = params.slug;
  const companyDisplayName = companySlug.replace(/-/g, ' ').toUpperCase();

  const [products, setProducts] = React.useState<ProductRow[]>([
    {
      id: 'prod_1',
      sku: 'RAM-A4-80G',
      name: 'Rame de papier A4 80g Double A',
      category: 'Fournitures de bureau',
      salePriceHt: 3500,
      costPrice: 2450,
      taxGroup: 'B',
      currentStock: 4, // Stock faible
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
      currentStock: 2, // Stock faible
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
      currentStock: 0, // Rupture
      minStockAlert: 5,
      hasTransactions: false,
    },
    {
      id: 'prod_4',
      sku: 'SOURIS-LOGI-M185',
      name: 'Souris Optique Sans Fil Logitech M185',
      category: 'Informatique',
      salePriceHt: 8500,
      costPrice: 5500,
      taxGroup: 'B',
      currentStock: 48, // Stock disponible
      minStockAlert: 10,
      hasTransactions: true,
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
  const [initialStock, setInitialStock] = React.useState('0');
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

  // État d'exportation PDF
  const [isExporting, setIsExporting] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Statistiques calculées en temps réel
  const totalArticles = products.length;
  const totalStockUnits = products.reduce((acc, p) => acc + (p.currentStock || 0), 0);
  const inStockCount = products.filter((p) => p.currentStock > p.minStockAlert).length;
  const alertStockCount = products.filter((p) => p.currentStock > 0 && p.currentStock <= p.minStockAlert).length;
  const outOfStockCount = products.filter((p) => p.currentStock <= 0).length;

  // Création d'un article
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
      currentStock: parseInt(initialStock, 10) || 0,
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
    setInitialStock('0');
    showToast(`Article "${newProd.name}" (${newProd.sku}) créé avec succès.`);
  };

  // Édition d'un article
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

  // Suppression avec contrôles d'intégrité
  const handleDelete = (prod: ProductRow) => {
    if (prod.currentStock > 0) {
      alert(`⚠️ Suppression impossible : l'article "${prod.name}" possède un stock physique restant de ${prod.currentStock} unités.`);
      return;
    }
    if (prod.hasTransactions) {
      alert(`⚠️ Suppression impossible : l'article "${prod.name}" figure déjà sur des factures ou des écritures comptables enregistrées.`);
      return;
    }
    if (confirm(`Confirmez-vous la suppression de l'article ${prod.sku} - ${prod.name} ?`)) {
      setProducts(products.filter((p) => p.id !== prod.id));
      showToast(`Article "${prod.name}" supprimé.`);
    }
  };

  // Exportation au format PDF
  const handleExportPdf = async () => {
    try {
      setIsExporting(true);
      const response = await fetch('/api/export/articles/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: companyDisplayName,
          companySlug,
          products,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors du téléchargement du fichier PDF');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const safeDate = new Date().toISOString().slice(0, 10);
      link.download = `catalogue_articles_${companySlug}_${safeDate}.pdf`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(link);

      showToast('Catalogue des articles et stocks exporté en PDF avec succès.');
    } catch (err) {
      console.error(err);
      alert("Une erreur est survenue lors de l'exportation du PDF. Veuillez réessayer.");
    } finally {
      setIsExporting(false);
    }
  };

  // Colonnes du tableau de gestion des articles
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
      header: 'Désignation de l’article',
      accessorKey: 'name',
      sortable: true,
      cell: (row) => (
        <div>
          <div className="font-semibold text-gray-900 flex items-center gap-1.5">
            {row.name}
            {(row.currentStock > 0 || row.hasTransactions) && (
              <span title="Opérations ou stock lié : référence protégée" className="text-gray-400">
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
      cell: (row) => <span className="font-bold text-blue-600">{formatFcfa(row.salePriceHt)}</span>,
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
      id: 'currentStock',
      header: 'Quantité restante',
      accessorKey: 'currentStock',
      sortable: true,
      type: 'number',
      cell: (row) => {
        const isOutOfStock = row.currentStock <= 0;
        const isUnderMin = row.currentStock > 0 && row.currentStock <= row.minStockAlert;
        return (
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span
                className={`text-sm font-black ${
                  isOutOfStock
                    ? 'text-red-600'
                    : isUnderMin
                    ? 'text-amber-600'
                    : 'text-emerald-700'
                }`}
              >
                {row.currentStock} {row.currentStock > 1 ? 'unités' : 'unité'}
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              Seuil alerte : <span className="font-medium text-gray-600">{row.minStockAlert}</span>
            </p>
          </div>
        );
      },
    },
    {
      id: 'status',
      header: 'Statut du stock',
      cell: (row) => {
        if (row.currentStock <= 0) {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
              Rupture de stock
            </span>
          );
        }
        if (row.currentStock <= row.minStockAlert) {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              Alerte stock bas
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            Stock disponible
          </span>
        );
      },
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
                title="Modifier l'article"
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
                title={isDeleteBlocked ? 'Suppression bloquée (stock restant ou écritures comptables)' : 'Supprimer'}
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
          <h1 className="text-2xl font-bold text-gray-900">Articles & Stocks</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gestion du catalogue de produits, suivi des quantités restantes en stock et seuils d'alerte.
          </p>
        </div>
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Bouton Exporter en PDF */}
          <Button
            type="button"
            variant="outline"
            onClick={handleExportPdf}
            disabled={isExporting}
            className="flex items-center gap-2 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 shadow-sm"
            title="Télécharger l'inventaire et le catalogue complet sous format PDF"
          >
            {isExporting ? (
              <>
                <span className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                <span>Génération du PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-red-600" />
                <span>Exporter en PDF</span>
              </>
            )}
          </Button>

          {/* Bouton Nouvel Article */}
          <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 shadow-sm">
            <Plus className="w-4 h-4" />
            Nouvel article
          </Button>
        </div>
      </div>

      {/* Cartes KPI récapitulatives de stock */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-gray-500 font-medium block">Articles au catalogue</span>
            <span className="text-xl font-black text-gray-900">{totalArticles}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-gray-500 font-medium block">Stock total restant</span>
            <span className="text-xl font-black text-emerald-700">{totalStockUnits} unités</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-gray-500 font-medium block">Articles en alerte stock</span>
            <span className="text-xl font-black text-amber-600">{alertStockCount}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-gray-500 font-medium block">Articles en rupture</span>
            <span className="text-xl font-black text-red-600">{outOfStockCount}</span>
          </div>
        </div>
      </div>

      {/* Tableau des articles */}
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
                  label="Catégorie"
                  placeholder="Ex: Fournitures, Informatique..."
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </div>

              <Input
                label="Désignation de l'article *"
                placeholder="Ex: Rame de papier A4 80g"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Quantité initiale en stock"
                  type="number"
                  placeholder="0"
                  value={initialStock}
                  onChange={(e) => setInitialStock(e.target.value)}
                />
                <Input
                  label="Seuil d'alerte stock minimum"
                  type="number"
                  placeholder="5"
                  value={minStockAlert}
                  onChange={(e) => setMinStockAlert(e.target.value)}
                />
              </div>

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

            {/* Rappel clair du stock restant actuel */}
            <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl flex items-center justify-between text-xs">
              <span className="text-gray-600 font-medium">Stock restant actuellement disponible :</span>
              <span className="font-black text-sm text-blue-700">
                {editingProduct.currentStock} {editingProduct.currentStock > 1 ? 'unités' : 'unité'}
              </span>
            </div>

            {(editingProduct.currentStock > 0 || editingProduct.hasTransactions) && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Cet article possède du stock physique ({editingProduct.currentStock} unités) ou figure sur des factures enregistrées. La <strong>référence (SKU)</strong> et la <strong>désignation</strong> sont verrouillées pour protéger la conformité légale.
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
