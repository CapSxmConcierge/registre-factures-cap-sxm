"use client";

import { useMemo, useState } from "react";
import LigneFacture from "./LigneFacture";
import type { Facture } from "@/lib/registre";

const EUR = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

type Colonne = "numero" | "date_document" | "vente_materiel" | "concerne_tgca" | "destinataire" | "objet" | "montant_ttc" | "origine";
type OuiNonTous = "tous" | "oui" | "non";

function normaliser(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export default function TableFactures({ factures }: { factures: Facture[] }) {
  const [recherche, setRecherche] = useState("");
  const [filtreVenteMateriel, setFiltreVenteMateriel] = useState<OuiNonTous>("tous");
  const [filtreTgca, setFiltreTgca] = useState<OuiNonTous>("tous");
  const [filtreOrigine, setFiltreOrigine] = useState<string>("tous");
  const [triColonne, setTriColonne] = useState<Colonne>("numero");
  const [triSens, setTriSens] = useState<"asc" | "desc">("desc");

  function trierPar(colonne: Colonne) {
    if (colonne === triColonne) {
      setTriSens((s) => (s === "asc" ? "desc" : "asc"));
    } else {
      setTriColonne(colonne);
      setTriSens("asc");
    }
  }

  const flecheDe = (colonne: Colonne) => (colonne === triColonne ? (triSens === "asc" ? " ▲" : " ▼") : "");

  const filtrees = useMemo(() => {
    const q = normaliser(recherche.trim());
    let liste = factures.filter((f) => {
      if (q && !(String(f.numero).includes(q) || normaliser(f.destinataire).includes(q) || normaliser(f.objet).includes(q))) return false;
      if (filtreVenteMateriel !== "tous" && f.vente_materiel !== (filtreVenteMateriel === "oui")) return false;
      if (filtreTgca !== "tous" && f.concerne_tgca !== (filtreTgca === "oui")) return false;
      if (filtreOrigine !== "tous" && f.origine !== filtreOrigine) return false;
      return true;
    });

    liste = [...liste].sort((a, b) => {
      let comp = 0;
      switch (triColonne) {
        case "numero":
          comp = a.numero - b.numero;
          break;
        case "date_document":
          comp = a.date_document.localeCompare(b.date_document);
          break;
        case "vente_materiel":
          comp = Number(a.vente_materiel) - Number(b.vente_materiel);
          break;
        case "concerne_tgca":
          comp = Number(a.concerne_tgca) - Number(b.concerne_tgca);
          break;
        case "destinataire":
          comp = a.destinataire.localeCompare(b.destinataire);
          break;
        case "objet":
          comp = a.objet.localeCompare(b.objet);
          break;
        case "montant_ttc":
          comp = Number(a.montant_ttc) - Number(b.montant_ttc);
          break;
        case "origine":
          comp = a.origine.localeCompare(b.origine);
          break;
      }
      return triSens === "asc" ? comp : -comp;
    });

    return liste;
  }, [factures, recherche, filtreVenteMateriel, filtreTgca, filtreOrigine, triColonne, triSens]);

  const totalTtc = filtrees.reduce((s, f) => s + Number(f.montant_ttc), 0);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher (n°, destinataire, objet)…"
          className="w-64 rounded border border-slate-300 px-2 py-1.5 text-sm"
        />
        <select
          value={filtreVenteMateriel}
          onChange={(e) => setFiltreVenteMateriel(e.target.value as OuiNonTous)}
          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="tous">Vente matériel : tous</option>
          <option value="oui">Vente matériel : oui</option>
          <option value="non">Vente matériel : non</option>
        </select>
        <select
          value={filtreTgca}
          onChange={(e) => setFiltreTgca(e.target.value as OuiNonTous)}
          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="tous">TGCA : tous</option>
          <option value="oui">TGCA : oui</option>
          <option value="non">TGCA : non</option>
        </select>
        <select
          value={filtreOrigine}
          onChange={(e) => setFiltreOrigine(e.target.value)}
          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="tous">Origine : toutes</option>
          <option value="decompte">Décompte</option>
          <option value="materiel">Matériel</option>
          <option value="manuel">Manuel</option>
        </select>
        {(recherche || filtreVenteMateriel !== "tous" || filtreTgca !== "tous" || filtreOrigine !== "tous") && (
          <button
            onClick={() => {
              setRecherche("");
              setFiltreVenteMateriel("tous");
              setFiltreTgca("tous");
              setFiltreOrigine("tous");
            }}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            Réinitialiser
          </button>
        )}
      </div>

      <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="cursor-pointer select-none px-3 py-2 hover:text-slate-800" onClick={() => trierPar("numero")}>
                N°{flecheDe("numero")}
              </th>
              <th className="cursor-pointer select-none px-3 py-2 hover:text-slate-800" onClick={() => trierPar("date_document")}>
                Date{flecheDe("date_document")}
              </th>
              <th className="cursor-pointer select-none px-3 py-2 hover:text-slate-800" onClick={() => trierPar("vente_materiel")}>
                Vente matériel{flecheDe("vente_materiel")}
              </th>
              <th className="cursor-pointer select-none px-3 py-2 hover:text-slate-800" onClick={() => trierPar("concerne_tgca")}>
                TGCA{flecheDe("concerne_tgca")}
              </th>
              <th className="cursor-pointer select-none px-3 py-2 hover:text-slate-800" onClick={() => trierPar("destinataire")}>
                Destinataire{flecheDe("destinataire")}
              </th>
              <th className="cursor-pointer select-none px-3 py-2 hover:text-slate-800" onClick={() => trierPar("objet")}>
                Objet{flecheDe("objet")}
              </th>
              <th className="cursor-pointer select-none px-3 py-2 text-right hover:text-slate-800" onClick={() => trierPar("montant_ttc")}>
                Montant TTC{flecheDe("montant_ttc")}
              </th>
              <th className="cursor-pointer select-none px-3 py-2 hover:text-slate-800" onClick={() => trierPar("origine")}>
                Origine{flecheDe("origine")}
              </th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtrees.map((f) => (
              <LigneFacture key={f.id} facture={f} />
            ))}
            {filtrees.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-slate-400">
                  {factures.length === 0 ? "Aucune facture pour cette année." : "Aucun résultat pour ces filtres."}
                </td>
              </tr>
            )}
          </tbody>
          {filtrees.length > 0 && (
            <tfoot>
              <tr className="border-t border-slate-300 bg-slate-50 font-semibold">
                <td className="px-3 py-2" colSpan={6}>
                  Total ({filtrees.length}
                  {filtrees.length !== factures.length ? ` / ${factures.length}` : ""})
                </td>
                <td className="px-3 py-2 text-right font-mono">{EUR.format(totalTtc)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
