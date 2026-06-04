import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isBlockedUserAgent } from "@/lib/security/user-agent";
import { isAllowedReferer } from "@/lib/security/referer";

export async function middleware(request: NextRequest) {
  // Guarda do proxy de imagem — curto-circuita antes de tocar o Supabase Auth
  if (request.nextUrl.pathname === "/api/img") {
    const ua = request.headers.get("user-agent");
    const referer = request.headers.get("referer");
    if (isBlockedUserAgent(ua) || !isAllowedReferer(referer)) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && request.nextUrl.pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && request.nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/admin/:path*", "/login", "/api/img"],
};
