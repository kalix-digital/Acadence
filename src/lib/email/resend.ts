type InvitationEmailInput = {
  to: string;
  institutionName: string;
  roleLabel: string;
  inviterName: string;
  acceptUrl: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Sends the invitation email when RESEND_API_KEY is configured. A missing key
 * is not an error: the caller still returns the signed acceptance link so an
 * administrator can deliver it through another channel.
 */
export async function sendInvitationEmail(
  input: InvitationEmailInput,
): Promise<{ sent: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sent: false };

  const from = process.env.EMAIL_FROM ?? "Acadence <invitations@acadence.app>";
  const institution = escapeHtml(input.institutionName);
  const acceptUrl = escapeHtml(input.acceptUrl);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: `Your ${input.institutionName} invitation to Acadence`,
        text: [
          `${input.inviterName} invited you to ${input.institutionName} on Acadence as ${input.roleLabel}.`,
          "",
          `Accept the invitation: ${input.acceptUrl}`,
          "",
          "The link is single-use and expires soon. If you were not expecting it, ignore this email.",
        ].join("\n"),
        html: `
          <div style="font-family:ui-sans-serif,system-ui,sans-serif;line-height:1.6;color:#0f172a">
            <h1 style="font-size:20px;margin:0 0 12px">Join ${institution} on Acadence</h1>
            <p style="margin:0 0 8px">
              ${escapeHtml(input.inviterName)} invited you as
              <strong>${escapeHtml(input.roleLabel)}</strong>.
            </p>
            <p style="margin:0 0 20px">
              <a href="${acceptUrl}" style="background:#2563eb;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none;display:inline-block">
                Accept invitation
              </a>
            </p>
            <p style="margin:0;font-size:12px;color:#64748b">
              This link can be used once and expires soon. If you were not expecting it, ignore this email.
            </p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("[email] Resend rejected an invitation", response.status, detail);
      return { sent: false, error: "The email provider rejected the message." };
    }

    return { sent: true };
  } catch (error) {
    console.error("[email] invitation email failed", error);
    return { sent: false, error: "The email provider could not be reached." };
  }
}
