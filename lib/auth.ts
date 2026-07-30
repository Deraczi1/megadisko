import { cookies } from "next/headers"
import { SignJWT, jwtVerify } from "jose"
import bcrypt from "bcryptjs"
import { query } from "./db"

const COOKIE_NAME = "panel_session"
const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "zmien-ten-sekret-w-produkcji-1234567890")

import type { UserRole } from "./types"

export interface SessionUser {
  id: number
  email: string
  role: UserRole
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createSession(user: SessionUser): Promise<void> {
  const token = await new SignJWT({ id: user.id, email: user.email, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret)

  const store = await cookies()
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  })
}

export async function destroySession(): Promise<void> {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret)
    return {
      id: payload.id as number,
      email: payload.email as string,
      role: (payload.role as UserRole) || "user",
    }
  } catch {
    return null
  }
}

// Zwraca sesję tylko jeśli użytkownik jest administratorem.
export async function requireAdmin(): Promise<SessionUser | null> {
  const user = await getSession()
  return user && user.role === "admin" ? user : null
}

// Lista wszystkich użytkowników z liczbą przypisanych formularzy.
export async function listUsers() {
  return query<any[]>(
    `SELECT u.id, u.email, u.role, u.created_at,
            (SELECT COUNT(*) FROM forms f WHERE f.assigned_user_id = u.id) AS form_count
     FROM users u ORDER BY u.created_at ASC`,
  )
}

// Zmienia rolę użytkownika.
export async function setUserRole(id: number, role: UserRole) {
  await query("UPDATE users SET role = ? WHERE id = ?", [role, id])
}

// Liczy administratorów (do ochrony przed usunięciem ostatniego admina).
export async function countAdmins(): Promise<number> {
  const rows = await query<any[]>("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'")
  return rows[0].c as number
}

// Znajduje użytkownika po emailu.
export async function findUserByEmail(email: string) {
  const rows = await query<any[]>("SELECT * FROM users WHERE email = ? LIMIT 1", [email])
  return rows[0] || null
}

// Tworzy konto. Pierwszy zarejestrowany użytkownik zostaje administratorem.
export async function createUser(email: string, password: string): Promise<SessionUser> {
  const hash = await hashPassword(password)
  const existing = await query<any[]>("SELECT COUNT(*) AS c FROM users")
  const role: UserRole = existing[0].c === 0 ? "admin" : "user"
  const result = await query<any>("INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)", [
    email,
    hash,
    role,
  ])
  return { id: result.insertId, email, role }
}
