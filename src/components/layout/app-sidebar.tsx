"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown, GraduationCap } from "lucide-react";
import { navigation, type NavSection } from "@/config/navigation";
import type { Capability } from "@/lib/auth/capabilities";
import { cn } from "@/lib/utils";

function NavSectionBlock({
  section,
  capabilities,
  onNavigate,
}: {
  section: NavSection;
  capabilities: Capability[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  const Chevron = ChevronDown;
  const items = section.items.filter(
    (item) => !item.capability || capabilities.includes(item.capability),
  );

  if (items.length === 0) return null;

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/45 transition-colors hover:text-sidebar-foreground/80"
      >
        {section.label}
        <Chevron
          className={cn("size-3.5 transition-transform", !open && "-rotate-90")}
        />
      </button>

      {open && (
        <ul className="space-y-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            const active = item.href === pathname;
            const planned = Boolean(item.phase);

            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  aria-disabled={planned || undefined}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors",
                    active
                      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-[inset_2px_0_0_0_var(--primary)]"
                      : "hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
                    planned && "text-sidebar-foreground/45",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4 shrink-0",
                      active ? "text-primary" : "text-sidebar-foreground/50",
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                  {planned && (
                    <span className="ml-auto rounded-md border border-sidebar-border px-1.5 py-0.5 text-[0.6rem] uppercase tracking-wide text-sidebar-foreground/40">
                      P{item.phase}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function SidebarNav({
  capabilities,
  roleLabel,
  onNavigate,
}: {
  capabilities: Capability[];
  roleLabel: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-4 py-5">
        <span className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
          <GraduationCap className="size-5" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight text-sidebar-foreground">
            Acadence
          </p>
          <p className="text-[0.7rem] text-sidebar-foreground/50">
            Academic operations
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-2 pb-4">
        {navigation.map((section) => (
          <NavSectionBlock
            key={section.id}
            section={section}
            capabilities={capabilities}
            onNavigate={onNavigate}
          />
        ))}
      </div>

      <div className="m-3 rounded-xl border border-sidebar-border bg-sidebar-accent/60 p-3">
        <p className="text-xs font-medium text-sidebar-foreground">{roleLabel}</p>
        <p className="mt-1 text-[0.7rem] leading-relaxed text-sidebar-foreground/55">
          Navigation is limited to your role. Entries marked P# ship in a later
          implementation phase.
        </p>
      </div>
    </div>
  );
}
