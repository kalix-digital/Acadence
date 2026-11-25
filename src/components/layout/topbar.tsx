"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  ChevronRight,
  Loader2,
  LogOut,
  Menu,
  Plus,
  Search,
  UserRound,
  Building2,
  LifeBuoy,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarNav } from "@/components/layout/app-sidebar";
import { InstitutionSwitcher } from "@/components/layout/institution-switcher";
import { sectionsFor } from "@/config/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ShellIdentity } from "@/components/layout/dashboard-shell";

const notifications = [
  { title: "Timetable v3 published", detail: "Computer Science · 400 level", time: "12m" },
  { title: "Change request approved", detail: "MTH 201 · Tuesday 08:00", time: "48m" },
  { title: "Conflict detected", detail: "CSC 401 overlaps CSC 305", time: "2h" },
];

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

export function Topbar({ identity }: { identity: ShellIdentity }) {
  const router = useRouter();
  const variant = identity.variant ?? "institution";
  const homeHref = identity.homeHref ?? (variant === "platform" ? "/platform" : "/institution");
  const institutions = identity.institutions ?? [];
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await createClient().auth.signOut();
    } finally {
      router.replace("/sign-in");
      router.refresh();
    }
  }

  return (
    <header className="glass-panel sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/70 px-4 lg:px-6">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 bg-sidebar p-0">
          <SheetTitle className="sr-only">Acadence navigation</SheetTitle>
          <SidebarNav
            capabilities={identity.capabilities}
            roleLabel={identity.roleLabel}
            sections={sectionsFor(variant)}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <nav aria-label="Breadcrumb" className="hidden items-center gap-1.5 text-sm md:flex">
        <Link
          href={homeHref}
          className="max-w-[16rem] truncate text-muted-foreground transition-colors hover:text-foreground"
        >
          {variant === "platform" ? "Acadence platform" : identity.institutionName}
        </Link>
        <ChevronRight className="size-3.5 text-muted-foreground/50" />
        <span className="font-medium">
          {variant === "platform" ? "Overview" : "Dashboard"}
        </span>
      </nav>

      {variant === "institution" && institutions.length > 1 && (
        <InstitutionSwitcher
          institutions={institutions}
          activeId={identity.activeInstitutionId ?? null}
        />
      )}

      <div className="relative ml-auto w-full max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search courses, lecturers, rooms…"
          aria-label="Search Acadence"
          className="h-9 rounded-xl border-border/80 bg-card/70 pl-9 pr-14"
        />
        <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-md border border-border bg-muted/60 px-1.5 py-0.5 text-[0.65rem] text-muted-foreground sm:block">
          ⌘K
        </kbd>
      </div>

      <div className="flex items-center gap-1">
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
              <Bell />
              <span className="absolute right-2 top-2 size-1.5 rounded-full bg-destructive ring-2 ring-background" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel className="flex items-center justify-between">
              Notifications
              <Badge variant="secondary">{notifications.length} new</Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.map((item) => (
              <DropdownMenuItem key={item.title} className="flex-col items-start gap-0.5 py-2">
                <span className="text-sm font-medium">{item.title}</span>
                <span className="text-xs text-muted-foreground">{item.detail}</span>
                <span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground/70">
                  {item.time} ago
                </span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="#" className="justify-center text-xs text-muted-foreground">
                Notification centre ships in Phase 11
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="ml-1 flex items-center gap-2 rounded-xl p-1 pr-2 transition-colors hover:bg-accent"
              aria-label="Account menu"
            >
              <Avatar className="size-8 ring-1 ring-border">
                <AvatarFallback className="bg-primary/15 text-[0.7rem] font-medium text-primary">
                  {initials(identity.user.name)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-left leading-tight xl:block">
                <span className="block text-xs font-medium">{identity.user.name}</span>
                <span className="block text-[0.65rem] text-muted-foreground">
                  {identity.roleLabel}
                </span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <span className="block text-sm">{identity.user.name}</span>
              <span className="block truncate text-xs font-normal text-muted-foreground">
                {identity.user.email}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <UserRound /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={homeHref}>
                <Building2 /> {variant === "platform" ? "Platform home" : "Institution home"}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <LifeBuoy /> Support
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {identity.capabilities.includes("manage_members") && (
              <>
                <DropdownMenuItem>
                  <Plus /> Invite a colleague
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                void handleSignOut();
              }}
              disabled={signingOut}
            >
              {signingOut ? <Loader2 className="animate-spin" /> : <LogOut />}
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
