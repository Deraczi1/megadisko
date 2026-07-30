"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { LayoutGrid, Inbox, LogOut, Users, ShieldCheck } from "lucide-react"
import type { UserRole } from "@/lib/types"

export function PanelNav({ email, role }: { email: string; role: UserRole }) {
  const pathname = usePathname()
  const router = useRouter()

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" })
    toast.success("Wylogowano.")
    router.push("/login")
    router.refresh()
  }

  const links = [
    { href: "/panel", label: "Formularze", icon: LayoutGrid },
    { href: "/panel/contact", label: "Kontakt", icon: Inbox },
    // Zarządzanie użytkownikami widoczne tylko dla administratora.
    ...(role === "admin" ? [{ href: "/panel/users", label: "Użytkownicy", icon: Users }] : []),
  ]

  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-2 font-semibold">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <LayoutGrid className="size-4" />
            </span>
            <span className="hidden md:inline">Panel formularzy</span>
          </div>
          <nav className="flex items-center gap-1">
            {links.map((link) => {
              const active = pathname === link.href
              const Icon = link.icon
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium transition-colors sm:px-3",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="hidden sm:inline">{link.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {role === "admin" && (
            <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
              <ShieldCheck className="size-3" />
              Admin
            </span>
          )}
          <span className="hidden max-w-[160px] truncate text-sm text-muted-foreground lg:inline">{email}</span>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Wyloguj</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
