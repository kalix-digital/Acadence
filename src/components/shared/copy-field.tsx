"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** The acceptance link is shown once; the token cannot be recovered later. */
export function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex gap-2">
      <Input readOnly value={value} className="h-9 font-mono text-xs" />
      <Button type="button" variant="outline" size="sm" onClick={copy} className="shrink-0">
        {copied ? <Check /> : <Copy />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}
