"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { UserRecord } from "@/lib/types"
import { Users, ShieldCheck, FileText } from "lucide-react"

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export function UsersManager({ currentUserId }: { currentUserId: number }) {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/users")
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Błąd wczytywania użytkowników.")
        return
      }
      setError(null)
      setUsers(data.users)
    } catch {
      setError("Błąd połączenia z serwerem.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function toggleRole(user: UserRecord, makeAdmin: boolean) {
    const role = makeAdmin ? "admin" : "user"
    setPendingId(user.id)
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, role }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Nie udało się zmienić roli.")
        return
      }
      toast.success(makeAdmin ? `${user.email} jest teraz administratorem.` : `${user.email} jest teraz użytkownikiem.`)
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role } : u)))
    } catch {
      toast.error("Błąd połączenia.")
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-balance">Użytkownicy</h1>
        <p className="text-sm text-muted-foreground">
          Ustaw kto jest administratorem. Administratorzy tworzą formularze i przypisują je użytkownikom.
        </p>
      </div>

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="py-4 text-sm text-destructive">
            {error} Sprawdź połączenie z bazą MySQL „LLPKDatabase".
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Wczytywanie...</p>
      ) : users.length === 0 && !error ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Users className="size-6 text-muted-foreground" />
            </span>
            <p className="font-medium">Brak użytkowników</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Użytkownik</TableHead>
                    <TableHead>Rola</TableHead>
                    <TableHead>Przypisane formularze</TableHead>
                    <TableHead>Dołączył</TableHead>
                    <TableHead className="text-right">Administrator</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => {
                    const isSelf = u.id === currentUserId
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">
                          {u.email}
                          {isSelf && <span className="ml-2 text-xs text-muted-foreground">(Ty)</span>}
                        </TableCell>
                        <TableCell>
                          {u.role === "admin" ? (
                            <Badge className="gap-1">
                              <ShieldCheck className="size-3" />
                              Administrator
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Użytkownik</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                            <FileText className="size-3.5" />
                            {u.form_count ?? 0}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(u.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end">
                            <Switch
                              checked={u.role === "admin"}
                              disabled={isSelf || pendingId === u.id}
                              onCheckedChange={(v) => toggleRole(u, v)}
                              aria-label={`Ustaw ${u.email} jako administrator`}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
