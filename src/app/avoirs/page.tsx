import Link from "next/link";
import { getAvoirs, getAnneesDisponibles } from "@/lib/registre";
import AjouterAvoir from "./AjouterAvoir";
import ImporterAvoirs from "./ImporterAvoirs";
import TableAvoirs from "./TableAvoirs";

export default async function AvoirsPage({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string }>;
}) {
  const { annee: anneeParam } = await searchParams;
  const anneeCourante = new Date().getUTCFullYear();
  const annee = Number(anneeParam) || anneeCourante;

  const [avoirs, annees] = await Promise.all([getAvoirs(annee), getAnneesDisponibles()]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Avoirs {annee}</h1>
        <div className="flex gap-2">
          {annees.map((a) => (
            <Link
              key={a}
              href={`/avoirs?annee=${a}`}
              className={`rounded px-2 py-1 text-sm ${a === annee ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {a}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <AjouterAvoir />
        <ImporterAvoirs />
      </div>

      <div className="mt-4">
        <TableAvoirs avoirs={avoirs} />
      </div>
    </div>
  );
}
