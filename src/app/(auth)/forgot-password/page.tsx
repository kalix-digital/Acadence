import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/app/(auth)/forgot-password/forgot-password-form";
import { isSupabaseConfigured } from "@/config/env";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Enter the email address on your account and we will send a single-use reset
        link.
      </p>

      <div className="mt-7">
        <ForgotPasswordForm configured={isSupabaseConfigured} />
      </div>

      <Link
        href="/sign-in"
        className="mt-6 inline-block text-xs text-muted-foreground transition-colors hover:text-primary"
      >
        Back to sign in
      </Link>
    </div>
  );
}
