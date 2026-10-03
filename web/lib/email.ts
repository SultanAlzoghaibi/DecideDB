// Sends email through Resend's HTTP API (https://resend.com/docs/api-reference/emails/send-email).
// No SDK dependency: it's one POST request.
//
// Env: RESEND_API_KEY (secret) and EMAIL_FROM. Until you verify a domain in Resend,
// EMAIL_FROM must be "…<onboarding@resend.dev>" and Resend only delivers to your own address.
// Without RESEND_API_KEY in development, emails are printed to the server terminal instead.

type Email = { to: string; subject: string; text: string; html: string };

export async function sendEmail({ to, subject, text, html }: Email): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY is not set, so DecisionDB can't send email.");
    }
    console.log(`\n[email: dev, not sent] to ${to}\n  subject: ${subject}\n  ${text}\n`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "DecisionDB <onboarding@resend.dev>",
      to: [to],
      subject,
      text,
      html,
    }),
  });
  if (!res.ok) {
    // Resend explains the problem in the body (bad key, unverified domain, ...).
    throw new Error(`Resend error ${res.status}: ${await res.text()}`);
  }
}

// The 4-digit sign-up code email. Inline styles only: most email apps ignore <style>.
export function verificationCodeEmail(code: string): Omit<Email, "to"> {
  return {
    subject: `${code} is your DecisionDB code`,
    text: `Your DecisionDB verification code is ${code}. It expires in 10 minutes. If you didn't sign up, ignore this email.`,
    html: `<div style="font-family:Inter,system-ui,sans-serif;max-width:420px;margin:0 auto;padding:32px 24px;color:#08090a">
  <p style="margin:0 0 16px;font-size:15px">Your DecisionDB verification code:</p>
  <p style="margin:0 0 16px;font-size:36px;font-weight:600;letter-spacing:8px;font-family:'JetBrains Mono',ui-monospace,monospace">${code}</p>
  <p style="margin:0;font-size:13px;color:#62666d">It expires in 10 minutes. If you didn't sign up for DecisionDB, you can ignore this email.</p>
</div>`,
  };
}
