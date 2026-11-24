import type { Metadata } from "next";
import { SignInForm } from "@/app/(auth)/sign-in/sign-in-form";
import { isSupabaseConfigured } from "@/config/env";

export const metadata: Metadata = { title: "Sign in" };

function safeNext(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return "/institution";
  }
  return candidate;
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Sign in to Acadence</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Use the institutional account issued by your administrator.
      </p>

      {params.error === "link" && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          That link is invalid or has expired. Request a new one below.
        </p>
      )}

      <div className="mt-7">
        <SignInForm next={safeNext(params.next)} configured={isSupabaseConfigured} />
      </div>

      <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
        Your role and institution are assigned by an administrator. Signed in with
        no membership yet? Sign in and you will be guided to request access.
      </p>
    </div>
  );
}
