import { NextResponse } from "next/server"
import { query } from "@/lib/db"

// Publiczny endpoint zwracający konfigurację formularza (bez danych wrażliwych).
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  try {
    const rows = await query<any[]>("SELECT name, slug, config FROM forms WHERE slug = ? LIMIT 1", [slug])
    if (!rows[0]) return NextResponse.json({ error: "Nie znaleziono formularza." }, { status: 404 })
    const form = rows[0]
    form.config = typeof form.config === "string" ? JSON.parse(form.config) : form.config
    return NextResponse.json({ form })
  } catch (err: any) {
    console.log("[v0] Błąd pobierania konfiguracji publicznej:", err?.message)
    return NextResponse.json({ error: "Błąd bazy danych." }, { status: 500 })
  }
}
