import { pool } from "./pool";

/**
 * Registre Factures/Avoirs — accès aux données. La logique d'attribution de
 * numéro (idempotence, compteur annuel) vit dans les fonctions Postgres
 * `enregistrer_facture`/`enregistrer_avoir` (voir migration
 * 0048_registre_factures_avoirs.sql, dépôt appli-gestion) — EXACTEMENT les
 * mêmes fonctions que celles appelées depuis l'Appli Gestion (décompte,
 * facture matériel), pour que la numérotation reste cohérente entre les 2
 * sites. Une saisie manuelle ici passe toujours `cle_idempotence = null` :
 * toujours un nouveau numéro, jamais de mise à jour d'une ligne existante.
 */

export interface Facture {
  id: string;
  annee: number;
  numero: number;
  date_document: string;
  vente_materiel: boolean;
  concerne_tgca: boolean;
  destinataire: string;
  objet: string;
  montant_ttc: string;
  montant_ht: string;
  montant_tgca: string;
  origine: "decompte" | "materiel" | "manuel";
  /** Chemin local (documents générés par l'Appli Gestion) ou /api/piece-jointe/{id} (pièce jointe manuelle) — voir migration 0049. */
  lien_fichier: string | null;
  created_at: string;
}

export interface Avoir {
  id: string;
  annee: number;
  numero: number;
  date_document: string;
  concerne_tgca: boolean;
  destinataire: string;
  objet: string;
  montant_ttc: string;
  montant_ht: string;
  montant_tgca: string;
  origine: "decompte" | "manuel";
  lien_fichier: string | null;
  created_at: string;
}

export async function getFactures(annee: number): Promise<Facture[]> {
  const { rows } = await pool.query<Facture>(
    `select id, annee, numero, to_char(date_document, 'YYYY-MM-DD') as date_document,
            vente_materiel, concerne_tgca, destinataire, objet, montant_ttc, montant_ht, montant_tgca,
            origine, lien_fichier, to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS') as created_at
     from factures where annee = $1 order by numero desc`,
    [annee]
  );
  return rows;
}

export async function getAvoirs(annee: number): Promise<Avoir[]> {
  const { rows } = await pool.query<Avoir>(
    `select id, annee, numero, to_char(date_document, 'YYYY-MM-DD') as date_document,
            concerne_tgca, destinataire, objet, montant_ttc, montant_ht, montant_tgca,
            origine, lien_fichier, to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS') as created_at
     from avoirs where annee = $1 order by numero desc`,
    [annee]
  );
  return rows;
}

/** Années disponibles (celles ayant au moins une Facture OU un Avoir) — pour le sélecteur d'année. */
export async function getAnneesDisponibles(): Promise<number[]> {
  const { rows } = await pool.query<{ annee: number }>(
    `select annee from factures union select annee from avoirs order by annee desc`
  );
  const annees = rows.map((r) => r.annee);
  const anneeCourante = new Date().getUTCFullYear();
  if (!annees.includes(anneeCourante)) annees.unshift(anneeCourante);
  return annees;
}

export interface AjouterFactureManuelParams {
  date: string;
  destinataire: string;
  objet: string;
  montantTtc: number;
  montantHt: number;
  venteMateriel: boolean;
  concerneTgca: boolean;
  /** Pièce jointe déjà stockée (voir enregistrerPieceJointe) — /api/piece-jointe/{id}. */
  lienFichier?: string | null;
}

export async function ajouterFactureManuel(params: AjouterFactureManuelParams): Promise<Facture> {
  const { rows } = await pool.query<Facture>(
    `select * from enregistrer_facture($1, $2, $3, $4, $5, $6, $7, 'manuel', null, null, null)`,
    [
      params.date,
      params.destinataire,
      params.objet,
      params.montantTtc,
      params.montantHt,
      params.venteMateriel,
      params.concerneTgca,
    ]
  );
  const facture = rows[0];
  if (params.lienFichier) {
    await pool.query(`update factures set lien_fichier = $1 where id = $2`, [params.lienFichier, facture.id]);
    facture.lien_fichier = params.lienFichier;
  }
  return facture;
}

export interface AjouterAvoirManuelParams {
  date: string;
  destinataire: string;
  objet: string;
  montantTtc: number;
  montantHt: number;
  concerneTgca: boolean;
  lienFichier?: string | null;
}

export async function ajouterAvoirManuel(params: AjouterAvoirManuelParams): Promise<Avoir> {
  const { rows } = await pool.query<Avoir>(
    `select * from enregistrer_avoir($1, $2, $3, $4, $5, $6, 'manuel', null, null, null)`,
    [params.date, params.destinataire, params.objet, params.montantTtc, params.montantHt, params.concerneTgca]
  );
  const avoir = rows[0];
  if (params.lienFichier) {
    await pool.query(`update avoirs set lien_fichier = $1 where id = $2`, [params.lienFichier, avoir.id]);
    avoir.lien_fichier = params.lienFichier;
  }
  return avoir;
}

