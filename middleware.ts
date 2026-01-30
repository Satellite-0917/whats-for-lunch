import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const CANONICAL_HOST = "whats-for-lunch-gamma.vercel.app";

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";

  // ✅ 이미 gamma면 통과
  if (host === CANONICAL_HOST) return NextResponse.next();

  // ✅ *.vercel.app 로 들어오면 gamma로 308 리다이렉트
  if (host.endsWith(".vercel.app")) {
    const url = req.nextUrl.clone();
    url.host = CANONICAL_HOST;
    url.protocol = "https:";
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
