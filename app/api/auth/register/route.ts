import { NextResponse } from "next/server"
import { createSession, createUser, findUserByEmail } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ error: "Podaj email i hasło." }, { status: 400 })
    }
    if (String(password).length < 6) {
      return NextResponse.json({ error: "Hasło musi mieć co najmniej 6 znaków." }, { status: 400 })
    }

    const existing = await findUserByEmail(email)
    if (existing) {
      return NextResponse.json({ error: "Konto z tym adresem już istnieje." }, { status: 409 })
    }

    const user = await createUser(email, password)
    await createSession(user)
    return NextResponse.json({ ok: true, user })
  } catch (err: any) {
    console.log("[v0] Błąd rejestracji:", err?.message)
    return NextResponse.json({ error: "Błąd serwera lub bazy danych. Sprawdź połączenie z MySQL." }, { status: 500 })
  }
}
