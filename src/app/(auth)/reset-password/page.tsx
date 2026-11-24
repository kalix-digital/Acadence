import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/app/(auth)/reset-password/reset-password-form";
import { isSupabaseConfigured } from "@/config/env";

export const metadata: Metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Your reset link signs you in for this change only. After updating, you will
        be taken to your dashboard.
      </p>

      <div className="mt-7">
        <ResetPasswordForm configured={isSupabaseConfigured} />
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
