import nodemailer from "nodemailer"
import type { FormConfig, SubmissionRecord } from "./types"

function getTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number.parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

interface NotificationArgs {
  to: string
  formName: string
  config: FormConfig
  submission: Pick<SubmissionRecord, "name" | "email" | "phone" | "select_value" | "description" | "created_at">
}

// Wysyła powiadomienie email o nowym zgłoszeniu.
export async function sendNotificationEmail({ to, formName, config, submission }: NotificationArgs): Promise<void> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log("[v0] Pominięto wysyłkę email — brak konfiguracji SMTP_USER/SMTP_PASS")
    return
  }

  const rows: Array<[string, string | null]> = [
    [config.fields.name.label, submission.name],
    [config.fields.email.label, submission.email],
    [config.fields.phone.label, submission.phone],
    [config.fields.select.label, submission.select_value],
    [config.fields.description.label, submission.description],
  ].filter(([, value]) => value) as Array<[string, string | null]>

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color: #111;">Nowe powiadomienie — odpisz jak najszybciej</h2>
      <p style="color: #555;">Otrzymano nowe zgłoszenie z formularza <strong>${formName}</strong>.</p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
        ${rows
          .map(
            ([label, value]) => `
          <tr>
            <td style="padding: 8px 12px; border: 1px solid #eee; background: #fafafa; font-weight: 600; width: 40%;">${label}</td>
            <td style="padding: 8px 12px; border: 1px solid #eee;">${String(value).replace(/</g, "&lt;")}</td>
          </tr>`,
          )
          .join("")}
      </table>
      <p style="color: #999; font-size: 12px; margin-top: 16px;">Wysłano: ${new Date(submission.created_at).toLocaleString("pl-PL")}</p>
    </div>
  `

  await getTransport().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: `Nowe powiadomienie — ${formName}`,
    html,
  })
}
