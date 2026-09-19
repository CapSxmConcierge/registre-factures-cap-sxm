import { genererModeleFactures } from "@/lib/import-excel";
import { estConnecte } from "@/lib/auth";

export async function GET() {
  if (!(await estConnecte())) return new Response("Non autorisé", { status: 401 });
  const buffer = await genererModeleFactures();
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=modele-import-factures.xlsx",
    },
  });
}
