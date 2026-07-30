import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { query } from "@/lib/db"
import { getBotUsername, telegramConfigured } from "@/lib/telegram"

// Zwraca formularz, jeśli użytkownik jest adminem lub jest do niego przypisany.
async function accessibleForm(user: { id: number; role: string }, id: string) {
  const rows = await query<any[]>("SELECT * FROM forms WHERE id = ? LIMIT 1", [id])
  const form = rows[0]
  if (!form) return null
  if (user.role === "admin" || form.assigned_user_id === user.id) return form
  return null
}

// Kod bez znaków łatwych do pomylenia (bez 0/O/1/I).
function makeCode(len = 6): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let out = ""
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)]
  return out
}

// GET → status Telegrama, nazwa bota i lista połączonych czatów.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 })
  const { id } = await params

  try {
    const form = await accessibleForm(user, id)
    if (!form) return NextResponse.json({ error: "Nie znaleziono." }, { status: 404 })

    const links = await query<any[]>(
      "SELECT chat_id, chat_title, created_at FROM telegram_links WHERE form_id = ? ORDER BY created_at ASC",
      [id],
    )
    const botUsername = await getBotUsername()
    return NextResponse.json({ configured: telegramConfigured(), botUsername, links })
  } catch (err: any) {
    console.log("[v0] Błąd pobierania Telegram:", err?.message)
    return NextResponse.json({ error: "Błąd bazy danych." }, { status: 500 })
  }
}

// POST → generuje nowy kod aktywacyjny ważny 10 minut.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 })
  const { id } = await params

  try {
    const form = await accessibleForm(user, id)
    if (!form) return NextResponse.json({ error: "Nie znaleziono." }, { status: 404 })
    if (!telegramConfigured()) {
      return NextResponse.json(
        { error: "Bot Telegram nie jest skonfigurowany. Ustaw zmienną TELEGRAM_BOT_TOKEN." },
        { status: 400 },
      )
    }

    // Sprzątanie wygasłych kodów.
    await query("DELETE FROM telegram_codes WHERE expires_at < NOW()")

    // Generujemy unikalny kod (kilka prób na wypadek kolizji).
    let code = makeCode()
    for (let i = 0; i < 5; i++) {
      const exists = await query<any[]>("SELECT code FROM telegram_codes WHERE code = ? LIMIT 1", [code])
      if (exists.length === 0) break
      code = makeCode()
    }

    await query("INSERT INTO telegram_codes (code, form_id, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))", [
      code,
      id,
    ])

    const botUsername = await getBotUsername()
    const deepLink = botUsername ? `https://t.me/${botUsername}?start=${code}` : null
    return NextResponse.json({ code, expiresInMinutes: 10, botUsername, deepLink })
  } catch (err: any) {
    console.log("[v0] Błąd generowania kodu Telegram:", err?.message)
    return NextResponse.json({ error: "Błąd bazy danych." }, { status: 500 })
  }
}

// DELETE ?chatId=... → odłącza wskazany czat od formularza.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 })
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const chatId = searchParams.get("chatId")
  if (!chatId) return NextResponse.json({ error: "Brak chatId." }, { status: 400 })

  try {
    const form = await accessibleForm(user, id)
    if (!form) return NextResponse.json({ error: "Nie znaleziono." }, { status: 404 })
    await query("DELETE FROM telegram_links WHERE form_id = ? AND chat_id = ?", [id, chatId])
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.log("[v0] Błąd odłączania Telegram:", err?.message)
    return NextResponse.json({ error: "Błąd bazy danych." }, { status: 500 })
  }
}
