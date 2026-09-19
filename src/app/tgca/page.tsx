import { getRecapTgcaTrimestre, getAnneesDisponibles } from "@/lib/registre";

const EUR = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const NOMS_TRIMESTRE: Record<number, string> = {
  1: "T1 (janvier-février-mars)",
  2: "T2 (avril-mai-juin)",
  3: "T3 (juillet-août-septembre)",
  4: "T4 (octobre-novembre-décembre)",
};

function trimestreValide(v: number): 1 | 2 | 3 | 4 {
  return (v === 1 || v === 2 || v === 3 || v === 4 ? v : 1) as 1 | 2 | 3 | 4;
}

export default async function TgcaPage({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string; trimestre?: string }>;
}) {
  const { annee: anneeParam, trimestre: trimestreParam } = await searchParams;
  const maintenant = new Date();
  const annee = Number(anneeParam) || maintenant.getUTCFullYear();
  const trimestre = trimestreValide(Number(trimestreParam) || Math.floor(maintenant.getUTCMonth() / 3) + 1);

  const [recap, annees] = await Promise.all([getRecapTgcaTrimestre(annee, trimestre), getAnneesDisponibles()]);

  const ecart = recap.tgcaNette - recap.tgcaCalculee;

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">Déclaration TGCA trimestrielle</h1>
      <p className="mt-1 text-sm text-slate-500">
        TGCA de CAP SXM (pas celle des touristes) — à déclarer avant le 15 du mois suivant la fin du trimestre.
      </p>

      <form method="GET" className="mt-4 flex flex-wrap items-center gap-3">
        <label className="text-sm text-slate-700">
          Année
          <select name="annee" defaultValue={annee} className="ml-2 rounded border border-slate-300 px-2 py-1 text-sm">
            {annees.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-700">
          Trimestre
          <select name="trimestre" defaultValue={trimestre} className="ml-2 rounded border border-slate-300 px-2 py-1 text-sm">
            {[1, 2, 3, 4].map((t) => (
              <option key={t} value={t}>
                {NOMS_TRIMESTRE[t]}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded bg-slate-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-700">
          Afficher
        </button>
      </form>

      <div className="mt-6 rounded-lg border border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-700">
          {annee} — {NOMS_TRIMESTRE[trimestre]}
        </h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-slate-600">HT vente de matériel</dt>
            <dd className="font-mono text-slate-800">{EUR.format(recap.htVente)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-slate-600">HT hors vente (prestations diverses + gestion décompte, net des avoirs)</dt>
            <dd className="font-mono text-slate-800">{EUR.format(recap.htHorsVente)}</dd>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 pt-2 font-medium">
            <dt className="text-slate-700">Base HT totale</dt>
            <dd className="font-mono text-slate-800">{EUR.format(recap.htVente + recap.htHorsVente)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-slate-600">TGCA des factures (4%)</dt>
            <dd className="font-mono text-slate-800">{EUR.format(recap.tgcaFactures)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-slate-600">TGCA des avoirs (4%, à déduire)</dt>
            <dd className="font-mono text-slate-800">− {EUR.format(recap.tgcaAvoirs)}</dd>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 pt-2 font-semibold">
            <dt className="text-slate-800">TGCA nette à déclarer</dt>
            <dd className="font-mono text-emerald-700">{EUR.format(recap.tgcaNette)}</dd>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <dt>Contrôle : 4% de la base HT totale</dt>
            <dd className="font-mono">{EUR.format(recap.tgcaCalculee)}</dd>
          </div>
          {ecart !== 0 && (
            <p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              ⚠️ Écart de {EUR.format(Math.abs(ecart))} entre la TGCA nette et le contrôle 4% — vérifie les lignes du
              trimestre (export ci-dessous) avant de déclarer.
            </p>
          )}
        </dl>
      </div>

      <a
        href={`/api/export-trimestre?annee=${annee}&trimestre=${trimestre}`}
        className="mt-4 inline-block rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        📥 Export CSV du détail du trimestre
      </a>
    </div>
  );
}
