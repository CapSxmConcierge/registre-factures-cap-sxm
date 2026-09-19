"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ONGLETS = [
  { href: "/factures", label: "Factures", couleur: "blue" as const },
  { href: "/avoirs", label: "Avoirs", couleur: "amber" as const },
  { href: "/tgca", label: "Déclaration TGCA", couleur: "purple" as const },
];

const STYLES = {
  blue: { actif: "bg-blue-600 text-white", inactif: "text-blue-700 hover:bg-blue-50" },
  amber: { actif: "bg-amber-600 text-white", inactif: "text-amber-700 hover:bg-amber-50" },
  purple: { actif: "bg-purple-600 text-white", inactif: "text-purple-700 hover:bg-purple-50" },
};

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-2 text-sm font-semibold">
      {ONGLETS.map(({ href, label, couleur }) => {
        const actif = pathname?.startsWith(href);
        const style = STYLES[couleur];
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-full px-3 py-1.5 transition-colors ${actif ? style.actif : style.inactif}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
