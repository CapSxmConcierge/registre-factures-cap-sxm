import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { estConnecte } from "@/lib/auth";
import DeconnexionBouton from "./DeconnexionBouton";

export const metadata: Metadata = {
  title: "Registre Factures/Avoirs — CAP SXM",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const connecte = await estConnecte();

  return (
    <html lang="fr">
      <body>
        {connecte && (
          <header className="border-b border-slate-200 bg-slate-50">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
              <nav className="flex gap-4 text-sm font-medium text-slate-700">
                <Link href="/factures" className="hover:text-slate-900">
                  Factures
                </Link>
                <Link href="/avoirs" className="hover:text-slate-900">
                  Avoirs
                </Link>
                <Link href="/tgca" className="hover:text-slate-900">
                  Déclaration TGCA
                </Link>
              </nav>
              <DeconnexionBouton />
            </div>
          </header>
        )}
        <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
