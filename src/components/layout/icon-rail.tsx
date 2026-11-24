import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { iconRailItems } from "@/config/navigation";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { ShellIdentity } from "@/components/layout/dashboard-shell";

function initials(name: string) {
  return name
    .replace(/^(Dr\.|Prof\.|Mrs\.|Mr\.|Ms\.)\s+/, "")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function IconRail({ identity }: { identity: ShellIdentity }) {
  const items = iconRailItems.filter(
    (item) => !item.capability || identity.capabilities.includes(item.capability),
  );

  return (
    <aside className="hidden w-16 shrink-0 flex-col items-center gap-2 border-r border-sidebar-border bg-sidebar/80 py-5 lg:flex">
      <Link
        href="/institution"
        aria-label="Acadence home"
        className="mb-4 grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30"
      >
        <GraduationCap className="size-5" />
      </Link>

      <nav className="flex flex-1 flex-col items-center gap-1.5">
        {items.map((item, index) => {
          const Icon = item.icon;
          const active = index === 0;
          const planned = Boolean(item.phase);

          return (
            <Tooltip key={item.label}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  aria-disabled={planned || undefined}
                  className={cn(
                    "grid size-10 place-items-center rounded-xl text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    active && "bg-sidebar-accent text-primary ring-1 ring-primary/30",
                    planned && "text-sidebar-foreground/35",
                  )}
                >
                  <Icon className="size-5" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">
                {item.label}
                {planned ? ` · Phase ${item.phase}` : ""}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      <Tooltip>
        <TooltipTrigger asChild>
          <Avatar className="size-9 ring-1 ring-sidebar-border">
            <AvatarFallback className="bg-sidebar-accent text-xs text-sidebar-accent-foreground">
              {initials(identity.user.name)}
            </AvatarFallback>
          </Avatar>
        </TooltipTrigger>
        <TooltipContent side="right">
          {identity.user.name} · {identity.roleLabel}
        </TooltipContent>
      </Tooltip>
    </aside>
  );
}