/** Stocke une pièce jointe (upload manuel depuis le registre) et renvoie son URL servable — voir migration 0049. */
export async function enregistrerPieceJointe(nomFichier: string, typeMime: string, donnees: Buffer): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `insert into pieces_jointes_registre (nom_fichier, type_mime, donnees) values ($1, $2, $3) returning id`,
    [nomFichier, typeMime, donnees]
  );
  return `/api/piece-jointe/${rows[0].id}`;
}

export interface ModifierFactureParams {
  id: string;
  date: string;
  destinataire: string;
  objet: string;
  montantTtc: number;
  montantHt: number;
  venteMateriel: boolean;
  concerneTgca: boolean;
}

/** Corrige les champs d'une facture existante — le numéro et l'année ne sont jamais modifiables ici. */
export async function modifierFacture(params: ModifierFactureParams): Promise<Facture> {
  const montantTgca = Math.round(params.montantHt * 0.04 * 100) / 100;
  const { rows } = await pool.query<Facture>(
    `update factures set date_document = $2, destinataire = $3, objet = $4, montant_ttc = $5,
            montant_ht = $6, montant_tgca = $7, vente_materiel = $8, concerne_tgca = $9
     where id = $1
     returning id, annee, numero, to_char(date_document, 'YYYY-MM-DD') as date_document,
               vente_materiel, concerne_tgca, destinataire, objet, montant_ttc, montant_ht, montant_tgca,
               origine, lien_fichier, to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS') as created_at`,
    [
      params.id,
      params.date,
      params.destinataire,
      params.objet,
      params.montantTtc,
      params.montantHt,
      montantTgca,
      params.venteMateriel,
      params.concerneTgca,
    ]
  );
  return rows[0];
}

export interface ModifierAvoirParams {
  id: string;
  date: string;
  destinataire: string;
  objet: string;
  montantTtc: number;
  montantHt: number;
  concerneTgca: boolean;
}

/** Corrige les champs d'un avoir existant — le numéro et l'année ne sont jamais modifiables ici. */
export async function modifierAvoir(params: ModifierAvoirParams): Promise<Avoir> {
  const montantTgca = Math.round(params.montantHt * 0.04 * 100) / 100;
  const { rows } = await pool.query<Avoir>(
    `update avoirs set date_document = $2, destinataire = $3, objet = $4, montant_ttc = $5,
            montant_ht = $6, montant_tgca = $7, concerne_tgca = $8
     where id = $1
     returning id, annee, numero, to_char(date_document, 'YYYY-MM-DD') as date_document,
               concerne_tgca, destinataire, objet, montant_ttc, montant_ht, montant_tgca,
               origine, lien_fichier, to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS') as created_at`,
    [params.id, params.date, params.destinataire, params.objet, params.montantTtc, params.montantHt, montantTgca, params.concerneTgca]
  );
  return rows[0];
}

export interface ImportResultat {
  inserees: number;
  ignorees: { ligneExcel: number; numero: number; raison: string }[];
  erreurs: { ligneExcel: number; numero: number; raison: string }[];
}

/**
 * Import historique — insère DIRECTEMENT avec le numéro fourni (ne passe
 * jamais par enregistrer_facture/le compteur, contrairement à une saisie au
 * clavier) : ces numéros ont déjà été émis avant la mise en service du
 * registre, ce ne sont jamais de nouveaux numéros à réserver. La montant HT
 * n'est pas fourni par le tableau Excel (mêmes colonnes que l'affichage,
 * qui n'en a pas) — calculé à TTC ÷ 1,04, comme pour toute saisie manuelle
 * hors décompte.
 */
export async function importerFacturesManuel(
  lignes: { ligneExcel: number; date: string; numero: number; venteMateriel: boolean; concerneTgca: boolean; destinataire: string; objet: string; montantTtc: number }[]
): Promise<ImportResultat> {
  const resultat: ImportResultat = { inserees: 0, ignorees: [], erreurs: [] };
  for (const l of lignes) {
    const annee = Number(l.date.slice(0, 4));
    const montantHt = Math.round((l.montantTtc / 1.04) * 100) / 100;
    const montantTgca = Math.round(montantHt * 0.04 * 100) / 100;
    try {
      const { rows } = await pool.query(
        `insert into factures (annee, numero, date_document, vente_materiel, concerne_tgca, destinataire, objet, montant_ttc, montant_ht, montant_tgca, origine)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'manuel')
         on conflict (annee, numero) do nothing
         returning id`,
        [annee, l.numero, l.date, l.venteMateriel, l.concerneTgca, l.destinataire, l.objet, l.montantTtc, montantHt, montantTgca]
      );
      if (rows.length > 0) resultat.inserees++;
      else resultat.ignorees.push({ ligneExcel: l.ligneExcel, numero: l.numero, raison: `Facture n°${l.numero}/${annee} existe déjà.` });
    } catch (err) {
      resultat.erreurs.push({ ligneExcel: l.ligneExcel, numero: l.numero, raison: err instanceof Error ? err.message : "Échec inattendu." });
    }
  }
  return resultat;
}

