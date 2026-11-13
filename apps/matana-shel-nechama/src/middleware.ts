import { NextResponse, type NextRequest } from "next/server";

// הגנה ראשונית בלבד (קיום עוגיית סשן). אימות אמיתי והרשאות נבדקים בשרת בכל עמוד.
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const protectedPrefix = ["/wallet", "/provider", "/admin"].some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (protectedPrefix && !req.cookies.get("mn_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith("/dev") && process.env.APP_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }
  return NextResponse.next();
}
export const config = { matcher: ["/wallet/:path*", "/provider/:path*", "/admin/:path*", "/dev/:path*"] };
