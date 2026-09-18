import Link from "next/link";
import { getFactures, getAnneesDisponibles } from "@/lib/registre";
import AjouterFacture from "./AjouterFacture";

const EUR = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const OUI_NON = (v: boolean) => (v ? "Oui" : "Non");

export default async function FacturesPage({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string }>;
}) {
  const { annee: anneeParam } = await searchParams;
  const anneeCourante = new Date().getUTCFullYear();
  const annee = Number(anneeParam) || anneeCourante;

  const [factures, annees] = await Promise.all([getFactures(annee), getAnneesDisponibles()]);
  const totalTtc = factures.reduce((s, f) => s + Number(f.montant_ttc), 0);

  const origineLabel: Record<string, string> = { decompte: "Décompte", materiel: "Matériel", manuel: "Manuel" };

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

      <div className="mt-4">
        <AjouterFacture />
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2">N°</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Vente matériel</th>
              <th className="px-3 py-2">TGCA</th>
              <th className="px-3 py-2">Destinataire</th>
              <th className="px-3 py-2">Objet</th>
              <th className="px-3 py-2 text-right">Montant TTC</th>
              <th className="px-3 py-2">Origine</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {factures.map((f) => (
              <tr key={f.id}>
                <td className="px-3 py-2 font-mono">{f.numero}</td>
                <td className="px-3 py-2">{f.date_document.split("-").reverse().join("/")}</td>
                <td className="px-3 py-2">{OUI_NON(f.vente_materiel)}</td>
                <td className="px-3 py-2">{OUI_NON(f.concerne_tgca)}</td>
                <td className="px-3 py-2">{f.destinataire}</td>
                <td className="px-3 py-2">{f.objet}</td>
                <td className="px-3 py-2 text-right font-mono">{EUR.format(Number(f.montant_ttc))}</td>
                <td className="px-3 py-2 text-xs text-slate-400">{origineLabel[f.origine] ?? f.origine}</td>
              </tr>
            ))}
            {factures.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-slate-400">
                  Aucune facture pour {annee}.
                </td>
              </tr>
            )}
          </tbody>
          {factures.length > 0 && (
            <tfoot>
              <tr className="border-t border-slate-300 bg-slate-50 font-semibold">
                <td className="px-3 py-2" colSpan={6}>
                  Total ({factures.length})
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
