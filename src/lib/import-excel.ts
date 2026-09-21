import ExcelJS from "exceljs";

/**
 * Import historique Factures/Avoirs (période avant la mise en prod du
 * registre, ex. juillet-août 2026) — nécessaire pour que la déclaration
 * TGCA trimestrielle soit complète dès le T3. Colonnes = mêmes que
 * l'affichage à l'écran, sans "Origine" (toujours 'manuel' à l'import) ;
 * "X" à la place de OUI pour les cases Vente de matériel / TGCA (demande
 * explicite, 19/09/2026).
 */

const ENTETES_FACTURES = ["date", "n° de la facture", "vente de materiel", "concerne par tgca", "destinataire", "objet", "montant ttc"];
const ENTETES_AVOIRS = ["date", "n° de l'avoir", "concerne par tgca", "destinataire", "objet", "montant ttc"];

export interface LigneFactureImport {
  ligneExcel: number;
  date: string;
  numero: number;
  /** Suffixe optionnel (ex. "b" pour "34b") — facture historique émise en plus d'un numéro déjà attribué, jamais un nouveau numéro séquentiel. Voir migration 0053. */
  numeroSuffixe: string;
  venteMateriel: boolean;
  concerneTgca: boolean;
  destinataire: string;
  objet: string;
  montantTtc: number;
}

export interface LigneAvoirImport {
  ligneExcel: number;
  date: string;
  numero: number;
  numeroSuffixe: string;
  concerneTgca: boolean;
  destinataire: string;
  objet: string;
  montantTtc: number;
}

