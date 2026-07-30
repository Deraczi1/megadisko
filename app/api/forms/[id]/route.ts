import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { query } from "@/lib/db"

// Zwraca formularz jeśli użytkownik jest adminem lub jest do niego przypisany.
async function accessibleForm(user: { id: number; role: string }, id: string) {
  const rows = await query<any[]>("SELECT * FROM forms WHERE id = ? LIMIT 1", [id])
  const form = rows[0]
  if (!form) return null
  if (user.role === "admin" || form.assigned_user_id === user.id) return form
  return null
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 })
  const { id } = await params

  try {
    const form = await accessibleForm(user, id)
    if (!form) return NextResponse.json({ error: "Nie znaleziono." }, { status: 404 })
    form.config = typeof form.config === "string" ? JSON.parse(form.config) : form.config
    return NextResponse.json({ form })
  } catch (err: any) {
    console.log("[v0] Błąd pobierania formularza:", err?.message)
    return NextResponse.json({ error: "Błąd bazy danych." }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 })
  const { id } = await params

  try {
    // Administrator edytuje dowolny formularz; użytkownik tylko przypisany do niego.
    const form = await accessibleForm(user, id)
    if (!form) return NextResponse.json({ error: "Nie znaleziono." }, { status: 404 })

    const body = await request.json()
    const name: string = (body.name?.trim() || form.name).slice(0, 120)
    const config = body.config || (typeof form.config === "string" ? JSON.parse(form.config) : form.config)
    // Tylko administrator może zmieniać przypisanie formularza do innego użytkownika.
    // Dla zwykłego użytkownika przypisanie pozostaje bez zmian.
    const assignedUserId: number | null =
      user.role === "admin" && body.assigned_user_id !== undefined
        ? body.assigned_user_id
          ? Number(body.assigned_user_id)
          : null
        : form.assigned_user_id
    const notificationEmail: string | null =
      body.notification_email !== undefined ? body.notification_email?.trim() || null : form.notification_email

    await query(
      "UPDATE forms SET name = ?, assigned_user_id = ?, notification_email = ?, config = ? WHERE id = ?",
      [name, assignedUserId, notificationEmail, JSON.stringify(config), id],
    )
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.log("[v0] Błąd zapisu formularza:", err?.message)
    return NextResponse.json({ error: "Błąd bazy danych." }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 })
  // Tylko administrator może usuwać formularze.
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Tylko administrator może usuwać formularze." }, { status: 403 })
  }
  const { id } = await params

  try {
    await query("DELETE FROM forms WHERE id = ?", [id])
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.log("[v0] Błąd usuwania formularza:", err?.message)
    return NextResponse.json({ error: "Błąd bazy danych." }, { status: 500 })
  }
}
