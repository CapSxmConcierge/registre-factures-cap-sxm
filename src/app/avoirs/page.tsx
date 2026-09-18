import Link from "next/link";
import { getAvoirs, getAnneesDisponibles } from "@/lib/registre";
import AjouterAvoir from "./AjouterAvoir";

const EUR = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const OUI_NON = (v: boolean) => (v ? "Oui" : "Non");

export default async function AvoirsPage({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string }>;
}) {
  const { annee: anneeParam } = await searchParams;
  const anneeCourante = new Date().getUTCFullYear();
  const annee = Number(anneeParam) || anneeCourante;

  const [avoirs, annees] = await Promise.all([getAvoirs(annee), getAnneesDisponibles()]);
  const totalTtc = avoirs.reduce((s, a) => s + Number(a.montant_ttc), 0);

  const origineLabel: Record<string, string> = { decompte: "Décompte", manuel: "Manuel" };

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

      <div className="mt-4">
        <AjouterAvoir />
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2">N°</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">TGCA</th>
              <th className="px-3 py-2">Destinataire</th>
              <th className="px-3 py-2">Objet</th>
              <th className="px-3 py-2 text-right">Montant TTC</th>
              <th className="px-3 py-2">Origine</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {avoirs.map((a) => (
              <tr key={a.id}>
                <td className="px-3 py-2 font-mono">{a.numero}</td>
                <td className="px-3 py-2">{a.date_document.split("-").reverse().join("/")}</td>
                <td className="px-3 py-2">{OUI_NON(a.concerne_tgca)}</td>
                <td className="px-3 py-2">{a.destinataire}</td>
                <td className="px-3 py-2">{a.objet}</td>
                <td className="px-3 py-2 text-right font-mono">{EUR.format(Number(a.montant_ttc))}</td>
                <td className="px-3 py-2 text-xs text-slate-400">{origineLabel[a.origine] ?? a.origine}</td>
              </tr>
            ))}
            {avoirs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-slate-400">
                  Aucun avoir pour {annee}.
                </td>
              </tr>
            )}
          </tbody>
          {avoirs.length > 0 && (
            <tfoot>
              <tr className="border-t border-slate-300 bg-slate-50 font-semibold">
                <td className="px-3 py-2" colSpan={5}>
                  Total ({avoirs.length})
                </td>
                <td className="px-3 py-2 text-right font-mono">{EUR.format(totalTtc)}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
