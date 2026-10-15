# Procédures d'Exploitation, Déploiement et Sauvegardes - LGV SaaS

## 1. Environnements et Déploiement

LGV SaaS utilise une séparation stricte des environnements :
* **Développement :** base locale ou instance Neon dev, secrets de bac à sable FedaPay et e-MECeF test.
* **Préproduction (Preview Vercel) :** déclenchée sur chaque Pull Request, base dédiée préprod.
* **Production :** branche `main` protégée, validation CI verte obligatoire, base de données managée Neon/Supabase avec réplication et sauvegardes PITR (Point-in-Time Recovery).

### Déploiement des migrations de schéma Prisma
Les migrations de base de données ne doivent **jamais** être exécutées au runtime de l'application. Elles sont déployées lors du build ou du pipeline CI via :
```bash
npx prisma migrate deploy
```

## 2. Procédures de Sauvegarde et Restauration

### Fréquence des sauvegardes
* Sauvegardes continues (WAL archiving) avec restauration à la seconde près (PITR) sur 30 jours glissants assurée par l'opérateur PostgreSQL managé.
* Snapshots quotidiens automatiques à 02h00 UTC+1 (heure de Cotonou).

### Procédure de test de restauration
1. Créer une base temporaire de restauration : `lgv_restore_test`
2. Restaurer le dernier snapshot quotidien ou spécifier l'horodatage cible.
3. Exécuter le script de validation d'intégrité :
   * Vérification de la présence de toutes les entreprises actives.
   * Vérification de l'étanchéité des tables soumises à Row Level Security (RLS).
   * Vérification des séquences de facturation (`document_sequences`).
4. Supprimer l'instance de test après confirmation du rapport de validation.
