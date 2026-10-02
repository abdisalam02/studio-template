import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Only handle API requests for CORS
  if (request.nextUrl.pathname.startsWith("/api")) {
    // Handle preflight OPTIONS request
    if (request.method === "OPTIONS") {
      const response = new NextResponse(null, { status: 204 });
      response.headers.set("Access-Control-Allow-Origin", "*");
      response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
      response.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Requested-With, Accept, X-CSRF-Token"
      );
      response.headers.set("Access-Control-Max-Age", "86400");
      return response;
    }

    const response = NextResponse.next();
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With, Accept, X-CSRF-Token"
    );
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
