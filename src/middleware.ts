import { NextResponse, type NextRequest } from "next/server";
import { NOM_COOKIE_SESSION, verifierJeton } from "@/lib/auth";

/** Protège toutes les pages sauf /login — voir src/lib/auth.ts. */
export async function middleware(request: NextRequest) {
  const jeton = request.cookies.get(NOM_COOKIE_SESSION)?.value;
  if (await verifierJeton(jeton)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("suite", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico).*)"],
};
