# Checklist d'implémentation - LGV SaaS (Phase 1 Complète)

## Module M0 (Fondations) - TERMINÉ
- [x] Initialisation de la documentation et du fichier de spécification PROJECT.md
- [x] Initialisation des configurations du projet (package.json, tsconfig.json, tailwind, next.config, ESLint, Prettier, .env.example)
- [x] Workflow GitHub Actions (.github/workflows/ci.yml) et configuration Dependabot
- [x] Modélisation Prisma (schema.prisma) et scripts SQL d'initialisation RLS PostgreSQL
- [x] Client de base de données multi-tenant (extension Prisma app.current_company_id, repositories)
- [x] Moteur d'authentification et sécurité (Argon2id/scrypt, sessions en base, 2FA TOTP, rate limiting)
- [x] Garde d'autorisation RBAC (matrice de permissions, vérification rôle, invariants de sécurité)
- [x] Registre de modules et drapeaux de cartes (OPEN / MAINTENANCE)
- [x] Domaine métier pur (money.ts en FCFA entier, taxes, audit logger en ajout seul)
- [x] Coque d'interface UI (layout mobile-first, thèmes, navigation, pages erreur/chargement, composant DataTable réutilisable)
- [x] Tests automatisés M0 (isolation inter-entreprises, RBAC, invariants, calculs monétaires)
- [x] Documentation d'architecture (ADR 0001) et README de démarrage

## Module M1 (Site vitrine, comptes, entreprises, hub) - TERMINÉ
- [x] Schémas de validation Zod (auth.schema.ts, company.schema.ts)
- [x] Services métier (company.service.ts, module-flag.service.ts)
- [x] Actions serveur d'authentification et de gestion d'entreprise (auth.actions.ts, company.actions.ts)
- [x] Pages d'authentification (/inscription, /connexion, /mot-de-passe-oublie)
- [x] Espace propriétaire "Mes entreprises" (/app/entreprises) avec badge d'état de licence
- [x] Formulaire de déclaration d'entreprise (/app/entreprises/nouvelle) avec attribution automatique de l'essai 7 jours et règle IFU unique
- [x] Hub des 4 cartes d'activité (/e/[slug]) avec badges d'état
- [x] Pages d'indisponibilité pour les 3 cartes en maintenance (/services, /flotte, /consolidation) protégeant les accès directs par URL
- [x] Coque de navigation contextuelle (layout, sidebar, header) combinant menus communs LGV Corp et menus spécifiques

## Module M1B (Licences, catalogue et paiement en ligne FedaPay) - TERMINÉ
- [x] Moteur de tarification et catalogue d'offres en base (src/server/domain/pricing.ts)
- [x] Client d'intégration FedaPay et vérification cryptographique de webhook (src/server/integrations/fedapay/)
- [x] Service de licence et activations transactionnelles idempotentes (src/server/services/license.service.ts)
- [x] Actions serveur de commande de licence (src/server/actions/license.actions.ts)
- [x] Route Handler sécurisé du Webhook FedaPay (/api/webhooks/fedapay/route.ts)
- [x] Page de gestion de la licence (/e/[slug]/corp/licence/page.tsx et confirmation/page.tsx)
- [x] Interface back-office super-admin (/app/admin/page.tsx) avec activation manuelle protégée 2FA

## Module M2 (Utilisateurs et droits) - TERMINÉ
- [x] Matrice RBAC avec garde assertAuthorized et vérification stricte du quota de postes (seats)
- [x] Invariants : users.delete réservé à OWNER, protection absolue du dernier OWNER actif, anti-élévation de privilèges
- [x] Rattachement inter-entreprises (A vers B) par copie étanche de rôle et droits sous double propriété OWNER
- [x] Interface d'administration de l'équipe (/e/[slug]/corp/utilisateurs) avec gestion granulaire des permissions

## Module M3 (Référentiels) - TERMINÉ
- [x] Référentiels Clients (B2B avec IFU et particuliers), Fournisseurs, Catégories, Unités et Articles
- [x] Règle d'intégrité des suppressions : blocage si créance en cours ou stock existant, avec alternative d'archivage logique
- [x] Protection des marges : masquage de costPrice sans permission sensible costs.view
- [x] Écrans de gestion et import par lot (migration LGV desktop)

