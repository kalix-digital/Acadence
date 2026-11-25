import { headers } from "next/headers";

/**
 * Absolute origin for links that leave the app (invitation emails). The site
 * URL wins when configured; otherwise the request host is used so previews and
 * local development generate working links. Never derived from user input.
 */
export async function requestOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");

  const headerStore = await headers();
  const host = headerStore.get("host");
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";

  return host ? `${protocol}://${host}` : "http://localhost:3000";
}
