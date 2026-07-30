"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Inbox, Mail, Phone } from "lucide-react"

interface Submission {
  id: number
  form_id: number
  form_name: string
  name: string | null
  email: string | null
  phone: string | null
  select_value: string | null
  description: string | null
  created_at: string
}

interface FormOption {
  id: number
  name: string
}

function formatDate(value: string) {
  const d = new Date(value)
  return d.toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function ContactPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [forms, setForms] = useState<FormOption[]>([])
  const [filter, setFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [subRes, formRes] = await Promise.all([
        fetch(`/api/submissions${filter !== "all" ? `?formId=${filter}` : ""}`),
        fetch("/api/forms"),
      ])
      const subData = await subRes.json()
      const formData = await formRes.json()
      if (!subRes.ok) {
        setError(subData.error || "Błąd wczytywania zgłoszeń.")
        return
      }
      setError(null)
      setSubmissions(subData.submissions)
      if (formRes.ok) setForms(formData.forms.map((f: any) => ({ id: f.id, name: f.name })))
    } catch {
      setError("Błąd połączenia z serwerem.")
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-balance">Kontakt — zgłoszenia</h1>
          <p className="text-sm text-muted-foreground">
            Kto wysłał, kiedy i przez który formularz. Najnowsze na górze.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Filtruj po formularzu</span>
          <Select value={filter} onValueChange={(v) => setFilter(v ?? "all")}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie formularze</SelectItem>
              {forms.map((f) => (
                <SelectItem key={f.id} value={String(f.id)}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
      ) : submissions.length === 0 && !error ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Inbox className="size-6 text-muted-foreground" />
            </span>
            <div>
              <p className="font-medium">Brak zgłoszeń</p>
              <p className="text-sm text-muted-foreground">
                Gdy ktoś wyśle formularz, zobaczysz tutaj kto i o której godzinie.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data wysłania</TableHead>
                    <TableHead>Formularz</TableHead>
                    <TableHead>Osoba</TableHead>
                    <TableHead>Kontakt</TableHead>
                    <TableHead>Temat</TableHead>
                    <TableHead>Wiadomość</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(s.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{s.form_name}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{s.name || "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-sm">
                          {s.email && (
                            <a
                              href={`mailto:${s.email}`}
                              className="flex items-center gap-1.5 text-primary hover:underline"
                            >
                              <Mail className="size-3.5" />
                              {s.email}
                            </a>
                          )}
                          {s.phone && (
                            <a
                              href={`tel:${s.phone}`}
                              className="flex items-center gap-1.5 text-foreground hover:underline"
                            >
                              <Phone className="size-3.5" />
                              {s.phone}
                            </a>
                          )}
                          {!s.email && !s.phone && "—"}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{s.select_value || "—"}</TableCell>
                      <TableCell className="max-w-xs text-sm text-muted-foreground">
                        <span className="line-clamp-2">{s.description || "—"}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
