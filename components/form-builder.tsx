"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ContactForm } from "@/components/contact-form"
import { TelegramConnect } from "@/components/telegram-connect"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { standaloneContactFormSource } from "@/lib/contact-form-source"
import type { FieldKey, FormConfig } from "@/lib/types"
import { Trash2, Plus, Copy, Save, Download, SlidersHorizontal, ListChecks, Eye, Send, Code } from "lucide-react"

interface UserOption {
  id: number
  email: string
}

interface FormBuilderProps {
  form: {
    id: number
    name: string
    slug: string
    notification_email: string | null
    assigned_user_id: number | null
    assigned_email?: string | null
    config: FormConfig
  }
  users: UserOption[]
  onSaved: () => void
  onDeleted: () => void
  isAdmin?: boolean
}

// Wartość używana w Select, gdy formularz nie ma przypisanego użytkownika.
const UNASSIGNED = "none"

const FIELD_ORDER: { key: FieldKey; hint: string }[] = [
  { key: "name", hint: "Imię / nazwa osoby kontaktującej się" },
  { key: "email", hint: "Adres email" },
  { key: "phone", hint: "Numer telefonu" },
  { key: "select", hint: "Lista wyboru z opcjami" },
  { key: "description", hint: "Dłuższy opis / wiadomość" },
]

