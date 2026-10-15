'use client';

import * as React from 'react';
import Link from 'next/link';
import { Pencil, Trash2, Lock, Shield, AlertCircle, Plus, Check, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ALL_PERMISSIONS } from '@/server/auth/permissions';

interface MemberItem {
  id: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'USER';
  permissions: string[];
  isActive: boolean;
  hasIssuedDocuments?: boolean;
  user: {
    fullName: string;
    email: string;
    phone?: string;
  };
}

export default function UsersManagementPage({ params }: { params: { slug: string } }) {
  const companySlug = params.slug;

  const [members, setMembers] = React.useState<MemberItem[]>([
    {
      id: 'mem_1',
      userId: 'usr_owner_1',
      role: 'OWNER',
      permissions: [...ALL_PERMISSIONS],
      isActive: true,
      hasIssuedDocuments: true,
      user: {
        fullName: 'Aymar DOSSOU',
        email: 'direction@abp.bj',
        phone: '+229 97 00 00 00',
      },
    },
    {
      id: 'mem_2',
      userId: 'usr_admin_1',
      role: 'ADMIN',
      permissions: ALL_PERMISSIONS.filter((p) => p !== 'users.delete'),
      isActive: true,
      hasIssuedDocuments: true,
      user: {
        fullName: 'Romaric KOUASSI',
        email: 'romaric@abp.bj',
        phone: '+229 96 11 22 33',
      },
    },
    {
      id: 'mem_3',
      userId: 'usr_seller_1',
      role: 'USER',
      permissions: ['access.commerce', 'sales.create', 'sales.view', 'customers.view'],
      isActive: true,
      hasIssuedDocuments: false,
      user: {
        fullName: 'Béatrice SOGLO',
        email: 'beatrice@abp.bj',
        phone: '+229 95 44 55 66',
      },
    },
  ]);

  const [showInviteModal, setShowInviteModal] = React.useState(false);
  const [selectedMember, setSelectedMember] = React.useState<MemberItem | null>(null);

  // Modal d'édition de l'utilisateur
  const [editingMember, setEditingMember] = React.useState<MemberItem | null>(null);
  const [editFullName, setEditFullName] = React.useState('');
  const [editEmail, setEditEmail] = React.useState('');
  const [editPhone, setEditPhone] = React.useState('');
  const [editRole, setEditRole] = React.useState<'OWNER' | 'ADMIN' | 'USER'>('USER');

  // Formulaire d'invitation
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviteFullName, setInviteFullName] = React.useState('');
  const [invitePhone, setInvitePhone] = React.useState('');
  const [inviteRole, setInviteRole] = React.useState<'ADMIN' | 'USER'>('USER');

  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Quotas de sièges
  const usedSeats = members.filter((m) => m.isActive).length;
  const maxSeats = 5;

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (usedSeats >= maxSeats) {
      alert('Limite de postes atteinte pour votre licence');
      return;
    }

    const newMember: MemberItem = {
      id: `mem_${Date.now()}`,
      userId: `usr_${Date.now()}`,
      role: inviteRole,
      permissions: inviteRole === 'ADMIN' ? ALL_PERMISSIONS.filter((p) => p !== 'users.delete') : ['sales.create', 'customers.view'],
      isActive: true,
      hasIssuedDocuments: false,
      user: {
        fullName: inviteFullName.trim(),
        email: inviteEmail.trim(),
        phone: invitePhone.trim(),
      },
    };

    setMembers([...members, newMember]);
    setShowInviteModal(false);
    setInviteEmail('');
    setInviteFullName('');
    setInvitePhone('');
    showToast(`Invitation envoyée à "${newMember.user.fullName}".`);
  };

  const handleOpenEdit = (m: MemberItem) => {
    setEditingMember(m);
    setEditFullName(m.user.fullName);
    setEditEmail(m.user.email);
    setEditPhone(m.user.phone || '');
    setEditRole(m.role);
  };

  const handleUpdateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    const isLocked = !!editingMember.hasIssuedDocuments;

    setMembers(
      members.map((m) => {
        if (m.userId === editingMember.userId) {
          return {
            ...m,
            role: m.role === 'OWNER' ? 'OWNER' : editRole,
            user: {
              ...m.user,
              fullName: isLocked ? m.user.fullName : editFullName.trim(),
              email: isLocked ? m.user.email : editEmail.trim(),
              phone: editPhone.trim(),
            },
          };
        }
        return m;
      })
    );

    setEditingMember(null);
    showToast(`Informations de "${editingMember.user.fullName}" mises à jour.`);
  };

  const handleDeleteMember = (targetUserId: string, role: string) => {
    const activeOwners = members.filter((m) => m.role === 'OWNER' && m.isActive);
    if (role === 'OWNER' && activeOwners.length <= 1) {
      alert('⚠️ Action bloquée : impossible de supprimer le dernier propriétaire actif de l’entreprise.');
      return;
    }

    const member = members.find((m) => m.userId === targetUserId);
    if (member?.hasIssuedDocuments) {
      alert(`⚠️ Suppression impossible : l'utilisateur "${member.user.fullName}" a validé et signé des factures ou des écritures comptables officielles. Par intégrité légale, vous pouvez uniquement désactiver son accès.`);
      return;
    }

    if (confirm(`Êtes-vous certain de vouloir supprimer l'utilisateur "${member?.user.fullName}" de l’entreprise ?`)) {
      setMembers(members.filter((m) => m.userId !== targetUserId));
      showToast(`Utilisateur "${member?.user.fullName}" retiré de l'entreprise.`);
    }
  };

  const handleToggleStatus = (targetUserId: string) => {
    const member = members.find((m) => m.userId === targetUserId);
    if (member?.role === 'OWNER' && member.isActive) {
      const activeOwners = members.filter((m) => m.role === 'OWNER' && m.isActive);
      if (activeOwners.length <= 1) {
        alert('⚠️ Action bloquée : impossible de désactiver le dernier propriétaire actif.');
        return;
      }
    }

    setMembers(
      members.map((m) => {
        if (m.userId === targetUserId) {
          const nextState = !m.isActive;
          showToast(nextState ? `Compte de "${m.user.fullName}" réactivé.` : `Compte de "${m.user.fullName}" désactivé.`);
          return { ...m, isActive: nextState };
        }
        return m;
      })
    );
  };

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-medium flex items-center gap-2 border border-gray-700 animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}

      <div className="border-b border-gray-200 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Utilisateurs & Droits d'accès</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gérez les collaborateurs de l’entreprise, leurs rôles et leurs permissions granulaires.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={() => setShowInviteModal(true)} disabled={usedSeats >= maxSeats} className="flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            Inviter un collaborateur
          </Button>
        </div>
      </div>

      {/* Quota de postes (Seats) */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase text-gray-400">Postes autorisés par la licence</span>
          <div className="flex items-center space-x-3 mt-1">
            <span className="text-2xl font-black text-gray-900">
              {usedSeats} / {maxSeats} postes occupés
            </span>
            <Badge variant={usedSeats >= maxSeats ? 'destructive' : 'success'}>
              {usedSeats >= maxSeats ? 'Quota complet' : `${maxSeats - usedSeats} disponibles`}
            </Badge>
          </div>
        </div>
        <Link href={`/e/${companySlug}/corp/licence`}>
          <Button variant="outline" size="sm">
            Augmenter le nombre de postes
          </Button>
        </Link>
      </div>

      {/* Tableau des collaborateurs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-700 border-b border-gray-200">
            <tr>
              <th className="px-5 py-3">Collaborateur</th>
              <th className="px-5 py-3">Rôle</th>
              <th className="px-5 py-3">Permissions sensibles</th>
              <th className="px-5 py-3">Statut</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {members.map((m) => {
              const hasCosts = m.permissions.includes('costs.view');
              const hasProfit = m.permissions.includes('profit.view');
              const hasPayroll = m.permissions.includes('payroll.view');
              const isDeleteBlocked = m.hasIssuedDocuments || (m.role === 'OWNER' && members.filter((x) => x.role === 'OWNER' && x.isActive).length <= 1);

              return (
                <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                      {m.user.fullName}
                      {m.hasIssuedDocuments && (
                        <span title="Factures émises : nom verrouillé" className="text-gray-400">
                          <Lock className="w-3.5 h-3.5 inline text-amber-500" />
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">{m.user.email}</div>
                    {m.user.phone && <div className="text-xs text-gray-400">{m.user.phone}</div>}
                  </td>

                  <td className="px-5 py-4">
                    <Badge
                      variant={
                        m.role === 'OWNER'
                          ? 'default'
                          : m.role === 'ADMIN'
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {m.role}
                    </Badge>
                  </td>

                  <td className="px-5 py-4 text-xs space-y-1">
                    {m.role === 'OWNER' ? (
                      <span className="text-green-700 font-medium">Toutes (Propriétaire)</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {hasCosts && <span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded text-[10px] font-medium border border-red-200">Prix de revient</span>}
                        {hasProfit && <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded text-[10px] font-medium border border-amber-200">Bénéfices</span>}
                        {hasPayroll && <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded text-[10px] font-medium border border-purple-200">Paie/Salaires</span>}
                        {!hasCosts && !hasProfit && !hasPayroll && <span className="text-gray-400 italic">Aucune</span>}
                      </div>
                    )}
                  </td>

                  <td className="px-5 py-4">
                    <Badge variant={m.isActive ? 'success' : 'destructive'}>
                      {m.isActive ? 'Actif' : 'Désactivé'}
                    </Badge>
                  </td>

                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end space-x-1">
                      {/* Bouton Modifier avec icône crayon et tooltip */}
                      <div className="relative group/edit">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(m)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center"
                          title="Modifier l'utilisateur"
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

                      {/* Bouton Droits avec icône bouclier et tooltip */}
                      <div className="relative group/rights">
                        <button
                          type="button"
                          onClick={() => setSelectedMember(m)}
                          className="p-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors flex items-center justify-center"
                          title="Gérer les droits"
                          aria-label="Droits"
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/rights:flex flex-col items-center z-30 pointer-events-none">
                          <span className="bg-gray-900 text-white text-[11px] font-medium py-0.5 px-2 rounded shadow-md whitespace-nowrap">
                            Gérer les droits
                          </span>
                          <div className="w-2 h-1 bg-gray-900 clip-triangle -mt-px"></div>
                        </div>
                      </div>

                      {/* Bouton Activer / Désactiver avec icône Power */}
                      <div className="relative group/power">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(m.userId)}
                          className={`p-1.5 rounded-lg transition-colors flex items-center justify-center ${
                            m.isActive ? 'text-amber-600 hover:text-amber-800 hover:bg-amber-50' : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                          }`}
                          title={m.isActive ? 'Désactiver le compte' : 'Réactiver le compte'}
                          aria-label="Statut"
                        >
                          <Power className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/power:flex flex-col items-center z-30 pointer-events-none">
                          <span className="bg-gray-900 text-white text-[11px] font-medium py-0.5 px-2 rounded shadow-md whitespace-nowrap">
                            {m.isActive ? 'Désactiver' : 'Réactiver'}
                          </span>
                          <div className="w-2 h-1 bg-gray-900 clip-triangle -mt-px"></div>
                        </div>
                      </div>

                      {/* Bouton Supprimer avec icône poubelle et tooltip */}
                      <div className="relative group/del">
                        <button
                          type="button"
                          onClick={() => handleDeleteMember(m.userId, m.role)}
                          className={`p-1.5 rounded-lg transition-colors flex items-center justify-center ${
                            isDeleteBlocked
                              ? 'text-gray-300 hover:text-red-500 hover:bg-red-50'
                              : 'text-red-600 hover:text-red-800 hover:bg-red-50'
                          }`}
                          title={isDeleteBlocked ? 'Suppression bloquée (documents signés / dernier propriétaire)' : 'Supprimer'}
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
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL 1 : INVITATION */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Inviter un collaborateur</h3>
            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <Input
                label="Nom complet"
                placeholder="Prénom et NOM"
                value={inviteFullName}
                onChange={(e) => setInviteFullName(e.target.value)}
                required
              />

              <Input
                label="Adresse email"
                type="email"
                placeholder="collaborateur@entreprise.bj"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />

              <Input
                label="Téléphone (+229)"
                placeholder="+229 97 00 00 00"
                value={invitePhone}
                onChange={(e) => setInvitePhone(e.target.value)}
              />

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Rôle initial</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'ADMIN' | 'USER')}
                  className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm bg-white focus:ring-1 focus:ring-blue-500"
                >
                  <option value="USER">Utilisateur (Vendeur, caissier, etc.)</option>
                  <option value="ADMIN">Administrateur (Gestionnaire avancé)</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowInviteModal(false)}>
                  Annuler
                </Button>
                <Button type="submit">Envoyer l'invitation</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2 : MODIFICATION UTILISATEUR */}
      {editingMember && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-blue-600" />
                Modifier l'utilisateur
              </h3>
              {editingMember.hasIssuedDocuments && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  <Lock className="w-3.5 h-3.5" />
                  Factures émises
                </span>
              )}
            </div>

            {editingMember.hasIssuedDocuments && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Cet utilisateur a émis et validé des factures ou des écritures comptables. Pour la conformité et la traçabilité des signatures, son <strong>nom complet</strong> et son <strong>email</strong> sont verrouillés.
                </span>
              </div>
            )}

            <form onSubmit={handleUpdateMember} className="space-y-4">
              <div>
                <Input
                  label="Nom complet *"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  disabled={editingMember.hasIssuedDocuments}
                  required
                />
                {editingMember.hasIssuedDocuments && (
                  <p className="text-[11px] text-gray-400 mt-1">Identité signataire verrouillée</p>
                )}
              </div>

              <div>
                <Input
                  label="Adresse email *"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  disabled={editingMember.hasIssuedDocuments}
                  required
                />
                {editingMember.hasIssuedDocuments && (
                  <p className="text-[11px] text-gray-400 mt-1">Identifiant de session verrouillé</p>
                )}
              </div>

              <Input
                label="Téléphone (+229)"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
              />

              {editingMember.role !== 'OWNER' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Rôle dans l'entreprise</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as 'ADMIN' | 'USER')}
                    className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm bg-white focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="USER">Utilisateur (Vendeur, caissier, etc.)</option>
                    <option value="ADMIN">Administrateur (Gestionnaire avancé)</option>
                  </select>
                </div>
              )}

              <div className="pt-3 flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setEditingMember(null)}>
                  Annuler
                </Button>
                <Button type="submit">Sauvegarder les modifications</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3 : DROITS ET PERMISSIONS */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-5">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Droits de {selectedMember.user.fullName}
              </h3>
              <p className="text-xs text-gray-500">Rôle actuel : {selectedMember.role}</p>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto p-1">
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs space-y-1">
                <span className="font-bold text-red-800">Permissions sensibles séparées :</span>
                <p className="text-red-700">
                  Les permissions de visualisation des prix de revient (<code>costs.view</code>), des bénéfices (<code>profit.view</code>) et de la paie (<code>payroll.view</code>) sont strictement isolées pour protéger vos marges.
                </p>
              </div>

              <div className="text-xs text-gray-600">
                <strong>Total des permissions actives :</strong> {selectedMember.permissions.length} sur {ALL_PERMISSIONS.length}
              </div>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setSelectedMember(null)}>
                Fermer
              </Button>
              <Button onClick={() => setSelectedMember(null)}>
                Enregistrer les droits
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