export async function importerAvoirsManuel(
  lignes: { ligneExcel: number; date: string; numero: number; concerneTgca: boolean; destinataire: string; objet: string; montantTtc: number }[]
): Promise<ImportResultat> {
  const resultat: ImportResultat = { inserees: 0, ignorees: [], erreurs: [] };
  for (const l of lignes) {
    const annee = Number(l.date.slice(0, 4));
    const montantHt = Math.round((l.montantTtc / 1.04) * 100) / 100;
    const montantTgca = Math.round(montantHt * 0.04 * 100) / 100;
    try {
      const { rows } = await pool.query(
        `insert into avoirs (annee, numero, date_document, concerne_tgca, destinataire, objet, montant_ttc, montant_ht, montant_tgca, origine)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'manuel')
         on conflict (annee, numero) do nothing
         returning id`,
        [annee, l.numero, l.date, l.concerneTgca, l.destinataire, l.objet, l.montantTtc, montantHt, montantTgca]
      );
      if (rows.length > 0) resultat.inserees++;
      else resultat.ignorees.push({ ligneExcel: l.ligneExcel, numero: l.numero, raison: `Avoir n°${l.numero}/${annee} existe déjà.` });
    } catch (err) {
      resultat.erreurs.push({ ligneExcel: l.ligneExcel, numero: l.numero, raison: err instanceof Error ? err.message : "Échec inattendu." });
    }
  }
  return resultat;
}

/**
 * Plancher de numéro pour un trimestre donné — demande explicite, 21/09/2026 :
 * l'import en masse des factures/avoirs depuis le 1er janvier 2026 (voir
 * ImporterFactures.tsx/ImporterAvoirs.tsx) va faire entrer dans la base des
 * lignes datées de juillet-août-septembre mais déjà comptées dans une
 * déclaration ANTÉRIEURE (numérotées avant le début réel du T3 tel que déjà
 * déclaré) — le simple filtre par date_document ne suffit plus pour ce
 * trimestre-là. Uniquement le T3 2026 est concerné pour l'instant ; les
 * autres trimestres/années restent filtrés par date seule.
 */
function plancherNumeroTrimestre(annee: number, trimestre: 1 | 2 | 3 | 4, type: "facture" | "avoir"): number | null {
  if (annee === 2026 && trimestre === 3) {
    return type === "facture" ? 171 : 170;
  }
  return null;
}

/** Bornes de dates ('YYYY-MM-DD') d'un trimestre calendaire — T1=janv-mars, T2=avr-juin, T3=juil-sept, T4=oct-déc. */
export function bornesTrimestre(annee: number, trimestre: 1 | 2 | 3 | 4): { debut: string; fin: string } {
  const moisDebut = (trimestre - 1) * 3 + 1;
  const moisFin = moisDebut + 3;
  const debut = `${annee}-${String(moisDebut).padStart(2, "0")}-01`;
  const fin =
    moisFin > 12 ? `${annee + 1}-01-01` : `${annee}-${String(moisFin).padStart(2, "0")}-01`;
  return { debut, fin };
}

export interface RecapTgcaTrimestre {
  /** Tous les montants de la déclaration sont arrondis à l'euro entier (demande explicite, 19/09/2026). */
  htVente: number;
  htHorsVente: number;
  tgcaFactures: number;
  tgcaAvoirs: number;
  tgcaNette: number;
  /** (htVente + htHorsVente) * 4%, arrondi — à comparer visuellement à tgcaNette. */
  tgcaCalculee: number;
}

