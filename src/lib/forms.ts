export type FormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Single-use acceptance link, returned once after an invitation is created. */
  inviteUrl?: string;
  emailed?: boolean;
};

export const IDLE_FORM_STATE: FormState = { status: "idle" };
