import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { getSession } from "@/lib/auth"
import { query } from "@/lib/db"
import { defaultFormConfig, type FormConfig } from "@/lib/types"

// Slug publiczny = czytelny prefiks + pełny UUID.
// UUID gwarantuje, że adresy formularzy są nieodgadywalne i nie da się ich enumerować.
function makeSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 24)
  return `${base || "formularz"}-${randomUUID()}`
}

export async function GET() {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 })

  try {
    // Admin widzi wszystkie formularze; użytkownik tylko te przypisane do niego.
    const base = `
      SELECT f.id, f.name, f.slug, f.notification_email, f.config, f.created_at,
             f.assigned_user_id, u.email AS assigned_email
      FROM forms f
      LEFT JOIN users u ON u.id = f.assigned_user_id
    `
    const rows =
      user.role === "admin"
        ? await query<any[]>(`${base} ORDER BY f.created_at DESC`)
        : await query<any[]>(`${base} WHERE f.assigned_user_id = ? ORDER BY f.created_at DESC`, [user.id])

    const forms = rows.map((r) => ({
      ...r,
      config: typeof r.config === "string" ? JSON.parse(r.config) : r.config,
    }))
    return NextResponse.json({ forms })
  } catch (err: any) {
    console.log("[v0] Błąd pobierania formularzy:", err?.message)
    return NextResponse.json({ error: "Błąd bazy danych. Sprawdź połączenie z MySQL." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 })
  // Tylko administrator może tworzyć formularze.
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Tylko administrator może tworzyć formularze." }, { status: 403 })
  }

  try {
    const body = await request.json()
    const name: string = (body.name?.trim() || "Nowy formularz").slice(0, 120)
    const config: FormConfig = body.config || defaultFormConfig()
    const assignedUserId: number | null = body.assigned_user_id ? Number(body.assigned_user_id) : null
    const slug = makeSlug(name)

    // Email powiadomień domyślnie = email przypisanego użytkownika (można nadpisać).
    let notificationEmail: string | null = body.notification_email?.trim() || null
    if (!notificationEmail && assignedUserId) {
      const u = await query<any[]>("SELECT email FROM users WHERE id = ? LIMIT 1", [assignedUserId])
      notificationEmail = u[0]?.email || null
    }

    const result = await query<any>(
      "INSERT INTO forms (user_id, assigned_user_id, name, slug, notification_email, config) VALUES (?, ?, ?, ?, ?, ?)",
      [user.id, assignedUserId, name, slug, notificationEmail, JSON.stringify(config)],
    )
    return NextResponse.json({ id: result.insertId, slug })
  } catch (err: any) {
    console.log("[v0] Błąd tworzenia formularza:", err?.message)
    return NextResponse.json({ error: "Błąd bazy danych. Sprawdź połączenie z MySQL." }, { status: 500 })
  }
}
