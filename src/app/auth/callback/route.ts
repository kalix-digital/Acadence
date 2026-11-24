import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/config/env";
import { createClient } from "@/lib/supabase/server";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/institution";
  }
  return value;
}

/** PKCE callback for email links and OAuth-style redirects. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code && isSupabaseConfigured) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
    console.error("[auth] code exchange failed", error.message);
  }

  const failure = new URL("/sign-in", origin);
  failure.searchParams.set("error", "link");
  return NextResponse.redirect(failure);
}
