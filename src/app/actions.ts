"use server";

import { redirect } from "next/navigation";
import { motDePasseValide, ouvrirSession, fermerSession } from "@/lib/auth";
import {
  ajouterFactureManuel,
  ajouterAvoirManuel,
  type AjouterFactureManuelParams,
  type AjouterAvoirManuelParams,
} from "@/lib/registre";
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

export async function ajouterFactureAction(
  params: AjouterFactureManuelParams
): Promise<{ ok: true; numero: number } | { ok: false; erreur: string }> {
  try {
    const ligne = await ajouterFactureManuel(params);
    revalidatePath("/factures");
    revalidatePath("/tgca");
    return { ok: true, numero: ligne.numero };
  } catch (err) {
    console.error("Ajout de facture manuelle échoué :", err);
    return { ok: false, erreur: err instanceof Error ? err.message : "Échec inattendu." };
  }
}

export async function ajouterAvoirAction(
  params: AjouterAvoirManuelParams
): Promise<{ ok: true; numero: number } | { ok: false; erreur: string }> {
  try {
    const ligne = await ajouterAvoirManuel(params);
    revalidatePath("/avoirs");
    revalidatePath("/tgca");
    return { ok: true, numero: ligne.numero };
  } catch (err) {
    console.error("Ajout d'avoir manuel échoué :", err);
    return { ok: false, erreur: err instanceof Error ? err.message : "Échec inattendu." };
  }
}
