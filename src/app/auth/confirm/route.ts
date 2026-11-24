import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/config/env";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_TYPES: EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

/**
 * Token-hash verification for server-rendered email templates
 * (`/auth/confirm?token_hash=…&type=recovery&next=/reset-password`).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next");
  const next =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/institution";

  if (tokenHash && type && ALLOWED_TYPES.includes(type) && isSupabaseConfigured) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
    console.error("[auth] otp verification failed", error.message);
  }

  const failure = new URL("/sign-in", origin);
  failure.searchParams.set("error", "link");
  return NextResponse.redirect(failure);
}
