"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deconnexionAction } from "./actions";

export default function DeconnexionBouton() {
  const [enCours, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await deconnexionAction();
          router.push("/login");
        })
      }
      disabled={enCours}
      className="text-xs text-slate-500 hover:text-slate-700 hover:underline disabled:opacity-50"
    >
      Se déconnecter
    </button>
  );
}
