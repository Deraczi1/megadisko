import { NextResponse } from "next/server"
import { requireAdmin, listUsers, setUserRole, countAdmins } from "@/lib/auth"

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Brak uprawnień administratora." }, { status: 403 })

  try {
    const users = await listUsers()
    return NextResponse.json({ users })
  } catch (err: any) {
    console.log("[v0] Błąd pobierania użytkowników:", err?.message)
    return NextResponse.json({ error: "Błąd bazy danych. Sprawdź połączenie z MySQL." }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Brak uprawnień administratora." }, { status: 403 })

  try {
    const { id, role } = await request.json()
    if (role !== "admin" && role !== "user") {
      return NextResponse.json({ error: "Nieprawidłowa rola." }, { status: 400 })
    }

    // Nie pozwól odebrać uprawnień ostatniemu administratorowi.
    if (role === "user" && (await countAdmins()) <= 1) {
      return NextResponse.json({ error: "Musi pozostać co najmniej jeden administrator." }, { status: 400 })
    }

    await setUserRole(Number(id), role)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.log("[v0] Błąd zmiany roli:", err?.message)
    return NextResponse.json({ error: "Błąd bazy danych." }, { status: 500 })
  }
}
