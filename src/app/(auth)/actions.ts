"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/config/env";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = {
  status: "idle" | "error" | "success";
  message?: string;
};

const CONFIG_MESSAGE =
  "Supabase is not configured for this environment. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then restart the app.";

/** Only allow same-origin relative paths as post-auth destinations. */
function safeNext(value: string | null | undefined) {
  if (!value) return "/institution";
  if (!value.startsWith("/") || value.startsWith("//")) return "/institution";
  if (value.startsWith("/sign-in") || value.startsWith("/forgot-password")) {
    return "/institution";
  }
  return value;
}

function originFromHeaders(host: string | null, protocol: string | null) {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (!host) return "http://localhost:3000";
  return `${protocol ?? "http"}://${host}`;
}

export async function signInAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!isSupabaseConfigured) {
    return { status: "error", message: CONFIG_MESSAGE };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? ""));

  if (!email || !password) {
    return { status: "error", message: "Enter your email address and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return {
      status: "error",
      message:
        error.message === "Email not confirmed"
          ? "Confirm your email address before signing in. Check your inbox for the verification link."
          : "Those credentials do not match an active account.",
    };
  }

  redirect(next);
}

export async function requestPasswordResetAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!isSupabaseConfigured) {
    return { status: "error", message: CONFIG_MESSAGE };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) {
    return { status: "error", message: "Enter the email address on your account." };
  }

  const headerStore = await headers();
  const origin = originFromHeaders(
    headerStore.get("host"),
    headerStore.get("x-forwarded-proto"),
  );

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  // Always report success so the form cannot be used to enumerate accounts.
  return {
    status: "success",
    message:
      "If an account exists for that address, a password reset link is on its way.",
  };
}

export async function updatePasswordAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!isSupabaseConfigured) {
    return { status: "error", message: CONFIG_MESSAGE };
  }

  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmPassword") ?? "");

  if (password.length < 10) {
    return {
      status: "error",
      message: "Use at least 10 characters for your new password.",
    };
  }
  if (password !== confirmation) {
    return { status: "error", message: "The passwords do not match." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      status: "error",
      message: "This reset link has expired. Request a new password reset email.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { status: "error", message: error.message };
  }

  redirect("/institution");
}
