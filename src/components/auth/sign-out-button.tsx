"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SignOutButton({
  className,
  variant = "outline",
}: {
  className?: string;
  variant?: "outline" | "ghost" | "default";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    try {
      await createClient().auth.signOut();
    } finally {
      router.replace("/sign-in");
      router.refresh();
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      onClick={signOut}
      disabled={pending}
      className={cn("gap-2", className)}
    >
      {pending ? <Loader2 className="animate-spin" /> : <LogOut />}
      Sign out
    </Button>
  );
}
