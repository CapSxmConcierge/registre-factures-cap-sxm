"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importerFacturesExcelAction } from "../actions";
import type { ImportResultat } from "@/lib/registre";

export default function ImporterFactures() {
  const [ouvert, setOuvert] = useState(false);
  const [resultat, setResultat] = useState<ImportResultat | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function importer() {
    const fichier = inputRef.current?.files?.[0];
    if (!fichier) {
      setErreur("Choisis d'abord un fichier .xlsx.");
      return;
    }
    setErreur(null);
    setResultat(null);
    const formData = new FormData();
    formData.set("fichier", fichier);
    startTransition(async () => {
      const res = await importerFacturesExcelAction(formData);
      if (!res.ok) {
        setErreur(res.erreur);
        return;
      }
      setResultat(res.resultat);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    });
  }

  if (!ouvert) {
    return (
      <button
        onClick={() => setOuvert(true)}
        className="rounded border border-blue-300 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
      >
        Importer depuis Excel
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
      <p className="text-sm font-semibold text-slate-800">Importer un historique de factures (.xlsx)</p>
      <p className="mt-1 text-xs text-slate-500">
        Colonnes attendues : Date, N° de la facture, Vente de matériel, Concerné par TGCA, Destinataire, Objet, Montant TTC — mets un
        « X » dans les cases Vente de matériel / Concerné par TGCA quand c&apos;est le cas, laisse vide sinon. Chaque numéro déjà
        présent dans le registre sera ignoré (pas de doublon).
      </p>
      <a href="/api/modele-factures" className="mt-1 inline-block text-xs font-semibold text-blue-600 hover:underline">
        Télécharger le modèle vide
      </a>

      <div className="mt-3 flex items-center gap-2">
        <input ref={inputRef} type="file" accept=".xlsx" className="text-sm" />
        <button
          onClick={importer}
          disabled={enCours}
          className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {enCours ? "Import en cours..." : "Importer"}
        </button>
        <button
          onClick={() => {
            setOuvert(false);
            setResultat(null);
            setErreur(null);
          }}
          className="rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
        >
          Fermer
        </button>
      </div>

      {erreur && <p className="mt-2 text-sm text-red-600">{erreur}</p>}

      {resultat && (
        <div className="mt-3 rounded border border-slate-200 bg-white p-3 text-sm">
          <p className="font-semibold text-emerald-700">{resultat.inserees} ligne(s) importée(s).</p>
          {resultat.ignorees.length > 0 && (
            <div className="mt-1">
              <p className="text-amber-700">{resultat.ignorees.length} ligne(s) ignorée(s) (déjà existantes) :</p>
              <ul className="ml-4 list-disc text-xs text-slate-500">
                {resultat.ignorees.map((i, idx) => (
                  <li key={idx}>
                    Ligne {i.ligneExcel} — {i.raison}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {resultat.erreurs.length > 0 && (
            <div className="mt-1">
              <p className="text-red-700">{resultat.erreurs.length} ligne(s) en erreur :</p>
              <ul className="ml-4 list-disc text-xs text-slate-500">
                {resultat.erreurs.map((e, idx) => (
                  <li key={idx}>
                    {e.ligneExcel > 0 ? `Ligne ${e.ligneExcel}` : "Fichier"} — {e.raison}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
