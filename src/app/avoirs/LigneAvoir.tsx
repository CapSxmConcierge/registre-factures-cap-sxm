"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { modifierAvoirAction } from "../actions";
import type { Avoir } from "@/lib/registre";

const EUR = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const OUI_NON = (v: boolean) => (v ? "Oui" : "Non");
const origineLabel: Record<string, string> = { decompte: "Décompte", manuel: "Manuel" };

/** Pièce jointe uploadée (servable depuis ce site) vs. simple chemin local (documents générés par l'Appli Gestion, pas cliquable depuis le web). */
function CelluleFichier({ lien }: { lien: string | null }) {
  if (!lien) return <span className="text-slate-300">—</span>;
  if (lien.startsWith("/api/piece-jointe/")) {
    return (
      <a href={lien} target="_blank" rel="noopener noreferrer" className="font-semibold text-amber-700 hover:underline">
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

export default function LigneAvoir({ avoir }: { avoir: Avoir }) {
  const [edition, setEdition] = useState(false);
  const [date, setDate] = useState(avoir.date_document);
  const [destinataire, setDestinataire] = useState(avoir.destinataire);
  const [objet, setObjet] = useState(avoir.objet);
  const [montantTtc, setMontantTtc] = useState(String(avoir.montant_ttc));
  const [montantHt, setMontantHt] = useState(String(avoir.montant_ht));
  const [concerneTgca, setConcerneTgca] = useState(avoir.concerne_tgca);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, startTransition] = useTransition();
  const router = useRouter();

  function annuler() {
    setDate(avoir.date_document);
    setDestinataire(avoir.destinataire);
    setObjet(avoir.objet);
    setMontantTtc(String(avoir.montant_ttc));
    setMontantHt(String(avoir.montant_ht));
    setConcerneTgca(avoir.concerne_tgca);
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
      const resultat = await modifierAvoirAction({
        id: avoir.id,
        date,
        destinataire,
        objet,
        montantTtc: ttc,
        montantHt: ht,
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
        <td className="px-3 py-2 font-mono">{avoir.numero}</td>
        <td className="px-3 py-2">{avoir.date_document.split("-").reverse().join("/")}</td>
        <td className="px-3 py-2">{OUI_NON(avoir.concerne_tgca)}</td>
        <td className="px-3 py-2">{avoir.destinataire}</td>
        <td className="px-3 py-2">{avoir.objet}</td>
        <td className="px-3 py-2 text-right font-mono">{EUR.format(Number(avoir.montant_ttc))}</td>
        <td className="px-3 py-2 text-xs text-slate-400">{origineLabel[avoir.origine] ?? avoir.origine}</td>
        <td className="px-3 py-2 text-sm">
          <CelluleFichier lien={avoir.lien_fichier} />
        </td>
        <td className="px-3 py-2 text-right">
          <button onClick={() => setEdition(true)} className="text-xs font-semibold text-amber-600 hover:text-amber-800">
            Modifier
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="bg-amber-50/50">
      <td className="px-3 py-2 font-mono text-slate-400">{avoir.numero}</td>
      <td className="px-3 py-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded border border-slate-300 px-1.5 py-1 text-sm"
        />
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
      <td className="px-3 py-2 text-xs text-slate-400">{origineLabel[avoir.origine] ?? avoir.origine}</td>
      <td className="px-3 py-2 text-sm">
        <CelluleFichier lien={avoir.lien_fichier} />
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
