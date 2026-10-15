# PROJECT.md - LGV SaaS (Le Gérant Virtuel, version hébergée)
> Fichier de référence PERMANENT du projet. À lire en entier avant toute action.
> En cas de conflit entre une demande ponctuelle et ce fichier : signaler le conflit et demander confirmation. Ne jamais contourner une règle de sécurité (section 11).

## 1. Mission et périmètre
LGV SaaS est la version web multi-entreprises de LGV (Le Gérant Virtuel), logiciel de gestion pour PME d'Afrique de l'Ouest francophone, avec le Bénin comme marché prioritaire.

Phase 1 (périmètre actuel) = GESTION COMMERCIALE + RH/PAIE :
- Comptes utilisateurs, entreprises multiples, licence distincte par entreprise
- Utilisateurs d'entreprise avec droits (propriétaire / admin / utilisateur)
- Clients, fournisseurs, articles, stock
- Achats (factures d'achat / fournitures)
- Ventes : proforma, facture, avoir, TVA, AIB, remise, paiements comptant et à terme, échéances, créances (clients redevables)
- Normalisation des factures via l'API e-MECeF de la DGI (Bénin)
- Tableau de bord, statistiques, bénéfices, exports Excel et PDF
- Employés et paie (fiche de paie aux normes béninoises : ITS, CNSS)
- Tableau de bord consolidé du propriétaire (toutes ses entreprises)

Parcours utilisateur, hub des 4 cartes, menus communs (LGV Corp) et menus spécifiques : voir section 17. Licences, catalogue d'offres, essai de 7 jours et paiement en ligne (FedaPay) : voir section 18.

Phase 2 (NON à développer maintenant, mais l'architecture doit l'accepter sans refonte) :
- Gestion des prestations et services (carte visible dans le hub, en maintenance)
- Gestion de flotte et location (carte visible dans le hub, en maintenance)
- Consolidation des trois activités d'une entreprise (carte visible, en maintenance)

L'architecture doit donc fonctionner par MODULES ACTIVABLES par licence (module registry), sur le modèle des modules LGV existants.

## 2. Glossaire FR -> EN (identifiants du code en anglais, interface en français)
| Français | Identifiant code |
|---|---|
| Entreprise | company |
| Propriétaire | OWNER |
| Appartenance | membership |
| Licence | license |
| Client / Fournisseur | customer / supplier |
| Article | product |
| Prix de revient | costPrice |
| Mouvement de stock | stockMovement |
| Facture d'achat/fourniture | purchaseInvoice |
| Facture de vente | salesInvoice |
| Proforma | proforma |
| Facture d'avoir | creditNote |
| Échéance | installment |
| Créance / redevable | receivable / debtor |
| Moyen de paiement | paymentMethod |
| Normalisation | fiscalization (emecef) |
| Fiche de paie | payslip |
| Carte (hub entreprise) | activityCard |
| Menus communs (LGV Corp) | corp |
| Plan (Essentiel/Pro/Ent.) | plan |
| Pack métier | pack |
| Essai de 7 jours | trial |

## 3. Stack (imposée)
- Next.js (dernière version stable, App Router) + TypeScript strict
- Tailwind CSS + shadcn/ui, TanStack Table, Recharts, React Hook Form + Zod
- PostgreSQL managé (Neon ou Supabase) + Prisma ORM
- Authentification : Better Auth (ou Auth.js) - un seul, sessions en base, 2FA TOTP
- Hachage : Argon2id
- Rate limiting : Upstash Redis
- Emails : Resend
- Fichiers (logos) : Vercel Blob ou Cloudflare R2 (privé)
- PDF : @react-pdf/renderer ; Excel : exceljs
- i18n : next-intl (français par défaut, prêt pour d'autres langues)
- Tests : Vitest (unitaires), Playwright (e2e)
- Qualité : ESLint, Prettier, husky + lint-staged, commitlint (Conventional Commits)
- Observabilité : Sentry
- Déploiement : GitHub -> Vercel (previews sur chaque PR)

Règle de versions : n'utiliser que des versions stables et maintenues, garder Next.js et React à jour des correctifs de sécurité, lancer `npm audit` en CI.

## 4. Architecture
Couches (ne jamais sauter une couche) :
UI (components, pages) -> Server Actions / Route Handlers (validation Zod + autorisation) -> Services métier (src/server/services) -> Repositories Prisma (src/server/db)

Règles :
- Aucune logique métier dans les composants React.
- Aucune requête Prisma en dehors de src/server/db.
- Tout calcul monétaire est fait CÔTÉ SERVEUR dans src/server/domain/money.
- Argent : entiers en FCFA (XOF n'a pas de décimales). Quantités : Decimal. Jamais de float pour de l'argent. Règle d'arrondi centralisée et testée.
- Fuseau horaire : Africa/Porto-Novo. Dates affichées jj/mm/aaaa. Montants : 1 234 567 FCFA.
- Interface mobile-first, légère (connexions lentes), états de chargement et d'erreur soignés.

### Multi-tenant (CRITIQUE)
- Un utilisateur = un compte global. Il accède à une entreprise via une MEMBERSHIP.
- Toute table métier porte `companyId` (non nul, indexé).
- `companyId` vient TOUJOURS de la session/contexte serveur validé, JAMAIS du client.
- Défense en profondeur : Row Level Security PostgreSQL activée sur toutes les tables métier (variable de session `app.current_company_id` posée dans chaque transaction).
- Test automatisé obligatoire : un utilisateur de l'entreprise A ne peut lire/écrire aucune donnée de l'entreprise B (tests d'isolation en CI).
- Le tableau de bord consolidé du propriétaire agrège UNIQUEMENT des totaux, calculés entreprise par entreprise, pour les entreprises où il est OWNER.

## 5. Modèle de données (entités essentielles)
- Identité et tenancy : user, session, account, company, membership (userId, companyId, role OWNER|ADMIN|USER, permissions), license (companyId, planCode, packs, mode TRIAL|ANNUAL, status, trialEndsAt, endsAt, seats), plan_catalog, pack_catalog, price_catalog, licence_order, payment_transaction, webhook_event, platform_invoice, module_flag, audit_log, company_settings, emecef_credential (jeton chiffré).
- Référentiels : customer, supplier, product_category, unit, warehouse (un dépôt par défaut), product (name, sku, taxGroup, salePriceHt, costPrice, minStock, trackStock, active), payment_method (par entreprise).
- Stock : stock_movement (productId, type IN|OUT|ADJUST|RETURN, qty, unitCost, refType, refId).
- Achats : purchase_invoice + purchase_invoice_line, supplier_payment.
- Ventes : sales_document (type PROFORMA|INVOICE|CREDIT_NOTE, status, customerId, totaux, remise, aibRate, aibAmount, dueDate, paymentMode COMPTANT|A_TERME) + sales_line (unitPriceHt, qty, discount, taxGroup, vatRate, costPriceSnapshot), payment, installment, emecef_submission (requestPayload, responsePayload, uid, mecefCode, nim, qrCode, counters, signedAt, status).
- RH/Paie : employee, employment_contract, payroll_parameter (barème versionné), payroll_run, payslip, payslip_line.
- Numérotation : document_sequence (companyId, docType, year, lastNumber) incrémentée dans une transaction avec verrou pour éviter doublons et trous.

Règle : `costPriceSnapshot` est copié sur chaque ligne de vente au moment de la validation afin que les bénéfices historiques ne changent pas si le prix de revient évolue.

## 6. Rôles et permissions
Rôles par entreprise : OWNER, ADMIN, USER.
- OWNER : tous les droits (y compris supprimer des utilisateurs, gérer la licence, supprimer l'entreprise, transférer la propriété).
- ADMIN : tous les droits SAUF supprimer un utilisateur et les actions réservées OWNER (licence, suppression d'entreprise, transfert de propriété).
- USER : uniquement les permissions accordées explicitement par le propriétaire.

Format des permissions : `ressource.action`.
Ressources : customers, suppliers, products, stock, purchases, sales, proformas, payments, receivables, emecef, stats, exports, employees, payroll, users, settings, audit.
Actions : view, create, update, delete, validate, cancel, pay, normalize, export, manage.
Accès aux cartes : `access.commerce`, `access.services`, `access.fleet`, `access.consolidation` (un utilisateur peut être limité à une seule activité).
Permissions sensibles SÉPARÉES : `costs.view` (voir prix de revient), `profit.view` (voir bénéfices et marges), `payroll.view` (salaires).

Invariants codés en dur et testés :
- `users.delete` est réservé à OWNER et ne peut être accordé à personne d'autre.
- Le dernier OWNER d'une entreprise ne peut pas être retiré ni supprimé.
- Un utilisateur ne peut pas s'accorder des droits supérieurs aux siens.

Rattachement multi-entreprises : un OWNER des entreprises A ET B peut rattacher un utilisateur de A à B. Le compte reste unique (même identité) ; une nouvelle membership est créée dans B avec une COPIE du rôle et des permissions de A (modifiable ensuite indépendamment).

Pattern d'autorisation obligatoire :
```ts
export const createCustomer = action
  .input(customerSchema)
  .permission("customers.create")
  .handle(async ({ input, ctx }) => {
    return customerService.create(ctx, input);
  });
```

## 7. Règles métier
### 7.1 Suppression et intégrité
- Une entité référencée par d'autres données ne peut pas être supprimée tant que les données liées existent. Le service renvoie la liste des dépendances bloquantes.
- Alternative proposée : ARCHIVER (désactiver) l'entité.
- EXCEPTION LÉGALE : une facture normalisée ne peut JAMAIS être supprimée. Elle ne peut être corrigée ou annulée que par une facture d'avoir normalisée.
- Les suppressions autorisées sont journalisées (audit_log).

### 7.2 Calcul d'une facture (serveur uniquement)
- Pour chaque ligne : brut = quantité x prix unitaire HT ; remise de ligne ; net HT ligne.
- Remise globale optionnelle répartie au prorata.
- TVA calculée selon le groupe de taxation (18 % si taxable).
- AIB = taux (0, 1 % ou 5 %) x total net HT.
- Net à payer = total HT net + TVA + AIB.
- Bénéfice ligne = net HT ligne - (quantité x costPriceSnapshot).
- Après normalisation, comparaison obligatoire avec les totaux renvoyés par l'e-MCF ; blocage en cas d'écart.

### 7.3 Statuts de facture
DRAFT -> VALIDATED -> FISCALIZED ; états de paiement dérivés : UNPAID, PARTIALLY_PAID, PAID, OVERDUE. CANCELLED uniquement via avoir pour une facture normalisée.

### 7.4 Paiements, échéances, créances
- COMPTANT : solde à zéro à la validation.
- A_TERME : échéances chronologiques, imputation sur la plus ancienne, surpaiement refusé.
- Moyens de paiement configurables : Espèces, Mobile Money, Carte, Virement, Chèque, Autre.
- Écran "Clients redevables" avec balance âgée (0-30, 31-60, 61-90, 90+ jours) et relances (email / WhatsApp).

### 7.5 Stock
- Mouvements automatiques et manuels. Stock courant dérivé. Vente bloquée si insuffisant (sauf option stock négatif). Coût moyen pondéré (CMUP) optionnel.

### 7.6 Statistiques
- Périodes libres avec comparaison. Bénéfices sous `profit.view`. Composant de tableau unique avec tri, filtre et pagination serveur.

### 7.7 Exports
- Excel et PDF avec en-tête d'entreprise normalisé. Journalisé et sous permission.

## 8. Paramètres fiscaux Bénin
- Configurables et versionnés en base : TVA (18 %), AIB (0, 1 %, 5 %), groupes de taxation e-MECeF (A, B, C, D). FCFA entier sans décimales.

## 9. Intégration e-MECeF (DGI Bénin)
- Paramétrage par entreprise avec jeton chiffré AES-256-GCM.
- Statut EMECEF_PENDING, reprise idempotente.
- Types : FV, FA, EV, EA. Avoir référencé sur code MECeF/DGI de 24 caractères.

## 10. Paie (Bénin)
- Paramètres versionnés (CNSS salarié 3,6 %, CNSS patronale, barème progressif ITS, SMIG). Données protégées par `payroll.view` et chiffrées pour les champs sensibles.

## 11. Sécurité (règles NON NÉGOCIABLES)
- Mots de passe Argon2id, 2FA TOTP, cookies HttpOnly/Secure/SameSite=Lax.
- Validation Zod systématique, anti-IDOR avec companyId serveur + RLS PostgreSQL.
- En-têtes de sécurité stricts (CSP, HSTS, X-Content-Type-Options, frame-ancestors).
- Journal d'audit en ajout seul.

## 12. UX et localisation
- 100 % français, monnaie FCFA sans décimales, dates jj/mm/aaaa, mobile-first.

## 13. Conventions de code et arborescence
- Arborescence standardisée (voir dossier de conception).

## 14. Méthode de travail et ordre des modules
- Ordre strict : M0 Fondations -> M1 Site & Hub -> M1B Licences & FedaPay -> M2 Utilisateurs & Droits -> M3 Référentiels -> M4 Stock -> M5 Achats -> M6 Ventes -> M7 e-MECeF -> M8 Stats -> M9 Exports -> M10 RH & Paie -> M11 Consolidation -> M12 Durcissement.
- Chaque module exige : Plan d'implémentation -> Validation client -> Implémentation -> CI (lint, test, build) -> Checklist sécurité -> Résumé -> Arrêt ("GO MODULE Mx").

## 15. Commandes
- npm run dev, lint, typecheck, test, test:e2e, build, prisma migrate dev/deploy.

## 16. Points à valider par le propriétaire du projet
- Agrément SFE DGI, barème ITS et assiette CNSS, taux AIB, formalités APDP, clés FedaPay, règles du catalogue.

## 17. Parcours utilisateur, hub entreprise et menus
- Hub à 4 cartes : Commerce (OUVERTE), Services (MAINTENANCE), Flotte (MAINTENANCE), Consolidation (MAINTENANCE).
- Menus communs LGV Corp + menus spécifiques à la carte active via le module registry.

## 18. Licences, catalogue et paiement en ligne
- Catalogue annuel FCFA TTC (Essentiel, Pro, Entreprise). Essai 7 jours par IFU unique. Flux FedaPay sécurisé par webhook signé et relecture API.
