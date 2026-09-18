import { Pool } from "pg";

/**
 * Connexion Postgres avec le rôle dédié `registre_factures_app` (voir
 * migration 0048_registre_factures_avoirs.sql dans le dépôt appli-gestion)
 * — accès UNIQUEMENT à factures/avoirs/compteur_facture_avoir + les
 * fonctions enregistrer_facture/enregistrer_avoir, jamais au reste de la
 * base (Appli Terrain / Appli Gestion).
 */
declare global {
  // eslint-disable-next-line no-var
  var __registrePool: Pool | undefined;
}

function createPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Variable d'environnement DATABASE_URL manquante — voir .env.local.example.");
  }
  return new Pool({ connectionString: url });
}

export const pool = globalThis.__registrePool ?? createPool();
if (process.env.NODE_ENV !== "production") {
  globalThis.__registrePool = pool;
}
