import EmbeddedPostgres from 'embedded-postgres';
import path from 'path';
import fs from 'fs';

const dbDir = path.resolve(process.cwd(), '.local-db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const pg = new EmbeddedPostgres({
  databaseDir: dbDir,
  user: 'postgres',
  password: 'postgres',
  port: 5432,
  persistent: true,
});

async function main() {
  console.log('🐘 Initialisation du cluster PostgreSQL local...');
  try {
    await pg.initialise();
  } catch (err) {
    console.log('Cluster déjà initialisé ou existant, démarrage en cours...');
  }

  console.log('🚀 Démarrage du serveur PostgreSQL sur le port 5432...');
  await pg.start();
  console.log('✓ Serveur PostgreSQL actif.');

  try {
    console.log('Création de la base de données lgv_saas...');
    await pg.createDatabase('lgv_saas');
    console.log('✓ Base de données lgv_saas prête !');
  } catch (err) {
    if (err.message && err.message.includes('already exists')) {
      console.log('✓ Base de données lgv_saas déjà existante.');
    } else {
      console.log('Info création base:', err.message);
    }
  }

  console.log('🐘 PostgreSQL prêt à recevoir les connexions sur localhost:5432');
}

main().catch(err => {
  console.error('Erreur au démarrage de PostgreSQL:', err);
  process.exit(1);
});
