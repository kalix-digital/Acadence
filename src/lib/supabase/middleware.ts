import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, supabaseEnv } from "@/config/env";

/**
 * Refreshes the Supabase session cookie on every matched request and returns
 * the revalidated user. Never trusts a cookie's contents without asking Auth.
 */
export async function updateSession(request: NextRequest): Promise<{
  response: NextResponse;
  user: User | null;
}> {
  let response = NextResponse.next({ request });

  if (!isSupabaseConfigured) {
    return { response, user: null };
  }

  try {
    const supabase = createServerClient(
      supabaseEnv.url!,
      supabaseEnv.anonKey!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            );
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    return { response, user };
  } catch (error) {
    console.error("[auth] session refresh failed", error);
    return { response, user: null };
  }
}
