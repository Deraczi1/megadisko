import { NextResponse } from "next/server"
import { createSession, findUserByEmail, verifyPassword } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ error: "Podaj email i hasło." }, { status: 400 })
    }

    const user = await findUserByEmail(email)
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return NextResponse.json({ error: "Nieprawidłowy email lub hasło." }, { status: 401 })
    }

    const role = user.role === "admin" ? "admin" : "user"
    await createSession({ id: user.id, email: user.email, role })
    return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, role } })
  } catch (err: any) {
    console.log("[v0] Błąd logowania:", err?.message)
    return NextResponse.json({ error: "Błąd serwera lub bazy danych. Sprawdź połączenie z MySQL." }, { status: 500 })
  }
}
