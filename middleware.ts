import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  // Lightweight middleware — auth guards are handled client-side by AuthProvider.
  // This middleware can be extended for server-side redirects if needed.
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
