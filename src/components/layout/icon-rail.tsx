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
import { ACTIVE_CONTEXT } from "@/config/site";

function initials(name: string) {
  return name
    .replace(/^(Dr\.|Prof\.|Mrs\.|Mr\.)\s+/, "")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
}

export function IconRail() {
  return (
    <aside className="hidden w-16 shrink-0 flex-col items-center gap-2 border-r border-sidebar-border bg-sidebar/80 py-5 lg:flex">
      <Link
        href="/"
        aria-label="Acadence home"
        className="mb-4 grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30"
      >
        <GraduationCap className="size-5" />
      </Link>

      <nav className="flex flex-1 flex-col items-center gap-1.5">
        {iconRailItems.map((item, index) => {
          const Icon = item.icon;
          const active = index === 0;

          return (
            <Tooltip key={item.label}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "grid size-10 place-items-center rounded-xl text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    active && "bg-sidebar-accent text-primary ring-1 ring-primary/30",
                  )}
                >
                  <Icon className="size-5" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      <Tooltip>
        <TooltipTrigger asChild>
          <Avatar className="size-9 ring-1 ring-sidebar-border">
            <AvatarFallback className="bg-sidebar-accent text-xs text-sidebar-accent-foreground">
              {initials(ACTIVE_CONTEXT.user.name)}
            </AvatarFallback>
          </Avatar>
        </TooltipTrigger>
        <TooltipContent side="right">{ACTIVE_CONTEXT.user.name}</TooltipContent>
      </Tooltip>
    </aside>
  );
}