export function FormBuilder({ form, users, onSaved, onDeleted, isAdmin = false }: FormBuilderProps) {
  const [name, setName] = useState(form.name)
  const [notificationEmail, setNotificationEmail] = useState(form.notification_email || "")
  const [assignedUserId, setAssignedUserId] = useState<string>(
    form.assigned_user_id ? String(form.assigned_user_id) : UNASSIGNED,
  )
  const [config, setConfig] = useState<FormConfig>(form.config)
  const [saving, setSaving] = useState(false)

  const origin = typeof window !== "undefined" ? window.location.origin : ""
  const publicUrl = `${origin}/f/${form.slug}`

  // Lista opcji do przypisania. Zawsze zawiera aktualnie przypisanego użytkownika
  // (nawet zanim załaduje się pełna lista), aby w polu pokazywał się EMAIL, a nie ID.
  const userOptions: UserOption[] = (() => {
    const map = new Map<number, UserOption>()
    for (const u of users) map.set(u.id, u)
    if (form.assigned_user_id && !map.has(form.assigned_user_id)) {
      map.set(form.assigned_user_id, {
        id: form.assigned_user_id,
        email: form.assigned_email || `Użytkownik #${form.assigned_user_id}`,
      })
    }
    return Array.from(map.values())
  })()

  // Przypisanie użytkownika automatycznie ustawia email powiadomień na jego adres.
  // Administrator może później ręcznie zmienić ten email.
  function handleAssignChange(value: string | null) {
    const next = value ?? UNASSIGNED
    setAssignedUserId(next)
    const selected = userOptions.find((u) => String(u.id) === next)
    // Auto-uzupełnienie emaila powiadomień adresem przypisanej osoby.
    if (selected && !selected.email.startsWith("Użytkownik #")) {
      setNotificationEmail(selected.email)
    }
  }

  // Pobiera samodzielny komponent React formularza (gotowy do wklejenia w innym projekcie).
  function downloadComponent() {
    const source = standaloneContactFormSource({ slug: form.slug, apiBase: origin })
    const blob = new Blob([source], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "contact-form.tsx"
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    toast.success("Pobrano komponent contact-form.tsx")
  }

  function updateField(key: FieldKey, patch: Partial<FormConfig["fields"][FieldKey]>) {
    setConfig((c) => ({
      ...c,
      fields: { ...c.fields, [key]: { ...c.fields[key], ...patch } },
    }))
  }

  function updateOption(index: number, value: string) {
    setConfig((c) => {
      const options = [...c.fields.select.options]
      options[index] = value
      return { ...c, fields: { ...c.fields, select: { ...c.fields.select, options } } }
    })
  }

  function addOption() {
    setConfig((c) => ({
      ...c,
      fields: { ...c.fields, select: { ...c.fields.select, options: [...c.fields.select.options, ""] } },
    }))
  }

  function removeOption(index: number) {
    setConfig((c) => ({
      ...c,
      fields: {
        ...c.fields,
        select: { ...c.fields.select, options: c.fields.select.options.filter((_, i) => i !== index) },
      },
    }))
  }

  async function save() {
    // Walidacja: email lub telefon musi być włączony.
    if (!config.fields.email.enabled && !config.fields.phone.enabled) {
      toast.error("Włącz co najmniej pole Email lub Numer telefonu.")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/forms/${form.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          notification_email: notificationEmail,
          assigned_user_id: assignedUserId === UNASSIGNED ? null : Number(assignedUserId),
          config,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Nie udało się zapisać.")
        return
      }
      toast.success("Zapisano zmiany.")
      onSaved()
    } catch {
      toast.error("Błąd połączenia.")
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!confirm("Usunąć ten formularz wraz ze wszystkimi zgłoszeniami?")) return
    const res = await fetch(`/api/forms/${form.id}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Formularz usunięty.")
      onDeleted()
    } else {
      toast.error("Nie udało się usunąć.")
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Edycja formularza</h2>
        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={remove}>
              <Trash2 className="size-4" />
              Usuń
            </Button>
          )}
          <Button size="sm" onClick={save} disabled={saving}>
            <Save className="size-4" />
            {saving ? "Zapisywanie..." : "Zapisz"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="settings">
        <TabsList className="flex-wrap">
          <TabsTrigger value="settings">
            <SlidersHorizontal className="size-4" />
            Ogólne
          </TabsTrigger>
          <TabsTrigger value="fields">
            <ListChecks className="size-4" />
            Pola
          </TabsTrigger>
          <TabsTrigger value="telegram">
            <Send className="size-4" />
            Telegram
          </TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="size-4" />
            Podgląd
          </TabsTrigger>
          <TabsTrigger value="embed">
            <Code className="size-4" />
            Osadzenie
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ogólne</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="fb-name">Nazwa formularza (wewnętrzna)</Label>
                <Input id="fb-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="fb-title">Tytuł widoczny dla użytkownika</Label>
                  <Input
                    id="fb-title"
                    value={config.title}
                    onChange={(e) => setConfig((c) => ({ ...c, title: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="fb-submit">Tekst przycisku</Label>
                  <Input
                    id="fb-submit"
                    value={config.submitLabel}
                    onChange={(e) => setConfig((c) => ({ ...c, submitLabel: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="fb-desc">Opis nad formularzem</Label>
                <Input
                  id="fb-desc"
                  value={config.description}
                  onChange={(e) => setConfig((c) => ({ ...c, description: e.target.value }))}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {isAdmin && (
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="fb-assign">Przypisany użytkownik</Label>
                    <Select value={assignedUserId} onValueChange={handleAssignChange}>
                      <SelectTrigger id="fb-assign">
                        <SelectValue placeholder="Brak przypisania">
                          {assignedUserId === UNASSIGNED
                            ? "Brak przypisania"
                            : userOptions.find((u) => String(u.id) === assignedUserId)?.email}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={UNASSIGNED}>Brak przypisania</SelectItem>
                        {userOptions.map((u) => (
                          <SelectItem key={u.id} value={String(u.id)}>
                            {u.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Tylko przypisany użytkownik zobaczy ten formularz i jego zgłoszenia.
                    </p>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="fb-notify">Email powiadomień o nowym zgłoszeniu</Label>
                  <Input
                    id="fb-notify"
                    type="email"
                    placeholder="osoba@firma.pl"
                    value={notificationEmail}
                    onChange={(e) => setNotificationEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Ustawiany automatycznie na email przypisanego użytkownika — możesz go zmienić.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fields" className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pola formularza</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              {FIELD_ORDER.map(({ key, hint }) => {
                const field = config.fields[key]
                return (
                  <div key={key} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium capitalize">{field.label}</span>
                          {(key === "email" || key === "phone") && (
                            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                              kontakt
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{hint}</p>
                      </div>
                      <Switch
                        checked={field.enabled}
                        onCheckedChange={(v) => updateField(key, { enabled: v })}
                        aria-label={`Włącz pole ${field.label}`}
                      />
                    </div>

                    {field.enabled && (
                      <div className="mt-4 flex flex-col gap-3 border-t pt-4">
                        <div className="flex flex-col gap-2">
                          <Label htmlFor={`label-${key}`}>Etykieta pola</Label>
                          <Input
                            id={`label-${key}`}
                            value={field.label}
                            onChange={(e) => updateField(key, { label: e.target.value })}
                          />
                        </div>

                        <label className="flex items-center gap-2 text-sm">
                          <Switch
                            checked={field.required}
                            onCheckedChange={(v) => updateField(key, { required: v })}
                          />
                          Pole wymagane
                        </label>

                        {key === "select" && (
                          <div className="flex flex-col gap-2">
                            <Label>Opcje listy wyboru</Label>
                            {config.fields.select.options.map((opt, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <Input
                                  value={opt}
                                  placeholder={`Opcja ${i + 1}`}
                                  onChange={(e) => updateOption(i, e.target.value)}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeOption(i)}
                                  aria-label="Usuń opcję"
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            ))}
                            <Button type="button" variant="outline" size="sm" onClick={addOption} className="self-start">
                              <Plus className="size-4" />
                              Dodaj opcję
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
              <p className="text-xs text-muted-foreground">
                Uwaga: musi być włączone co najmniej jedno pole kontaktowe — Email lub Numer telefonu.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="telegram">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Send className="size-4 text-primary" />
                Powiadomienia Telegram
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TelegramConnect formId={form.id} isAdmin={isAdmin} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview">
          <div className="mx-auto max-w-md">
            <ContactForm config={config} previewOnly />
          </div>
        </TabsContent>

        <TabsContent value="embed" className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Osadzenie na stronie</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>Link do formularza</Label>
                <div className="flex gap-2">
                  <Input readOnly value={publicUrl} />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(publicUrl)
                      toast.success("Skopiowano link.")
                    }}
                    aria-label="Kopiuj link"
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label>Kod React (komponent)</Label>
                  <Button type="button" variant="outline" size="sm" onClick={downloadComponent}>
                    <Download className="size-4" />
                    Pobierz contact-form.tsx
                  </Button>
                </div>
                <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">
                  <code>{`import { ContactForm } from "@/components/contact-form"\n\n<ContactForm slug="${form.slug}" />`}</code>
                </pre>
                <p className="text-xs text-muted-foreground">
                  Przycisk pobiera samodzielny komponent React (bez zależności) gotowy do wklejenia w dowolnym projekcie.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Osadzenie iframe</Label>
                <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">
                  <code>{`<iframe src="${publicUrl}" width="100%" height="600" style="border:0"></iframe>`}</code>
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
