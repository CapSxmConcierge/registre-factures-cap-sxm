import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/pool";
import { estConnecte } from "@/lib/auth";

/** Sert une pièce jointe stockée en base (voir migration 0049) — protégé par le middleware (toute route hors /login exige une session). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await estConnecte())) return new NextResponse("Non autorisé", { status: 401 });

  const { id } = await params;
  const { rows } = await pool.query<{ nom_fichier: string; type_mime: string; donnees: Buffer }>(
    `select nom_fichier, type_mime, donnees from pieces_jointes_registre where id = $1`,
    [id]
  );
  const piece = rows[0];
  if (!piece) return new NextResponse("Pièce jointe introuvable.", { status: 404 });

  return new NextResponse(new Uint8Array(piece.donnees), {
    headers: {
      "Content-Type": piece.type_mime,
      "Content-Disposition": `inline; filename="${piece.nom_fichier.replace(/"/g, "")}"`,
    },
  });
}
