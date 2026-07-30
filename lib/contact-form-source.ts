interface Args {
  slug: string
  apiBase: string
}

// Generuje samodzielny komponent React formularza kontaktowego.
// Komponent nie ma zewnętrznych zależności (tylko React) i pobiera
// konfigurację oraz wysyła zgłoszenia do publicznego API tego panelu.
export function standaloneContactFormSource({ slug, apiBase }: Args): string {
  return `"use client"

import { useEffect, useState } from "react"

// Wygenerowano przez Panel formularzy.
// Formularz: ${slug}
const API_BASE = "${apiBase}"
const SLUG = "${slug}"

type Field = { enabled: boolean; label: string; required: boolean; options?: string[] }
type Config = {
  title: string
  description: string
  submitLabel: string
  fields: { name: Field; email: Field; phone: Field; select: Field; description: Field }
}

const EMPTY = { name: "", email: "", phone: "", select: "", description: "" }

export function ContactForm() {
  const [config, setConfig] = useState<Config | null>(null)
  const [values, setValues] = useState({ ...EMPTY })
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle")
  const [message, setMessage] = useState("")

  useEffect(() => {
    fetch(\`\${API_BASE}/api/public/\${SLUG}\`)
      .then((r) => r.json())
      .then((d) => {
        if (d.form) setConfig(d.form.config)
        else setMessage(d.error || "Nie udało się wczytać formularza.")
      })
      .catch(() => setMessage("Nie udało się wczytać formularza."))
  }, [])

  if (message && !config) return <p>{message}</p>
  if (!config) return <p>Wczytywanie formularza...</p>

  const f = config.fields

  function update(key: keyof typeof values, value: string) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const hasContact = (f.email.enabled && values.email.trim()) || (f.phone.enabled && values.phone.trim())
    if (!hasContact) {
      setStatus("error")
      setMessage("Podaj adres email lub numer telefonu.")
      return
    }
    setStatus("sending")
    try {
      const res = await fetch(\`\${API_BASE}/api/public/\${SLUG}/submit\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus("error")
        setMessage(data.error || "Nie udało się wysłać.")
        return
      }
      setStatus("ok")
      setMessage("Dziękujemy! Wiadomość została wysłana.")
      setValues({ ...EMPTY })
    } catch {
      setStatus("error")
      setMessage("Błąd połączenia z serwerem.")
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 420 }}>
      <div>
        <h2 style={{ margin: 0 }}>{config.title}</h2>
        {config.description && <p style={{ color: "#666", marginTop: 4 }}>{config.description}</p>}
      </div>

      {f.name.enabled && (
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {f.name.label}{f.name.required ? " *" : ""}
          <input value={values.name} required={f.name.required} onChange={(e) => update("name", e.target.value)} />
        </label>
      )}
      {f.email.enabled && (
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {f.email.label}{f.email.required ? " *" : ""}
          <input type="email" value={values.email} required={f.email.required} onChange={(e) => update("email", e.target.value)} />
        </label>
      )}
      {f.phone.enabled && (
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {f.phone.label}{f.phone.required ? " *" : ""}
          <input type="tel" value={values.phone} required={f.phone.required} onChange={(e) => update("phone", e.target.value)} />
        </label>
      )}
      {f.select.enabled && (
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {f.select.label}{f.select.required ? " *" : ""}
          <select value={values.select} required={f.select.required} onChange={(e) => update("select", e.target.value)}>
            <option value="">Wybierz...</option>
            {(f.select.options || []).filter((o) => o.trim()).map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </label>
      )}
      {f.description.enabled && (
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {f.description.label}{f.description.required ? " *" : ""}
          <textarea rows={4} value={values.description} required={f.description.required} onChange={(e) => update("description", e.target.value)} />
        </label>
      )}

      <button type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Wysyłanie..." : config.submitLabel || "Wyślij"}
      </button>

      {message && (
        <p style={{ color: status === "ok" ? "green" : "crimson", fontSize: 14 }}>{message}</p>
      )}
    </form>
  )
}
`
}
