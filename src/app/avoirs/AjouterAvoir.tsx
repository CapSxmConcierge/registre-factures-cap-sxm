"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ajouterAvoirAction } from "../actions";

const AUJOURDHUI = new Date().toISOString().slice(0, 10);

export default function AjouterAvoir() {
  const [ouvert, setOuvert] = useState(false);
  const [date, setDate] = useState(AUJOURDHUI);
  const [destinataire, setDestinataire] = useState("");
  const [objet, setObjet] = useState("");
  const [montantTtc, setMontantTtc] = useState("");
  const [montantHt, setMontantHt] = useState("");
  const [concerneTgca, setConcerneTgca] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, startTransition] = useTransition();
  const fichierRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function reinitialiser() {
    setDate(AUJOURDHUI);
    setDestinataire("");
    setObjet("");
    setMontantTtc("");
    setMontantHt("");
    setConcerneTgca(false);
    setErreur(null);
    if (fichierRef.current) fichierRef.current.value = "";
  }

  function soumettre() {
    const ttc = Number(montantTtc);
    const ht = Number(montantHt);
    if (!destinataire || !objet || !Number.isFinite(ttc) || !Number.isFinite(ht)) {
      setErreur("Renseigne au moins le destinataire, l'objet et les montants.");
      return;
    }
    setErreur(null);
    const formData = new FormData();
    formData.set("date", date);
    formData.set("destinataire", destinataire);
    formData.set("objet", objet);
    formData.set("montantTtc", montantTtc);
    formData.set("montantHt", montantHt);
    if (concerneTgca) formData.set("concerneTgca", "on");
    const fichier = fichierRef.current?.files?.[0];
    if (fichier) formData.set("fichier", fichier);

    startTransition(async () => {
      const resultat = await ajouterAvoirAction(formData);
      if (!resultat.ok) {
        setErreur(resultat.erreur);
        return;
      }
      reinitialiser();
      setOuvert(false);
      router.refresh();
    });
  }

  if (!ouvert) {
    return (
      <button
        onClick={() => setOuvert(true)}
        className="rounded bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
      >
        + Ajouter un avoir
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-800">Nouvel avoir (numéro attribué automatiquement)</p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-sm text-slate-700">
          Date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-sm text-slate-700">
          Destinataire
          <input
            type="text"
            value={destinataire}
            onChange={(e) => setDestinataire(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-sm text-slate-700 sm:col-span-2">
          Objet
          <input
            type="text"
            value={objet}
            onChange={(e) => setObjet(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-sm text-slate-700">
          Montant TTC (€)
          <input
            type="number"
            step="0.01"
            value={montantTtc}
            onChange={(e) => setMontantTtc(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-sm text-slate-700">
          Montant HT (€)
          <input
            type="number"
            step="0.01"
            value={montantHt}
            onChange={(e) => setMontantHt(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-sm text-slate-700 sm:col-span-2">
          Pièce jointe (optionnel)
          <input
            ref={fichierRef}
            type="file"
            accept=".pdf,image/*"
            className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"
          />
        </label>
      </div>

      <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={concerneTgca} onChange={(e) => setConcerneTgca(e.target.checked)} />
        Concerné par la TGCA
        <span className="text-xs text-slate-400">
          (OUI pour un avoir de gestion lié au décompte — NON pour un avoir sur facture de séjour remboursé)
        </span>
      </label>

      {erreur && <p className="mt-2 text-sm text-red-600">{erreur}</p>}

      <div className="mt-3 flex gap-2">
        <button
          onClick={soumettre}
          disabled={enCours}
          className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {enCours ? "Enregistrement..." : "Enregistrer"}
        </button>
        <button
          onClick={() => {
            reinitialiser();
            setOuvert(false);
          }}
          className="rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
