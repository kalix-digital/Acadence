"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SubmitButton({
  children,
  pendingLabel,
  className,
  variant,
  size,
  disabled,
  name,
  value,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
  size?: "default" | "sm" | "xs" | "lg" | "icon";
  disabled?: boolean;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      name={name}
      value={value}
      disabled={pending || disabled}
      className={cn("gap-2", className)}
    >
      {pending && <Loader2 className="animate-spin" />}
      {pending ? pendingLabel ?? "Saving…" : children}
    </Button>
  );
}
