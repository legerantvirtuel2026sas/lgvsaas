# LGV SaaS - Le Gérant Virtuel (Version hébergée)

> Solution de gestion commerciale, RH et paie multi-entreprises pour PME d'Afrique de l'Ouest (Bénin). Conforme e-MECeF, TVA, AIB, ITS et CNSS.

## Structure du projet

```
src/
  app/                    # Pages et routage Next.js App Router (public, owner, company hub)
  components/             # UI réutilisable (shadcn/ui, data-table TanStack)
  server/
    auth/                 # Session, hachage, 2FA TOTP, RBAC, invariants de sécurité
    db/                   # Client Prisma avec RLS PostgreSQL, repositories
    domain/               # Logique financière pure (calculs FCFA entiers, TVA, AIB)
    modules/              # Registre de modules et drapeaux de cartes (OPEN / MAINTENANCE)
    services/             # Services métier et journal d'audit append-only
docs/adr/                 # Décisions d'architecture (ADR)
prisma/                   # Schéma de base de données et migrations RLS
tests/                    # Tests unitaires, intégration et isolation inter-entreprises
```

## Démarrage rapide

### Prérequis
- Node.js 18+ ou 20+
- PostgreSQL (Neon ou instance locale)

### Installation
1. Cloner le dépôt et installer les dépendances :
   ```bash
   npm install
   ```
2. Configurer les variables d'environnement :
   ```bash
   cp .env.example .env
   ```
3. Générer le client Prisma et exécuter les migrations :
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```
4. Démarrer le serveur de développement :
   ```bash
   npm run dev
   ```

### Tests et qualité
- Linter : `npm run lint`
- Vérification des types TypeScript : `npm run typecheck`
- Tests unitaires et d'isolation : `npm run test`
- Build de production : `npm run build`
