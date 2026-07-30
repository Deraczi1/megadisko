import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { query } from "@/lib/db"

export async function GET(request: Request) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const formId = searchParams.get("formId")

  try {
    // Admin widzi zgłoszenia ze wszystkich formularzy.
    // Zwykły użytkownik widzi tylko zgłoszenia z formularzy przypisanych do niego.
    const isAdmin = user.role === "admin"
    const conditions: string[] = []
    const params: any[] = []

    if (!isAdmin) {
      conditions.push("f.assigned_user_id = ?")
      params.push(user.id)
    }
    if (formId) {
      conditions.push("s.form_id = ?")
      params.push(formId)
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""
    const rows = await query<any[]>(
      `SELECT s.*, f.name AS form_name
       FROM submissions s
       JOIN forms f ON f.id = s.form_id
       ${where}
       ORDER BY s.created_at DESC`,
      params,
    )

    return NextResponse.json({ submissions: rows })
  } catch (err: any) {
    console.log("[v0] Błąd pobierania zgłoszeń:", err?.message)
    return NextResponse.json({ error: "Błąd bazy danych. Sprawdź połączenie z MySQL." }, { status: 500 })
  }
}
