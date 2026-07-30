import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { sendNotificationEmail } from "@/lib/mailer"
import { sendTelegramNotification } from "@/lib/telegram"
import type { FormConfig } from "@/lib/types"

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  try {
    const rows = await query<any[]>("SELECT * FROM forms WHERE slug = ? LIMIT 1", [slug])
    const form = rows[0]
    if (!form) return NextResponse.json({ error: "Nie znaleziono formularza." }, { status: 404 })

    const config: FormConfig = typeof form.config === "string" ? JSON.parse(form.config) : form.config
    const body = await request.json()

    // Sanityzacja: przycięcie i ograniczenie długości, by zapobiec nadużyciom i przepełnieniu.
    const clean = (v: unknown, max: number): string | null => {
      if (typeof v !== "string") return null
      const t = v.trim().slice(0, max)
      return t.length ? t : null
    }

    // Zbierz tylko włączone pola.
    const name = config.fields.name.enabled ? clean(body.name, 200) : null
    const email = config.fields.email.enabled ? clean(body.email, 200) : null
    const phone = config.fields.phone.enabled ? clean(body.phone, 40) : null
    const selectValue = config.fields.select.enabled ? clean(body.select, 200) : null
    const description = config.fields.description.enabled ? clean(body.description, 5000) : null

    // Reguła: zawsze wymagany email LUB numer telefonu.
    if (!email && !phone) {
      return NextResponse.json({ error: "Podaj adres email lub numer telefonu." }, { status: 400 })
    }

    // Podstawowa walidacja formatu emaila (jeśli podano).
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Podaj poprawny adres email." }, { status: 400 })
    }

    // Ogranicz wartość listy wyboru do zdefiniowanych opcji (ochrona przed podszywaniem).
    if (selectValue && config.fields.select.enabled) {
      const allowed = config.fields.select.options.map((o) => o.trim()).filter(Boolean)
      if (allowed.length && !allowed.includes(selectValue)) {
        return NextResponse.json({ error: "Nieprawidłowa wartość pola wyboru." }, { status: 400 })
      }
    }

    // Walidacja pól wymaganych.
    const requiredChecks: Array<[boolean, boolean, any, string]> = [
      [config.fields.name.enabled, config.fields.name.required, name, config.fields.name.label],
      [config.fields.email.enabled, config.fields.email.required, email, config.fields.email.label],
      [config.fields.phone.enabled, config.fields.phone.required, phone, config.fields.phone.label],
      [config.fields.select.enabled, config.fields.select.required, selectValue, config.fields.select.label],
      [config.fields.description.enabled, config.fields.description.required, description, config.fields.description.label],
    ]
    for (const [enabled, required, value, label] of requiredChecks) {
      if (enabled && required && !value) {
        return NextResponse.json({ error: `Pole "${label}" jest wymagane.` }, { status: 400 })
      }
    }

    const result = await query<any>(
      "INSERT INTO submissions (form_id, name, email, phone, select_value, description) VALUES (?, ?, ?, ?, ?, ?)",
      [form.id, name, email, phone, selectValue, description],
    )

    const submissionData = {
      name,
      email,
      phone,
      select_value: selectValue,
      description,
      created_at: new Date().toISOString(),
    }

    // Wyślij powiadomienie email, jeśli formularz ma przypisany adres.
    if (form.notification_email) {
      try {
        await sendNotificationEmail({
          to: form.notification_email,
          formName: form.name,
          config,
          submission: submissionData,
        })
      } catch (mailErr: any) {
        console.log("[v0] Nie udało się wysłać emaila:", mailErr?.message)
      }
    }

    // Wyślij powiadomienie na wszystkie połączone czaty Telegram.
    try {
      const links = await query<any[]>("SELECT chat_id FROM telegram_links WHERE form_id = ?", [form.id])
      if (links.length > 0) {
        await sendTelegramNotification({
          chatIds: links.map((l) => String(l.chat_id)),
          formName: form.name,
          config,
          submission: submissionData,
        })
      }
    } catch (tgErr: any) {
      console.log("[v0] Nie udało się wysłać powiadomienia Telegram:", tgErr?.message)
    }

    return NextResponse.json({ ok: true, id: result.insertId })
  } catch (err: any) {
    console.log("[v0] Błąd zapisu zgłoszenia:", err?.message)
    return NextResponse.json({ error: "Błąd serwera lub bazy danych." }, { status: 500 })
  }
}
