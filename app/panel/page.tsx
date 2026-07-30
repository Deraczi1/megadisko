"use client"

import { useCallback, useEffect, useState } from "react"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FormBuilder } from "@/components/form-builder"
import { ContactForm } from "@/components/contact-form"
import { CreateFormDialog } from "@/components/create-form-dialog"
import { cn } from "@/lib/utils"
import type { FormConfig, UserRole } from "@/lib/types"
import { FileText, ExternalLink, Lock, Search } from "lucide-react"
import { Input } from "@/components/ui/input"

interface FormItem {
  id: number
  name: string
  slug: string
  notification_email: string | null
  assigned_user_id: number | null
  assigned_email?: string | null
  config: FormConfig
  created_at: string
}

interface UserOption {
  id: number
  email: string
}

export default function PanelPage() {
  const [forms, setForms] = useState<FormItem[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [role, setRole] = useState<UserRole | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  const isAdmin = role === "admin"

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const meRes = await fetch("/api/auth/me")
      const meData = await meRes.json()
      const currentRole: UserRole = meData.user?.role || "user"
      setRole(currentRole)

      const res = await fetch("/api/forms")
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Błąd wczytywania.")
        return
      }
      setError(null)
      setForms(data.forms)
      setSelectedId((prev) => prev ?? data.forms[0]?.id ?? null)

      // Lista użytkowników potrzebna tylko administratorowi (do przypisywania).
      if (currentRole === "admin") {
        const uRes = await fetch("/api/users")
        if (uRes.ok) {
          const uData = await uRes.json()
          setUsers(uData.users.map((u: any) => ({ id: u.id, email: u.email })))
        }
      }
    } catch {
      setError("Błąd połączenia z serwerem.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const selected = forms.find((f) => f.id === selectedId) || null
  const filtered = forms.filter((f) => f.name.toLowerCase().includes(search.trim().toLowerCase()))

  return (
    <div className="flex animate-fade-up flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-balance">Formularze</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? "Twórz formularze, przypisuj je użytkownikom i ustawiaj powiadomienia (email lub Telegram)."
              : "Formularze przypisane do Twojego konta."}
          </p>
        </div>
        {isAdmin && <CreateFormDialog onCreated={(id) => { setSelectedId(id); load() }} />}
      </div>

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="py-4 text-sm text-destructive">
            {error} Upewnij się, że baza MySQL „LLPKDatabase" jest dostępna i uruchom ponownie.
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Wczytywanie...</p>
      ) : forms.length === 0 && !error ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-muted">
              {isAdmin ? (
                <FileText className="size-6 text-muted-foreground" />
              ) : (
                <Lock className="size-6 text-muted-foreground" />
              )}
            </span>
            <div>
              {isAdmin ? (
                <>
                  <p className="font-medium">Nie masz jeszcze żadnych formularzy</p>
                  <p className="text-sm text-muted-foreground">
                    Utwórz pierwszy formularz w kilka sekund — wybierz gotowy szablon.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium">Nie przypisano Ci żadnego formularza</p>
                  <p className="text-sm text-muted-foreground">
                    Poproś administratora o przypisanie formularza do Twojego konta.
                  </p>
                </>
              )}
            </div>
            {isAdmin && <CreateFormDialog onCreated={(id) => { setSelectedId(id); load() }} triggerLabel="Utwórz formularz" />}
          </CardContent>
        </Card>
      ) : isAdmin ? (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Szukaj formularza..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex max-h-[calc(100vh-16rem)] flex-col gap-2 overflow-y-auto pr-1">
              {filtered.length === 0 ? (
                <p className="px-1 py-4 text-sm text-muted-foreground">Brak wyników.</p>
              ) : (
                filtered.map((form) => (
                  <button
                    key={form.id}
                    onClick={() => setSelectedId(form.id)}
                    className={cn(
                      "rounded-lg border p-3 text-left transition-colors",
                      selectedId === form.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "bg-background hover:bg-muted",
                    )}
                  >
                    <p className="truncate font-medium">{form.name}</p>
                    <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                      {form.assigned_email ? (
                        <span className="truncate">{form.assigned_email}</span>
                      ) : (
                        "Bez przypisania"
                      )}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          <div>
            {selected && (
              <FormBuilder
                key={selected.id}
                form={selected}
                users={users}
                onSaved={load}
                onDeleted={() => {
                  setSelectedId(null)
                  load()
                }}
              />
            )}
          </div>
        </div>
      ) : (
        // Widok tylko do odczytu dla zwykłego użytkownika.
        <div className="grid gap-6 md:grid-cols-2">
          {forms.map((form) => (
            <Card key={form.id}>
              <CardContent className="flex flex-col gap-4 py-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{form.name}</p>
                    <p className="text-xs text-muted-foreground">/{form.slug}</p>
                  </div>
                  <a
                    href={`/f/${form.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  >
                    <ExternalLink className="size-4" />
                    Otwórz
                  </a>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <ContactForm config={form.config} previewOnly />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
