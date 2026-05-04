/**
 * Pre-shipment notices (BRD §4.5). Resend when RESEND_API_KEY is set; otherwise logs.
 */

export interface PreShipmentPayload {
  to: string;
  shipmentId: string;
  scheduledShipAt: Date;
  bundleSku: string;
  manageUrl: string;
}

export async function sendPreShipmentNotification(
  p: PreShipmentPayload
): Promise<{ ok: boolean; channel: "resend" | "log" }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? "HealthBenefits <onboarding@resend.dev>";

  const subject = `Upcoming bundle shipment — ${p.bundleSku}`;
  const text = [
    `Your OTC bundle is scheduled to ship on ${p.scheduledShipAt.toISOString().slice(0, 10)}.`,
    `Review, modify, or skip: ${p.manageUrl}`,
    "",
    "This is an automated benefit reminder—not medical advice.",
  ].join("\n");

  if (apiKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [p.to],
        subject,
        text,
      }),
    });
    if (!res.ok) {
      console.error("Resend error", await res.text());
      return { ok: false, channel: "resend" };
    }
    return { ok: true, channel: "resend" };
  }

  console.info("[pre-shipment notify — dev]", { to: p.to, subject, text });
  return { ok: true, channel: "log" };
}