function normaliserEntete(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

const EPOCH_EXCEL = Date.UTC(1899, 11, 30);

function celluleVersDate(valeur: unknown): string | null {
  if (valeur instanceof Date) {
    return `${valeur.getUTCFullYear()}-${String(valeur.getUTCMonth() + 1).padStart(2, "0")}-${String(valeur.getUTCDate()).padStart(2, "0")}`;
  }
  if (typeof valeur === "number") {
    const d = new Date(EPOCH_EXCEL + valeur * 86400000);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  }
  if (typeof valeur === "string") {
    const s = valeur.trim();
    const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    const frMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (frMatch) return `${frMatch[3]}-${frMatch[2].padStart(2, "0")}-${frMatch[1].padStart(2, "0")}`;
  }
  return null;
}

function celluleVersTexte(valeur: unknown): string {
  if (valeur === null || valeur === undefined) return "";
  if (typeof valeur === "object" && "text" in (valeur as Record<string, unknown>)) {
    return String((valeur as { text: unknown }).text ?? "").trim();
  }
  return String(valeur).trim();
}

function celluleVersNombre(valeur: unknown): number | null {
  if (typeof valeur === "number") return valeur;
  if (typeof valeur === "string") {
    const s = valeur.trim();
    if (s === "") return null; // Number("") vaut 0 en JS — une case vide n'est PAS le nombre 0.
    const n = Number(s.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function celluleCochee(valeur: unknown): boolean {
  return celluleVersTexte(valeur).length > 0;
}

/**
 * Numéro de facture/avoir avec suffixe optionnel — demande explicite,
 * 21/09/2026 : une facture historique numérotée "34b" (émise en plus d'une
 * facture 34 déjà existante, suite à une erreur, jamais un nouveau numéro
 * séquentiel) doit pouvoir s'importer pour l'historique, sans casser la
 * saisie normale (nombre entier pur, le cas de très loin le plus courant).
 */
function celluleVersNumeroEtSuffixe(valeur: unknown): { numero: number; suffixe: string } | null {
  if (typeof valeur === "number" && Number.isInteger(valeur)) return { numero: valeur, suffixe: "" };
  const texte = celluleVersTexte(valeur);
  const correspond = texte.match(/^(\d+)\s*([a-zA-Z]?)$/);
  if (!correspond) return null;
  return { numero: Number(correspond[1]), suffixe: correspond[2].toLowerCase() };
}

/** Lit la 1ère feuille d'un classeur, renvoie l'index de colonne (1-based) pour chaque entête attendue. */
function reperColonnes(sheet: ExcelJS.Worksheet, entetesAttendues: string[]): { index: Record<string, number>; manquantes: string[] } {
  const ligneEntete = sheet.getRow(1);
  const index: Record<string, number> = {};
  ligneEntete.eachCell((cell, colNumber) => {
    const normalise = normaliserEntete(celluleVersTexte(cell.value));
    const correspond = entetesAttendues.find((e) => e === normalise);
    if (correspond) index[correspond] = colNumber;
  });
  const manquantes = entetesAttendues.filter((e) => !(e in index));
  return { index, manquantes };
}

export async function parserFacturesExcel(buffer: Buffer): Promise<{ lignes: LigneFactureImport[]; erreurs: string[] }> {
  const workbook = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(buffer as any);
  const sheet = workbook.worksheets[0];
  if (!sheet) return { lignes: [], erreurs: ["Le fichier ne contient aucune feuille."] };

  const { index, manquantes } = reperColonnes(sheet, ENTETES_FACTURES);
  if (manquantes.length > 0) {
    return { lignes: [], erreurs: [`Colonnes manquantes ou mal orthographiées : ${manquantes.join(", ")}.`] };
  }

  const lignes: LigneFactureImport[] = [];
  const erreurs: string[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const cellules = index;
    const brut = (cle: string) => row.getCell(cellules[cle]).value;
    const destinataire = celluleVersTexte(brut("destinataire"));
    const objet = celluleVersTexte(brut("objet"));
    const dateStr = celluleVersDate(brut("date"));
    const numeroEtSuffixe = celluleVersNumeroEtSuffixe(brut("n° de la facture"));
    const montantTtcBrut = celluleVersNombre(brut("montant ttc"));
    const montantTtcTexte = celluleVersTexte(brut("montant ttc"));
    const venteMateriel = celluleCochee(brut("vente de materiel"));
    const concerneTgca = celluleCochee(brut("concerne par tgca"));
    if (!destinataire && !objet && !dateStr && numeroEtSuffixe === null && montantTtcBrut === null) return; // ligne vide

    if (!dateStr) { erreurs.push(`Ligne ${rowNumber} : date invalide ou manquante.`); return; }
    if (numeroEtSuffixe === null) {
      erreurs.push(`Ligne ${rowNumber} : numéro de facture invalide ou manquant (nombre entier, ou nombre suivi d'une lettre, ex. "34b").`);
      return;
    }
    if (!destinataire) { erreurs.push(`Ligne ${rowNumber} : destinataire manquant.`); return; }
    if (!objet) { erreurs.push(`Ligne ${rowNumber} : objet manquant.`); return; }

    // Montant TTC non renseigné à l'époque pour les lignes hors TGCA (pas
    // utile alors) — accepté à 0 dans ce cas, sans incidence sur la
    // déclaration TGCA (getRecapTgcaTrimestre ne somme que les lignes
    // concerne_tgca). Obligatoire dès que la ligne est concernée par la TGCA.
    let montantTtc: number;
    if (montantTtcBrut !== null) {
      montantTtc = montantTtcBrut;
    } else if (montantTtcTexte === "" && !concerneTgca) {
      montantTtc = 0;
    } else {
      erreurs.push(`Ligne ${rowNumber} : montant TTC invalide ou manquant (obligatoire pour une ligne concernée par la TGCA).`);
      return;
    }

    lignes.push({
      ligneExcel: rowNumber,
      date: dateStr,
      numero: numeroEtSuffixe.numero,
      numeroSuffixe: numeroEtSuffixe.suffixe,
      venteMateriel,
      concerneTgca,
      destinataire,
      objet,
      montantTtc,
    });
  });

  return { lignes, erreurs };
}

export async function parserAvoirsExcel(buffer: Buffer): Promise<{ lignes: LigneAvoirImport[]; erreurs: string[] }> {
  const workbook = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(buffer as any);
  const sheet = workbook.worksheets[0];
  if (!sheet) return { lignes: [], erreurs: ["Le fichier ne contient aucune feuille."] };

  const { index, manquantes } = reperColonnes(sheet, ENTETES_AVOIRS);
  if (manquantes.length > 0) {
    return { lignes: [], erreurs: [`Colonnes manquantes ou mal orthographiées : ${manquantes.join(", ")}.`] };
  }

  const lignes: LigneAvoirImport[] = [];
  const erreurs: string[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const cellules = index;
    const brut = (cle: string) => row.getCell(cellules[cle]).value;
    const destinataire = celluleVersTexte(brut("destinataire"));
    const objet = celluleVersTexte(brut("objet"));
    const dateStr = celluleVersDate(brut("date"));
    const numeroEtSuffixe = celluleVersNumeroEtSuffixe(brut("n° de l'avoir"));
    const montantTtcBrut = celluleVersNombre(brut("montant ttc"));
    const montantTtcTexte = celluleVersTexte(brut("montant ttc"));
    const concerneTgca = celluleCochee(brut("concerne par tgca"));
    if (!destinataire && !objet && !dateStr && numeroEtSuffixe === null && montantTtcBrut === null) return;

    if (!dateStr) { erreurs.push(`Ligne ${rowNumber} : date invalide ou manquante.`); return; }
    if (numeroEtSuffixe === null) {
      erreurs.push(`Ligne ${rowNumber} : numéro d'avoir invalide ou manquant (nombre entier, ou nombre suivi d'une lettre, ex. "34b").`);
      return;
    }
    if (!destinataire) { erreurs.push(`Ligne ${rowNumber} : destinataire manquant.`); return; }
    if (!objet) { erreurs.push(`Ligne ${rowNumber} : objet manquant.`); return; }

    // Même tolérance que pour les factures — montant TTC non renseigné à
    // l'époque pour les lignes hors TGCA, accepté à 0 dans ce cas.
    let montantTtc: number;
    if (montantTtcBrut !== null) {
      montantTtc = montantTtcBrut;
    } else if (montantTtcTexte === "" && !concerneTgca) {
      montantTtc = 0;
    } else {
      erreurs.push(`Ligne ${rowNumber} : montant TTC invalide ou manquant (obligatoire pour une ligne concernée par la TGCA).`);
      return;
    }

    lignes.push({
      ligneExcel: rowNumber,
      date: dateStr,
      numero: numeroEtSuffixe.numero,
      numeroSuffixe: numeroEtSuffixe.suffixe,
      concerneTgca,
      destinataire,
      objet,
      montantTtc,
    });
  });

  return { lignes, erreurs };
}

/** Génère un classeur modèle vide (juste les entêtes) pour l'import Factures. */
export async function genererModeleFactures(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Factures");
  sheet.addRow(["Date", "N° de la facture", "Vente de matériel", "Concerné par TGCA", "Destinataire", "Objet", "Montant TTC"]);
  sheet.getRow(1).font = { bold: true };
  sheet.columns = [{ width: 12 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 24 }, { width: 30 }, { width: 14 }];
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/** Génère un classeur modèle vide (juste les entêtes) pour l'import Avoirs. */
export async function genererModeleAvoirs(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Avoirs");
  sheet.addRow(["Date", "N° de l'avoir", "Concerné par TGCA", "Destinataire", "Objet", "Montant TTC"]);
  sheet.getRow(1).font = { bold: true };
  sheet.columns = [{ width: 12 }, { width: 12 }, { width: 16 }, { width: 24 }, { width: 30 }, { width: 14 }];
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
