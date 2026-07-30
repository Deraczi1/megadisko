import type React from "react"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { PanelNav } from "@/components/panel-nav"

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession()
  if (!user) redirect("/login")

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <PanelNav email={user.email} role={user.role} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  )
}
