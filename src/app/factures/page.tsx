import Link from "next/link";
import { getFactures, getAnneesDisponibles } from "@/lib/registre";
import AjouterFacture from "./AjouterFacture";
import ImporterFactures from "./ImporterFactures";
import TableFactures from "./TableFactures";

export default async function FacturesPage({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string }>;
}) {
  const { annee: anneeParam } = await searchParams;
  const anneeCourante = new Date().getUTCFullYear();
  const annee = Number(anneeParam) || anneeCourante;

  const [factures, annees] = await Promise.all([getFactures(annee), getAnneesDisponibles()]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Factures {annee}</h1>
        <div className="flex gap-2">
          {annees.map((a) => (
            <Link
              key={a}
              href={`/factures?annee=${a}`}
              className={`rounded px-2 py-1 text-sm ${a === annee ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {a}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <AjouterFacture />
        <ImporterFactures />
      </div>

      <div className="mt-4">
        <TableFactures factures={factures} />
      </div>
    </div>
  );
}
