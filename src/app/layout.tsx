import type { Metadata } from "next";
import "./globals.css";
import { estConnecte } from "@/lib/auth";
import DeconnexionBouton from "./DeconnexionBouton";
import NavLinks from "./NavLinks";

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
              <NavLinks />
              <DeconnexionBouton />
            </div>
          </header>
        )}
        <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
