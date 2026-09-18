import { cookies } from "next/headers";

/**
 * Accès protégé par un mot de passe UNIQUE partagé (pas de comptes
 * individuels — décision explicite, proportionnée à l'usage : quelques
 * personnes de confiance, consultation + ajout) plutôt qu'un vrai système
 * de comptes. Le cookie de session est un jeton signé (HMAC via WebCrypto —
 * portable entre le runtime Node et le middleware Edge, contrairement à
 * node:crypto), jamais un mot de passe en clair — voir SESSION_SECRET
 * (.env.local).
 */

export const NOM_COOKIE_SESSION = "registre_session";
const DUREE_SESSION_MS = 90 * 24 * 60 * 60 * 1000; // 90 jours

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET manquant dans .env.local.");
  return s;
}

async function cleHmac(): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

function octetsVersHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((o) => o.toString(16).padStart(2, "0"))
    .join("");
}

async function signer(payload: string): Promise<string> {
  const cle = await cleHmac();
  const signature = await crypto.subtle.sign("HMAC", cle, new TextEncoder().encode(payload));
  return octetsVersHex(signature);
}

export async function creerJetonSession(): Promise<string> {
  const payload = `ok:${Date.now()}`;
  return `${payload}.${await signer(payload)}`;
}

export async function verifierJeton(jeton: string | undefined): Promise<boolean> {
  if (!jeton) return false;
  const separateur = jeton.lastIndexOf(".");
  if (separateur === -1) return false;
  const payload = jeton.slice(0, separateur);
  const signature = jeton.slice(separateur + 1);
  const attendue = await signer(payload);
  if (signature.length !== attendue.length || signature !== attendue) return false;

  const [, horodatageBrut] = payload.split(":");
  const horodatage = Number(horodatageBrut);
  if (!Number.isFinite(horodatage)) return false;
  return Date.now() - horodatage < DUREE_SESSION_MS;
}

/** Comparaison à temps constant (approximative — suffisant pour un mot de passe partagé, pas un secret cryptographique). */
export function motDePasseValide(saisi: string): boolean {
  const attendu = process.env.REGISTRE_PASSWORD;
  if (!attendu) throw new Error("REGISTRE_PASSWORD manquant dans .env.local.");
  if (saisi.length !== attendu.length) return false;
  let diff = 0;
  for (let i = 0; i < saisi.length; i++) diff |= saisi.charCodeAt(i) ^ attendu.charCodeAt(i);
  return diff === 0;
}

export async function estConnecte(): Promise<boolean> {
  const jar = await cookies();
  return verifierJeton(jar.get(NOM_COOKIE_SESSION)?.value);
}

export async function ouvrirSession(): Promise<void> {
  const jar = await cookies();
  jar.set(NOM_COOKIE_SESSION, await creerJetonSession(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: DUREE_SESSION_MS / 1000,
  });
}

export async function fermerSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(NOM_COOKIE_SESSION);
}
