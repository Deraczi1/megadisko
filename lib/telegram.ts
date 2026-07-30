import type { FormConfig, SubmissionRecord } from "./types"

// Token bota z BotFather. Bez niego funkcje Telegram są nieaktywne (analogicznie do SMTP).
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ""

export function telegramConfigured(): boolean {
  return Boolean(BOT_TOKEN)
}

const API_BASE = BOT_TOKEN ? `https://api.telegram.org/bot${BOT_TOKEN}` : ""

// Wywołanie metody Telegram Bot API.
async function tgApi<T = any>(method: string, body: Record<string, unknown>): Promise<T | null> {
  if (!BOT_TOKEN) {
    console.log("[v0] Pominięto Telegram — brak TELEGRAM_BOT_TOKEN")
    return null
  }
  try {
    const res = await fetch(`${API_BASE}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!data.ok) {
      console.log(`[v0] Telegram ${method} błąd:`, data.description)
      return null
    }
    return data.result as T
  } catch (err: any) {
    console.log(`[v0] Telegram ${method} wyjątek:`, err?.message)
    return null
  }
}

// Nazwa bota (np. do budowania linku t.me/nazwa_bota). Cache w pamięci procesu.
let cachedUsername: string | null = null
export async function getBotUsername(): Promise<string | null> {
  if (!BOT_TOKEN) return null
  if (cachedUsername) return cachedUsername
  const me = await tgApi<{ username: string }>("getMe", {})
  cachedUsername = me?.username || null
  return cachedUsername
}

// Informacje o aktualnie ustawionym webhooku (diagnostyka).
export interface WebhookInfo {
  url: string
  pending_update_count: number
  last_error_message?: string
  last_error_date?: number
}
export async function getWebhookInfo(): Promise<WebhookInfo | null> {
  return tgApi<WebhookInfo>("getWebhookInfo", {})
}

// Rejestruje adres webhooka w Telegramie. Zwraca true przy sukcesie.
export async function setWebhook(url: string, secretToken?: string): Promise<boolean> {
  const body: Record<string, unknown> = { url, allowed_updates: ["message", "edited_message"] }
  if (secretToken) body.secret_token = secretToken
  const res = await tgApi<boolean>("setWebhook", body)
  return res === true
}

export async function sendTelegramMessage(chatId: string, text: string): Promise<void> {
  await tgApi("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  })
}

// Escapowanie znaków specjalnych HTML w treści od użytkownika.
function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

interface NotificationArgs {
  chatIds: string[]
  formName: string
  config: FormConfig
  submission: Pick<SubmissionRecord, "name" | "email" | "phone" | "select_value" | "description" | "created_at">
}

// Wysyła powiadomienie o nowym zgłoszeniu do wszystkich połączonych czatów.
export async function sendTelegramNotification({ chatIds, formName, config, submission }: NotificationArgs): Promise<void> {
  if (!BOT_TOKEN || chatIds.length === 0) return

  const rows: Array<[string, string | null]> = [
    [config.fields.name.label, submission.name],
    [config.fields.email.label, submission.email],
    [config.fields.phone.label, submission.phone],
    [config.fields.select.label, submission.select_value],
    [config.fields.description.label, submission.description],
  ].filter(([, value]) => value) as Array<[string, string | null]>

  const when = new Date(submission.created_at).toLocaleString("pl-PL")
  const lines = [
    `🔔 <b>Nowe zgłoszenie</b>`,
    `Formularz: <b>${esc(formName)}</b>`,
    "",
    ...rows.map(([label, value]) => `<b>${esc(label)}:</b> ${esc(value)}`),
    "",
    `🕒 ${esc(when)}`,
  ]
  const text = lines.join("\n")

  await Promise.all(chatIds.map((id) => sendTelegramMessage(id, text)))
}
