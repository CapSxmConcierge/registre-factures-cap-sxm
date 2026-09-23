"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  remplacerPieceJointeFactureAction,
  supprimerPieceJointeFactureAction,
  remplacerPieceJointeAvoirAction,
  supprimerPieceJointeAvoirAction,
} from "./actions";

/** Édition de la pièce jointe d'une ligne (Facture ou Avoir) déjà enregistrée — joindre pour la 1ère fois, remplacer, ou supprimer. Demande explicite, 23/09/2026. */
export default function PieceJointeEditable({
  id,
  type,
  lienFichier,
}: {
  id: string;
  type: "facture" | "avoir";
  lienFichier: string | null;
}) {
  const [lien, setLien] = useState(lienFichier);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, startTransition] = useTransition();
  const fichierRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const remplacerAction = type === "facture" ? remplacerPieceJointeFactureAction : remplacerPieceJointeAvoirAction;
  const supprimerAction = type === "facture" ? supprimerPieceJointeFactureAction : supprimerPieceJointeAvoirAction;

  function remplacer() {
    const fichier = fichierRef.current?.files?.[0];
    if (!fichier) return;
    const formData = new FormData();
    formData.set("id", id);
    formData.set("fichier", fichier);
    setErreur(null);
    startTransition(async () => {
      const resultat = await remplacerAction(formData);
      if (!resultat.ok) {
        setErreur(resultat.erreur);
        return;
      }
      setLien(resultat.lienFichier);
      if (fichierRef.current) fichierRef.current.value = "";
      router.refresh();
    });
  }

  function supprimer() {
    if (!confirm("Retirer la pièce jointe de cette ligne ?")) return;
    const formData = new FormData();
    formData.set("id", id);
    setErreur(null);
    startTransition(async () => {
      const resultat = await supprimerAction(formData);
      if (!resultat.ok) {
        setErreur(resultat.erreur);
        return;
      }
      setLien(null);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-1">
      {lien ? (
        lien.startsWith("/api/piece-jointe/") ? (
          <a href={lien} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-blue-600 hover:underline">
            📎 Ouvrir
          </a>
        ) : (
          <span className="text-xs text-slate-400" title={lien}>
            📁 {lien.split(/[\\/]/).pop() || lien}
          </span>
        )
      ) : (
        <span className="text-xs text-slate-300">—</span>
      )}
      <input ref={fichierRef} type="file" accept=".pdf,image/*" disabled={enCours} className="w-40 text-xs" />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={remplacer}
          disabled={enCours}
          className="text-xs font-semibold text-blue-600 hover:underline disabled:opacity-50"
        >
          {lien ? "Remplacer" : "Joindre"}
        </button>
        {lien && (
          <button
            type="button"
            onClick={supprimer}
            disabled={enCours}
            className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
          >
            Supprimer
          </button>
        )}
      </div>
      {erreur && <p className="text-xs text-red-600">{erreur}</p>}
    </div>
  );
}
