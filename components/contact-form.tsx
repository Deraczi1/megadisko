"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { FormConfig } from "@/lib/types"

interface ContactFormProps {
  // Tryb produkcyjny: pobiera konfigurację i wysyła zgłoszenie.
  slug?: string
  // Tryb podglądu: renderuje z przekazanej konfiguracji, bez wysyłki.
  config?: FormConfig
  previewOnly?: boolean
}

const emptyValues = { name: "", email: "", phone: "", select: "", description: "" }

export function ContactForm({ slug, config: configProp, previewOnly }: ContactFormProps) {
  const [config, setConfig] = useState<FormConfig | null>(configProp ?? null)
  const [values, setValues] = useState({ ...emptyValues })
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (configProp) {
      setConfig(configProp)
      return
    }
    if (!slug) return
    fetch(`/api/public/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setLoadError(data.error)
        else setConfig(data.form.config)
      })
      .catch(() => setLoadError("Nie udało się wczytać formularza."))
  }, [slug, configProp])

  if (loadError) {
    return <p className="text-sm text-destructive">{loadError}</p>
  }
  if (!config) {
    return <p className="text-sm text-muted-foreground">Wczytywanie formularza...</p>
  }

  const f = config.fields

  function update(key: keyof typeof values, value: string) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (previewOnly || !slug) {
      toast.info("To podgląd — zgłoszenie nie zostało wysłane.")
      return
    }
    // Reguła: wymagany email lub telefon.
    const hasContact =
      (f.email.enabled && values.email.trim()) || (f.phone.enabled && values.phone.trim())
    if (!hasContact) {
      toast.error("Podaj adres email lub numer telefonu.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/public/${slug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Nie udało się wysłać.")
        return
      }
      toast.success("Dziękujemy! Wiadomość została wysłana.")
      setValues({ ...emptyValues })
    } catch {
      toast.error("Błąd połączenia z serwerem.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-balance">{config.title}</CardTitle>
        {config.description && <CardDescription className="text-pretty">{config.description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {f.name.enabled && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="cf-name">
                {f.name.label}
                {f.name.required && <span className="text-destructive"> *</span>}
              </Label>
              <Input
                id="cf-name"
                value={values.name}
                onChange={(e) => update("name", e.target.value)}
                required={f.name.required}
              />
            </div>
          )}

          {f.email.enabled && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="cf-email">
                {f.email.label}
                {f.email.required && <span className="text-destructive"> *</span>}
              </Label>
              <Input
                id="cf-email"
                type="email"
                value={values.email}
                onChange={(e) => update("email", e.target.value)}
                required={f.email.required}
              />
            </div>
          )}

          {f.phone.enabled && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="cf-phone">
                {f.phone.label}
                {f.phone.required && <span className="text-destructive"> *</span>}
              </Label>
              <Input
                id="cf-phone"
                type="tel"
                value={values.phone}
                onChange={(e) => update("phone", e.target.value)}
                required={f.phone.required}
              />
            </div>
          )}

          {f.select.enabled && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="cf-select">
                {f.select.label}
                {f.select.required && <span className="text-destructive"> *</span>}
              </Label>
              <Select value={values.select} onValueChange={(v) => update("select", v ?? "")}>
                <SelectTrigger id="cf-select">
                  <SelectValue placeholder="Wybierz..." />
                </SelectTrigger>
                <SelectContent>
                  {f.select.options
                    .filter((o) => o.trim())
                    .map((option, i) => (
                      <SelectItem key={`${option}-${i}`} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {f.description.enabled && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="cf-desc">
                {f.description.label}
                {f.description.required && <span className="text-destructive"> *</span>}
              </Label>
              <Textarea
                id="cf-desc"
                rows={4}
                value={values.description}
                onChange={(e) => update("description", e.target.value)}
                required={f.description.required}
              />
            </div>
          )}

          {f.email.enabled && f.phone.enabled && (
            <p className="text-xs text-muted-foreground">Wymagany jest adres email lub numer telefonu.</p>
          )}

          <Button type="submit" disabled={loading} className="mt-2">
            {loading ? "Wysyłanie..." : config.submitLabel || "Wyślij"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
