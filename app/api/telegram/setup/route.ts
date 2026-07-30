import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { getBotUsername, getWebhookInfo, setWebhook, telegramConfigured } from "@/lib/telegram"

// Buduje bazowy adres publiczny aplikacji na podstawie żądania.
// Preferuje nagłówki proxy (Vercel), z fallbackiem do URL żądania.
function publicOrigin(request: Request): string {
  const proto = request.headers.get("x-forwarded-proto") || "https"
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host")
  if (host) return `${proto}://${host}`
  return new URL(request.url).origin
}

// GET → diagnostyka: czy token ustawiony, nazwa bota, aktualny stan webhooka
// oraz jaki adres webhooka powinien być zarejestrowany dla tego wdrożenia.
export async function GET(request: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Tylko administrator." }, { status: 403 })

  const configured = telegramConfigured()
  const expectedUrl = `${publicOrigin(request)}/api/telegram/webhook`
  if (!configured) {
    return NextResponse.json({ configured: false, expectedUrl, botUsername: null, webhook: null })
  }

  const [botUsername, webhook] = await Promise.all([getBotUsername(), getWebhookInfo()])
  const registered = Boolean(webhook?.url)
  const matches = webhook?.url === expectedUrl
  return NextResponse.json({ configured: true, botUsername, webhook, expectedUrl, registered, matches })
}

// POST → rejestruje webhook dla bieżącego wdrożenia.
export async function POST(request: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Tylko administrator." }, { status: 403 })

  if (!telegramConfigured()) {
    return NextResponse.json(
      { error: "Ustaw najpierw zmienną TELEGRAM_BOT_TOKEN." },
      { status: 400 },
    )
  }

  const expectedUrl = `${publicOrigin(request)}/api/telegram/webhook`
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET || undefined
  const ok = await setWebhook(expectedUrl, secret)
  if (!ok) {
    return NextResponse.json({ error: "Telegram odrzucił rejestrację webhooka. Sprawdź token." }, { status: 400 })
  }
  const webhook = await getWebhookInfo()
  return NextResponse.json({ ok: true, expectedUrl, webhook })
}
