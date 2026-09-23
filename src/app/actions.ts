"use server";

import { redirect } from "next/navigation";
import { motDePasseValide, ouvrirSession, fermerSession } from "@/lib/auth";
import {
  ajouterFactureManuel,
  ajouterAvoirManuel,
  modifierFacture,
  modifierAvoir,
  importerFacturesManuel,
  importerAvoirsManuel,
  enregistrerPieceJointe,
  remplacerPieceJointeFacture,
  supprimerPieceJointeFacture,
  remplacerPieceJointeAvoir,
  supprimerPieceJointeAvoir,
  type ModifierFactureParams,
  type ModifierAvoirParams,
  type ImportResultat,
} from "@/lib/registre";
import { parserFacturesExcel, parserAvoirsExcel } from "@/lib/import-excel";
import { revalidatePath } from "next/cache";

export async function connexionAction(formData: FormData): Promise<{ ok: boolean; erreur?: string }> {
  const motDePasse = String(formData.get("motDePasse") ?? "");
  if (!motDePasseValide(motDePasse)) {
    return { ok: false, erreur: "Mot de passe incorrect." };
  }
  await ouvrirSession();
  return { ok: true };
}

export async function deconnexionAction(): Promise<void> {
  await fermerSession();
  redirect("/login");
}

/** Stocke la pièce jointe éventuelle du formulaire ("fichier") et renvoie son URL servable — undefined si aucun fichier choisi. */
async function traiterPieceJointeEventuelle(formData: FormData): Promise<string | undefined> {
  const fichier = formData.get("fichier");
  if (!(fichier instanceof File) || fichier.size === 0) return undefined;
  const buffer = Buffer.from(await fichier.arrayBuffer());
  return enregistrerPieceJointe(fichier.name, fichier.type || "application/octet-stream", buffer);
}

/**
 * Le montant TTC/HT est indispensable dès qu'une ligne est concernée par la
 * TGCA — demande explicite, 20/09/2026 : sans ça, impossible de calculer la
 * TGCA due. Toléré vide (→ 0) uniquement si la ligne n'est PAS concernée par
 * la TGCA (même règle que l'import Excel, voir import-excel.ts). Revalidé
 * ici (pas seulement côté formulaire) : une action serveur ne doit jamais
 * faire confiance à la seule validation client.
 */
function validerMontants(
  formData: FormData,
  concerneTgca: boolean
): { ok: true; montantTtc: number; montantHt: number } | { ok: false; erreur: string } {
  const montantTtcTexte = String(formData.get("montantTtc") ?? "").trim();
  const montantHtTexte = String(formData.get("montantHt") ?? "").trim();
  if (concerneTgca && (montantTtcTexte === "" || montantHtTexte === "")) {
    return { ok: false, erreur: "Le montant TTC et HT est obligatoire pour une ligne concernée par la TGCA." };
  }
  const montantTtc = montantTtcTexte === "" ? 0 : Number(montantTtcTexte);
  const montantHt = montantHtTexte === "" ? 0 : Number(montantHtTexte);
  if (!Number.isFinite(montantTtc) || !Number.isFinite(montantHt)) {
    return { ok: false, erreur: "Montant invalide." };
  }
  return { ok: true, montantTtc, montantHt };
}

export async function ajouterFactureAction(
  formData: FormData
): Promise<{ ok: true; numero: number } | { ok: false; erreur: string }> {
  try {
    const concerneTgca = formData.get("concerneTgca") === "on";
    const montants = validerMontants(formData, concerneTgca);
    if (!montants.ok) return montants;

    const lienFichier = await traiterPieceJointeEventuelle(formData);
    const ligne = await ajouterFactureManuel({
      date: String(formData.get("date")),
      destinataire: String(formData.get("destinataire")),
      objet: String(formData.get("objet")),
      montantTtc: montants.montantTtc,
      montantHt: montants.montantHt,
      venteMateriel: formData.get("venteMateriel") === "on",
      concerneTgca,
      lienFichier,
    });
    revalidatePath("/factures");
    revalidatePath("/tgca");
    return { ok: true, numero: ligne.numero };
  } catch (err) {
    console.error("Ajout de facture manuelle échoué :", err);
    return { ok: false, erreur: err instanceof Error ? err.message : "Échec inattendu." };
  }
}

export async function ajouterAvoirAction(
  formData: FormData
): Promise<{ ok: true; numero: number } | { ok: false; erreur: string }> {
  try {
    const concerneTgca = formData.get("concerneTgca") === "on";
    const montants = validerMontants(formData, concerneTgca);
    if (!montants.ok) return montants;

    const lienFichier = await traiterPieceJointeEventuelle(formData);
    const ligne = await ajouterAvoirManuel({
      date: String(formData.get("date")),
      destinataire: String(formData.get("destinataire")),
      objet: String(formData.get("objet")),
      montantTtc: montants.montantTtc,
      montantHt: montants.montantHt,
      concerneTgca,
      lienFichier,
    });
    revalidatePath("/avoirs");
    revalidatePath("/tgca");
    return { ok: true, numero: ligne.numero };
  } catch (err) {
    console.error("Ajout d'avoir manuel échoué :", err);
    return { ok: false, erreur: err instanceof Error ? err.message : "Échec inattendu." };
  }
}

export async function modifierFactureAction(
  params: ModifierFactureParams
): Promise<{ ok: true } | { ok: false; erreur: string }> {
  try {
    await modifierFacture(params);
    revalidatePath("/factures");
    revalidatePath("/tgca");
    return { ok: true };
  } catch (err) {
    console.error("Modification de facture échouée :", err);
    return { ok: false, erreur: err instanceof Error ? err.message : "Échec inattendu." };
  }
}