## Module M4 (Stock & CMUP) - TERMINÉ
- [x] Mouvements automatiques et manuels (IN, OUT, ADJUST avec motif obligatoire, RETURN)
- [x] Calcul rigoureux du Coût Moyen Unitaire Pondéré (CMUP) lors de chaque réapprovisionnement
- [x] Blocage des sorties si stock insuffisant (sauf option allowNegativeStock)
- [x] Valorisation totale du stock d'entreprise en FCFA et interface de suivi (/e/[slug]/commerce/stock)

## Module M5 (Achats fournisseurs) - TERMINÉ
- [x] Factures d'achat avec TVA déductible (18%), remises et numérotation séquentielle automatique (ACH-YYYY-NNNN)
- [x] Validation avec entrée immédiate en stock physique (IN) et mise à jour du CMUP
- [x] Règlements comptant et à terme avec gestion des dettes fournisseurs et rejet formel du surpaiement
- [x] Interface de gestion des achats (/e/[slug]/commerce/achats)

## Module M6 (Ventes & Créances) - TERMINÉ
- [x] Devis proforma, conversion en facture, factures de vente (TVA 18%, AIB 0/1/5%) et avoirs
- [x] Sortie de stock automatique (OUT) et figement définitif des marges historiques via costPriceSnapshot
- [x] Imputation FIFO des règlements et suivi des créances
- [x] Écran "Clients redevables" avec balance âgée (0-30j, 31-60j, 61-90j, >90j) et relances pré-remplies WhatsApp

## Module M7 (Normalisation e-MECeF DGI Bénin) - TERMINÉ
- [x] Paramétrage par entreprise avec chiffrement AES-256-GCM du jeton d'API e-MCF
- [x] Flux sécurisé en deux temps (soumission -> comparaison des totaux -> finalisation DGI)
- [x] Blocage immédiat en cas d'écart entre le calcul local et les totaux retournés par l'e-MCF
- [x] Verrouillage définitif de la facture fiscalisée (FISCALIZED) et interdiction légale absolue de suppression
- [x] Génération du code MECeF/DGI de 24 caractères, NIM, compteurs et QR code

## Module M8 (Tableau de bord & Statistiques) - TERMINÉ
- [x] Tableau de bord commercial d'entreprise avec CA du jour, du mois, de l'année et alertes
- [x] Analyse périodique comparative avec cloisonnement du droit profit.view pour la visibilité des marges

## Module M9 (Exports certifiés) - TERMINÉ
- [x] Service d'export certifié intégrant l'en-tête officiel d'entreprise (Raison sociale, IFU, RCCM, adresse, auteur, date)
- [x] Génération CSV/Excel et traçabilité systématique dans le journal d'audit (audit_log)

## Module M10 (RH & Paie aux normes béninoises) - TERMINÉ
- [x] Fiches salariés, contrats de travail et matricules
- [x] Barème progressif mensuel de l'ITS conforme au CGI Bénin (0% jusqu'à 60 000, 10%, 15%, 19%, 30%)
- [x] Cotisations sociales CNSS salarié (3.6%) et employeur (17.4%)
- [x] Calcul exact du net à payer en entiers FCFA sans décimales et interface d'exécution mensuelle

## Module M11 (Consolidation propriétaire multi-entreprises) - TERMINÉ
- [x] Tableau de bord personnel (/app/tableau-de-bord) agrégeant uniquement les sociétés où l'utilisateur est OWNER
- [x] Calcul strict par agrégats entreprise par entreprise sans aucun mélange de données brutes
- [x] Vue comparative et accès direct au Hub de chaque entreprise

## Module M12 (Durcissement et mise en production) - TERMINÉ
- [x] Audit de sécurité complet OWASP Top 10 (consigné dans docs/runbooks/security-audit-report.md)
- [x] Pages légales béninoises : Mentions légales (/mentions-legales) et Politique de confidentialité APDP (/confidentialite)
- [x] Runbook de déploiement, sauvegardes PITR et restauration (docs/runbooks/deployment-and-backup.md)
- [x] Suite complète de 38 tests unitaires, d'intégration et de sécurité validée avec 100% de réussite
