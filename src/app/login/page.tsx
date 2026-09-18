"use client";

import { useState, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { connexionAction } from "../actions";

function FormulaireConnexion() {
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, startTransition] = useTransition();
  const router = useRouter();
  const params = useSearchParams();

  function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    startTransition(async () => {
      const resultat = await connexionAction(new FormData(e.target as HTMLFormElement));
      if (!resultat.ok) {
        setErreur(resultat.erreur ?? "Erreur inconnue.");
        return;
      }
      router.push(params.get("suite") || "/factures");
      router.refresh();
    });
  }

  return (
    <form onSubmit={soumettre} className="mx-auto mt-24 max-w-sm space-y-4 rounded-lg border border-slate-200 p-6">
      <h1 className="text-lg font-semibold text-slate-900">Registre Factures/Avoirs — CAP SXM</h1>
      <label className="block text-sm text-slate-700">
        Mot de passe
        <input
          type="password"
          name="motDePasse"
          autoFocus
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      {erreur && <p className="text-sm text-red-600">{erreur}</p>}
      <button
        type="submit"
        disabled={enCours}
        className="w-full rounded bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {enCours ? "Connexion..." : "Se connecter"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <FormulaireConnexion />
    </Suspense>
  );
}
