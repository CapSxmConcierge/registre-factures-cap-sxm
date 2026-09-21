"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { modifierFactureAction } from "../actions";
import type { Facture } from "@/lib/registre";

const EUR = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const OUI_NON = (v: boolean) => (v ? "Oui" : "Non");
const origineLabel: Record<string, string> = { decompte: "Décompte", materiel: "Matériel", manuel: "Manuel" };

/** Pièce jointe uploadée (servable depuis ce site) vs. simple chemin local (documents générés par l'Appli Gestion, pas cliquable depuis le web). */
function CelluleFichier({ lien }: { lien: string | null }) {
  if (!lien) return <span className="text-slate-300">—</span>;
  if (lien.startsWith("/api/piece-jointe/")) {
    return (
      <a href={lien} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 hover:underline">
        📎 Ouvrir
      </a>
    );
  }
  const nom = lien.split(/[\\/]/).pop() || lien;
  return (
    <span className="text-xs text-slate-400" title={lien}>
      📁 {nom}
    </span>
  );
}

export default function LigneFacture({ facture }: { facture: Facture }) {
  const [edition, setEdition] = useState(false);
  const [date, setDate] = useState(facture.date_document);
  const [destinataire, setDestinataire] = useState(facture.destinataire);
  const [objet, setObjet] = useState(facture.objet);
  const [montantTtc, setMontantTtc] = useState(String(facture.montant_ttc));
  const [montantHt, setMontantHt] = useState(String(facture.montant_ht));
  const [venteMateriel, setVenteMateriel] = useState(facture.vente_materiel);
  const [concerneTgca, setConcerneTgca] = useState(facture.concerne_tgca);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, startTransition] = useTransition();
  const router = useRouter();

  function annuler() {
    setDate(facture.date_document);
    setDestinataire(facture.destinataire);
    setObjet(facture.objet);
    setMontantTtc(String(facture.montant_ttc));
    setMontantHt(String(facture.montant_ht));
    setVenteMateriel(facture.vente_materiel);
    setConcerneTgca(facture.concerne_tgca);
    setErreur(null);
    setEdition(false);
  }

  function enregistrer() {
    const ttc = Number(montantTtc);
    const ht = Number(montantHt);
    if (!destinataire || !objet || !Number.isFinite(ttc) || !Number.isFinite(ht)) {
      setErreur("Renseigne au moins le destinataire, l'objet et les montants.");
      return;
    }
    setErreur(null);
    startTransition(async () => {
      const resultat = await modifierFactureAction({
        id: facture.id,
        date,
        destinataire,
        objet,
        montantTtc: ttc,
        montantHt: ht,
        venteMateriel,
        concerneTgca,
      });
      if (!resultat.ok) {
        setErreur(resultat.erreur);
        return;
      }
      setEdition(false);
      router.refresh();
    });
  }

  if (!edition) {
    return (
      <tr>
        <td className="px-3 py-2 font-mono">{facture.numero}{facture.numero_suffixe}</td>
        <td className="px-3 py-2">{facture.date_document.split("-").reverse().join("/")}</td>
        <td className="px-3 py-2">{OUI_NON(facture.vente_materiel)}</td>
        <td className="px-3 py-2">{OUI_NON(facture.concerne_tgca)}</td>
        <td className="px-3 py-2">{facture.destinataire}</td>
        <td className="px-3 py-2">{facture.objet}</td>
        <td className="px-3 py-2 text-right font-mono">{EUR.format(Number(facture.montant_ttc))}</td>
        <td className="px-3 py-2 text-xs text-slate-400">{origineLabel[facture.origine] ?? facture.origine}</td>
        <td className="px-3 py-2 text-sm">
          <CelluleFichier lien={facture.lien_fichier} />
        </td>
        <td className="px-3 py-2 text-right">
          <button onClick={() => setEdition(true)} className="text-xs font-semibold text-blue-600 hover:text-blue-800">
            Modifier
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="bg-blue-50/50">
      <td className="px-3 py-2 font-mono text-slate-400">{facture.numero}{facture.numero_suffixe}</td>
      <td className="px-3 py-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded border border-slate-300 px-1.5 py-1 text-sm"
        />
      </td>
      <td className="px-3 py-2">
        <input type="checkbox" checked={venteMateriel} onChange={(e) => setVenteMateriel(e.target.checked)} />
      </td>
      <td className="px-3 py-2">
        <input type="checkbox" checked={concerneTgca} onChange={(e) => setConcerneTgca(e.target.checked)} />
      </td>
      <td className="px-3 py-2">
        <input
          type="text"
          value={destinataire}
          onChange={(e) => setDestinataire(e.target.value)}
          className="w-full rounded border border-slate-300 px-1.5 py-1 text-sm"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="text"
          value={objet}
          onChange={(e) => setObjet(e.target.value)}
          className="w-full rounded border border-slate-300 px-1.5 py-1 text-sm"
        />
      </td>
      <td className="px-3 py-2">
        <div className="flex flex-col gap-1">
          <input
            type="number"
            step="0.01"
            value={montantTtc}
            onChange={(e) => setMontantTtc(e.target.value)}
            placeholder="TTC"
            className="w-24 rounded border border-slate-300 px-1.5 py-1 text-right text-sm"
          />
          <input
            type="number"
            step="0.01"
            value={montantHt}
            onChange={(e) => setMontantHt(e.target.value)}
            placeholder="HT"
            className="w-24 rounded border border-slate-300 px-1.5 py-1 text-right text-sm"
          />
        </div>
      </td>
      <td className="px-3 py-2 text-xs text-slate-400">{origineLabel[facture.origine] ?? facture.origine}</td>
      <td className="px-3 py-2 text-sm">
        <CelluleFichier lien={facture.lien_fichier} />
      </td>
      <td className="px-3 py-2 whitespace-nowrap text-right">
        {erreur && <p className="mb-1 text-xs text-red-600">{erreur}</p>}
        <button
          onClick={enregistrer}
          disabled={enCours}
          className="mr-1 rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {enCours ? "..." : "OK"}
        </button>
        <button onClick={annuler} className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100">
          Annuler
        </button>
      </td>
    </tr>
  );
}
