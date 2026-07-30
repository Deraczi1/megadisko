import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { sendTelegramMessage } from "@/lib/telegram"

// Endpoint webhooka Telegrama. Ustaw go raz komendą:
// https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://twoja-domena/api/telegram/webhook&secret_token=<SEKRET>
//
// Obsługiwane komendy w czacie z botem:
//   /polacz KOD   – łączy czat z formularzem (kod ważny 10 minut)
//   /start KOD    – to samo, przez link t.me/bot?start=KOD
//   /rozlacz      – odłącza ten czat od wszystkich formularzy
//   /pomoc        – pokazuje instrukcję

export async function POST(request: Request) {
  // Opcjonalna weryfikacja sekretu webhooka (jeśli ustawiony).
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET
  if (expected) {
    const got = request.headers.get("x-telegram-bot-api-secret-token")
    if (got !== expected) {
      return NextResponse.json({ ok: false }, { status: 401 })
    }
  }

  let update: any
  try {
    update = await request.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  const message = update.message || update.edited_message
  const chat = message?.chat
  const text: string = (message?.text || "").trim()
  if (!chat || !text) return NextResponse.json({ ok: true })

  const chatId = String(chat.id)
  const chatTitle: string = chat.title || [chat.first_name, chat.last_name].filter(Boolean).join(" ") || chat.username || ""

  // Rozbicie na komendę i argument (obsługa /polacz@NazwaBota).
  const [rawCmd, ...rest] = text.split(/\s+/)
  const cmd = rawCmd.split("@")[0].toLowerCase()
  const arg = rest.join(" ").trim()

  try {
    if (cmd === "/polacz" || (cmd === "/start" && arg)) {
      const code = arg.toUpperCase()
      if (!code) {
        await sendTelegramMessage(chatId, "Użyj: <b>/polacz KOD</b> — kod znajdziesz w panelu formularza.")
        return NextResponse.json({ ok: true })
      }

      const rows = await query<any[]>(
        "SELECT c.code, c.form_id, f.name AS form_name FROM telegram_codes c JOIN forms f ON f.id = c.form_id WHERE c.code = ? AND c.expires_at > NOW() LIMIT 1",
        [code],
      )
      const row = rows[0]
      if (!row) {
        await sendTelegramMessage(chatId, "❌ Kod jest nieprawidłowy lub wygasł. Wygeneruj nowy w panelu formularza.")
        return NextResponse.json({ ok: true })
      }

      await query(
        "INSERT INTO telegram_links (form_id, chat_id, chat_title) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE chat_title = VALUES(chat_title)",
        [row.form_id, chatId, chatTitle || null],
      )
      // Kod jest jednorazowy — usuwamy po użyciu.
      await query("DELETE FROM telegram_codes WHERE code = ?", [code])

      await sendTelegramMessage(
        chatId,
        `✅ Połączono z formularzem <b>${row.form_name}</b>.\nBędziesz tu otrzymywać powiadomienia o nowych zgłoszeniach.\n\nAby przerwać, wyślij <b>/rozlacz</b>.`,
      )
      return NextResponse.json({ ok: true })
    }

    if (cmd === "/rozlacz") {
      const res = await query<any>("DELETE FROM telegram_links WHERE chat_id = ?", [chatId])
      const count = res?.affectedRows ?? 0
      await sendTelegramMessage(
        chatId,
        count > 0
          ? "✅ Odłączono ten czat od powiadomień."
          : "Ten czat nie był połączony z żadnym formularzem.",
      )
      return NextResponse.json({ ok: true })
    }

    // /start bez argumentu, /pomoc oraz cokolwiek innego → instrukcja.
    await sendTelegramMessage(
      chatId,
      "👋 <b>Bot powiadomień o formularzach</b>\n\nAby połączyć ten czat z formularzem:\n1. Otwórz panel i wygeneruj kod przy formularzu.\n2. Wyślij tutaj: <b>/polacz KOD</b>\n\nKod jest ważny 10 minut.\nAby przerwać powiadomienia: <b>/rozlacz</b>",
    )
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.log("[v0] Błąd webhooka Telegram:", err?.message)
    // Zawsze zwracamy 200, by Telegram nie ponawiał w nieskończoność.
    return NextResponse.json({ ok: true })
  }
}
