import { NextRequest, NextResponse } from "next/server";
import { getDetailTrimestre } from "@/lib/registre";

function echapperCsv(valeur: string): string {
  if (/[",\n;]/.test(valeur)) return `"${valeur.replace(/"/g, '""')}"`;
  return valeur;
}

/** Export CSV du détail (Factures + Avoirs) d'un trimestre — pour la déclaration TGCA. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const annee = Number(params.get("annee"));
  const trimestre = Number(params.get("trimestre"));
  if (!annee || ![1, 2, 3, 4].includes(trimestre)) {
    return new NextResponse("Paramètres annee/trimestre invalides.", { status: 400 });
  }

  const lignes = await getDetailTrimestre(annee, trimestre as 1 | 2 | 3 | 4);

  const entetes = [
    "Type",
    "Numéro",
    "Date",
    "Destinataire",
    "Objet",
    "Vente matériel",
    "Concerné TGCA",
    "Montant TTC",
    "Montant HT",
    "Montant TGCA",
  ];
  const corps = lignes.map((l) =>
    [
      l.type === "facture" ? "Facture" : "Avoir",
      `${l.numero}${l.numeroSuffixe}`,
      l.date,
      l.destinataire,
      l.objet,
      l.venteMateriel === null ? "" : l.venteMateriel ? "Oui" : "Non",
      l.concerneTgca ? "Oui" : "Non",
      l.montantTtc.toFixed(2),
      l.montantHt.toFixed(2),
      l.montantTgca.toFixed(2),
    ]
      .map(echapperCsv)
      .join(";")
  );

  const csv = "﻿" + [entetes.join(";"), ...corps].join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tgca-${annee}-T${trimestre}.csv"`,
    },
  });
}
