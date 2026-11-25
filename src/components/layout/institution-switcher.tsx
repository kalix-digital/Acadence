"use client";

import { Building2, Check, ChevronDown } from "lucide-react";
import { switchInstitutionAction } from "@/app/actions/switch-institution";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Shown only when the signed-in user belongs to more than one institution.
 * Submitting the form runs a server action that re-validates the membership
 * before storing the choice in an http-only cookie.
 */
export function InstitutionSwitcher({
  institutions,
  activeId,
}: {
  institutions: { id: string; name: string }[];
  activeId: string | null;
}) {
  const active =
    institutions.find((institution) => institution.id === activeId) ??
    institutions[0] ??
    null;

  if (!active) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="hidden h-8 max-w-56 gap-1.5 text-xs text-muted-foreground xl:inline-flex"
        >
          <Building2 className="size-3.5" />
          <span className="truncate">{active.name}</span>
          <ChevronDown className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Active institution</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {institutions.map((institution) => (
          <form key={institution.id} action={switchInstitutionAction}>
            <input
              type="hidden"
              name="institutionId"
              value={institution.id}
            />
            <DropdownMenuItem asChild>
              <button type="submit" className="w-full justify-between">
                <span className="truncate">{institution.name}</span>
                {institution.id === active.id && (
                  <Check className="size-3.5 text-primary" />
                )}
              </button>
            </DropdownMenuItem>
          </form>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
