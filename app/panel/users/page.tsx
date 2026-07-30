import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { UsersManager } from "@/components/users-manager"

// Strona dostępna wyłącznie dla administratora.
export default async function UsersPage() {
  const user = await getSession()
  if (!user) redirect("/login")
  if (user.role !== "admin") redirect("/panel")

  return <UsersManager currentUserId={user.id} />
}