export async function modifierAvoirAction(
  params: ModifierAvoirParams
): Promise<{ ok: true } | { ok: false; erreur: string }> {
  try {
    await modifierAvoir(params);
    revalidatePath("/avoirs");
    revalidatePath("/tgca");
    return { ok: true };
  } catch (err) {
    console.error("Modification d'avoir échouée :", err);
    return { ok: false, erreur: err instanceof Error ? err.message : "Échec inattendu." };
  }
}

export async function remplacerPieceJointeFactureAction(
  formData: FormData
): Promise<{ ok: true; lienFichier: string } | { ok: false; erreur: string }> {
  const id = String(formData.get("id"));
  const fichier = formData.get("fichier");
  if (!(fichier instanceof File) || fichier.size === 0) return { ok: false, erreur: "Aucun fichier reçu." };
  try {
    const buffer = Buffer.from(await fichier.arrayBuffer());
    const lienFichier = await remplacerPieceJointeFacture(id, fichier.name, fichier.type || "application/octet-stream", buffer);
    revalidatePath("/factures");
    return { ok: true, lienFichier };
  } catch (err) {
    console.error("Remplacement de la pièce jointe (facture) échoué :", err);
    return { ok: false, erreur: err instanceof Error ? err.message : "Échec inattendu." };
  }
}

export async function supprimerPieceJointeFactureAction(
  formData: FormData
): Promise<{ ok: true } | { ok: false; erreur: string }> {
  const id = String(formData.get("id"));
  try {
    await supprimerPieceJointeFacture(id);
    revalidatePath("/factures");
    return { ok: true };
  } catch (err) {
    console.error("Suppression de la pièce jointe (facture) échouée :", err);
    return { ok: false, erreur: err instanceof Error ? err.message : "Échec inattendu." };
  }
}

export async function remplacerPieceJointeAvoirAction(
  formData: FormData
): Promise<{ ok: true; lienFichier: string } | { ok: false; erreur: string }> {
  const id = String(formData.get("id"));
  const fichier = formData.get("fichier");
  if (!(fichier instanceof File) || fichier.size === 0) return { ok: false, erreur: "Aucun fichier reçu." };
  try {
    const buffer = Buffer.from(await fichier.arrayBuffer());
    const lienFichier = await remplacerPieceJointeAvoir(id, fichier.name, fichier.type || "application/octet-stream", buffer);
    revalidatePath("/avoirs");
    return { ok: true, lienFichier };
  } catch (err) {
    console.error("Remplacement de la pièce jointe (avoir) échoué :", err);
    return { ok: false, erreur: err instanceof Error ? err.message : "Échec inattendu." };
  }
}

export async function supprimerPieceJointeAvoirAction(
  formData: FormData
): Promise<{ ok: true } | { ok: false; erreur: string }> {
  const id = String(formData.get("id"));
  try {
    await supprimerPieceJointeAvoir(id);
    revalidatePath("/avoirs");
    return { ok: true };
  } catch (err) {
    console.error("Suppression de la pièce jointe (avoir) échouée :", err);
    return { ok: false, erreur: err instanceof Error ? err.message : "Échec inattendu." };
  }
}

export async function importerFacturesExcelAction(
  formData: FormData
): Promise<{ ok: true; resultat: ImportResultat } | { ok: false; erreur: string }> {
  const fichier = formData.get("fichier");
  if (!(fichier instanceof File)) return { ok: false, erreur: "Aucun fichier reçu." };
  try {
    const buffer = Buffer.from(await fichier.arrayBuffer());
    const { lignes, erreurs: erreursParsing } = await parserFacturesExcel(buffer);
    if (erreursParsing.length > 0 && lignes.length === 0) {
      return { ok: false, erreur: erreursParsing.join(" ") };
    }
    const resultat = await importerFacturesManuel(lignes);
    for (const e of erreursParsing) resultat.erreurs.push({ ligneExcel: 0, numero: 0, raison: e });
    revalidatePath("/factures");
    revalidatePath("/tgca");
    return { ok: true, resultat };
  } catch (err) {
    console.error("Import de factures échoué :", err);
    return { ok: false, erreur: err instanceof Error ? err.message : "Fichier illisible — vérifie que c'est bien un .xlsx." };
  }
}

export async function importerAvoirsExcelAction(
  formData: FormData
): Promise<{ ok: true; resultat: ImportResultat } | { ok: false; erreur: string }> {
  const fichier = formData.get("fichier");
  if (!(fichier instanceof File)) return { ok: false, erreur: "Aucun fichier reçu." };
  try {
    const buffer = Buffer.from(await fichier.arrayBuffer());
    const { lignes, erreurs: erreursParsing } = await parserAvoirsExcel(buffer);
    if (erreursParsing.length > 0 && lignes.length === 0) {
      return { ok: false, erreur: erreursParsing.join(" ") };
    }
    const resultat = await importerAvoirsManuel(lignes);
    for (const e of erreursParsing) resultat.erreurs.push({ ligneExcel: 0, numero: 0, raison: e });
    revalidatePath("/avoirs");
    revalidatePath("/tgca");
    return { ok: true, resultat };
  } catch (err) {
    console.error("Import d'avoirs échoué :", err);
    return { ok: false, erreur: err instanceof Error ? err.message : "Fichier illisible — vérifie que c'est bien un .xlsx." };
  }
}