export async function getRecapTgcaTrimestre(annee: number, trimestre: 1 | 2 | 3 | 4): Promise<RecapTgcaTrimestre> {
  const { debut, fin } = bornesTrimestre(annee, trimestre);
  const plancherFacture = plancherNumeroTrimestre(annee, trimestre, "facture");
  const plancherAvoir = plancherNumeroTrimestre(annee, trimestre, "avoir");

  const { rows: fRows } = await pool.query<{ vente_materiel: boolean; total_ht: string; total_tgca: string }>(
    `select vente_materiel, coalesce(sum(montant_ht), 0) as total_ht, coalesce(sum(montant_tgca), 0) as total_tgca
     from factures
     where concerne_tgca and date_document >= $1 and date_document < $2
       and ($3::int is null or numero >= $3)
     group by vente_materiel`,
    [debut, fin, plancherFacture]
  );
  const { rows: aRows } = await pool.query<{ total_ht: string; total_tgca: string }>(
    `select coalesce(sum(montant_ht), 0) as total_ht, coalesce(sum(montant_tgca), 0) as total_tgca
     from avoirs
     where concerne_tgca and date_document >= $1 and date_document < $2
       and ($3::int is null or numero >= $3)`,
    [debut, fin, plancherAvoir]
  );

  const htHorsVenteFactures = Number(fRows.find((r) => !r.vente_materiel)?.total_ht ?? 0);
  const htAvoirs = Number(aRows[0]?.total_ht ?? 0);
  const tgcaFacturesBrut = fRows.reduce((s, r) => s + Number(r.total_tgca), 0);

  // Arrondis à l'euro entier — chaque montant de la déclaration doit être un
  // nombre entier (demande explicite, 19/09/2026), pas seulement le résultat
  // final : les totaux dérivés (base HT, TGCA nette) restent ainsi cohérents
  // entre eux puisqu'ils s'obtiennent en additionnant des entiers.
  //
  // Les avoirs s'ADDITIONNENT (jamais en déduction) — demande explicite,
  // 20/09/2026 : "il ne doit pas y avoir de nombre négatif même pour les
  // avoirs. considère que les avoirs sont traités comme les factures."
  const htVente = Math.round(Number(fRows.find((r) => r.vente_materiel)?.total_ht ?? 0));
  const htHorsVente = Math.round(htHorsVenteFactures + htAvoirs);
  const tgcaFactures = Math.round(tgcaFacturesBrut);
  const tgcaAvoirs = Math.round(Number(aRows[0]?.total_tgca ?? 0));
  const tgcaNette = tgcaFactures + tgcaAvoirs;
  const tgcaCalculee = Math.round((htVente + htHorsVente) * 0.04);

  return { htVente, htHorsVente, tgcaFactures, tgcaAvoirs, tgcaNette, tgcaCalculee };
}

export interface LigneDetailTrimestre {
  type: "facture" | "avoir";
  numero: number;
  date: string;
  destinataire: string;
  objet: string;
  venteMateriel: boolean | null;
  concerneTgca: boolean;
  montantTtc: number;
  montantHt: number;
  montantTgca: number;
}

export async function getDetailTrimestre(annee: number, trimestre: 1 | 2 | 3 | 4): Promise<LigneDetailTrimestre[]> {
  const { debut, fin } = bornesTrimestre(annee, trimestre);
  // Même plancher de numéro que getRecapTgcaTrimestre — l'export CSV doit
  // toujours correspondre exactement aux lignes comptées dans le récapitulatif.
  const plancherFacture = plancherNumeroTrimestre(annee, trimestre, "facture");
  const plancherAvoir = plancherNumeroTrimestre(annee, trimestre, "avoir");
  const [factures, avoirs] = await Promise.all([
    pool.query<Facture>(
      `select id, annee, numero, to_char(date_document, 'YYYY-MM-DD') as date_document,
              vente_materiel, concerne_tgca, destinataire, objet, montant_ttc, montant_ht, montant_tgca, origine
       from factures
       where date_document >= $1 and date_document < $2 and ($3::int is null or numero >= $3)
       order by numero`,
      [debut, fin, plancherFacture]
    ),
    pool.query<Avoir>(
      `select id, annee, numero, to_char(date_document, 'YYYY-MM-DD') as date_document,
              concerne_tgca, destinataire, objet, montant_ttc, montant_ht, montant_tgca, origine
       from avoirs
       where date_document >= $1 and date_document < $2 and ($3::int is null or numero >= $3)
       order by numero`,
      [debut, fin, plancherAvoir]
    ),
  ]);

  const lignes: LigneDetailTrimestre[] = [
    ...factures.rows.map((f) => ({
      type: "facture" as const,
      numero: f.numero,
      date: f.date_document,
      destinataire: f.destinataire,
      objet: f.objet,
      venteMateriel: f.vente_materiel,
      concerneTgca: f.concerne_tgca,
      montantTtc: Number(f.montant_ttc),
      montantHt: Number(f.montant_ht),
      montantTgca: Number(f.montant_tgca),
    })),
    ...avoirs.rows.map((a) => ({
      type: "avoir" as const,
      numero: a.numero,
      date: a.date_document,
      destinataire: a.destinataire,
      objet: a.objet,
      venteMateriel: null,
      concerneTgca: a.concerne_tgca,
      montantTtc: Number(a.montant_ttc),
      montantHt: Number(a.montant_ht),
      montantTgca: Number(a.montant_tgca),
    })),
  ];
  lignes.sort((a, b) => a.date.localeCompare(b.date));
  return lignes;
}
