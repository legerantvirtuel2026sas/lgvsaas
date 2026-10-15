# ADR 0001 : Architecture multi-entreprises, isolation RLS et matrice de droits RBAC

## Statut
Accepté

## Contexte
LGV SaaS (Le Gérant Virtuel, version hébergée) est destiné aux PME d'Afrique de l'Ouest (avec le Bénin comme marché prioritaire). L'application héberge des données comptables, fiscales (e-MECeF), commerciales et salariales (CNSS, ITS) pour des tiers.
La confidentialité des données et la stricte étanchéité entre entreprises concurrentes sont des impératifs critiques, régis par le Code du numérique béninois et l'autorité de protection des données (APDP).

## Décisions prises

### 1. Isolation multi-tenant à triple barrière
1. **Résolution serveur uniquement** : Le `companyId` n'est JAMAIS accepté depuis le payload ou l'URL transmis par le navigateur pour des opérations de mutation ou de lecture de données privées. Il est résolu et validé côté serveur à partir du jeton de session de l'utilisateur actif et de son appartenance (`membership`).
2. **Filtrage applicatif systématique** : Toutes les requêtes Prisma dans `src/server/db/repositories/` filtrent explicitement par `companyId`.
3. **Row Level Security (RLS) PostgreSQL** : Activé sur toutes les tables rattachées à une entreprise (`memberships`, `licenses`, `company_settings`, `audit_logs`, `document_sequences`, etc.). L'extension transactionnelle `withTenantTransaction` exécute `SELECT set_config('app.current_company_id', companyId, true)` au début de chaque transaction, constituant un rempart ultime contre toute fuite involontaire.

### 2. Matrice de droits RBAC et invariants non négociables
* Trois rôles : `OWNER`, `ADMIN`, `USER`.
* Format des permissions : `ressource.action` (ex. `customers.create`, `sales.validate`).
* Permissions sensibles isolées : `costs.view` (prix de revient), `profit.view` (bénéfices et marges), `payroll.view` (salaires).
* **Invariants codés en dur** :
  * `users.delete` est strictement réservé au rôle `OWNER` et ne peut être concédé à aucun autre rôle.
  * Le dernier propriétaire actif d'une entreprise ne peut être ni rétrogradé ni supprimé.
  * Aucun utilisateur ne peut concéder des droits supérieurs aux siens (anti-privilege escalation).

### 3. Domaine monétaire et intégrité financière
* La monnaie officielle est le Franc CFA (XOF), qui ne possède **aucune décimale**.
* Tous les montants financiers sont des **entiers stricts** (type `Int` en base et `number` arrondi côté serveur).
* Aucun type `float` n'est toléré pour manipuler de l'argent.
* Tout calcul de facture, remise, TVA (18 %) et AIB (1 % ou 5 %) est exécuté exclusivement côté serveur dans `src/server/domain/money.ts`.

## Conséquences
* Protection complète contre les vulnérabilités de type Insecure Direct Object References (IDOR).
* Traçabilité intégrale via un journal d'audit en ajout seul (`AuditLog`).
* Base solide et extensible pour les modules ultérieurs (M1 à M12).
