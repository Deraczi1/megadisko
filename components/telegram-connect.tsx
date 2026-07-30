"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Send, Copy, RefreshCw, Trash2, Check, AlertTriangle, CheckCircle2 } from "lucide-react"

interface TelegramLink {
  chat_id: string
  chat_title: string | null
  created_at: string
}

interface TelegramState {
  configured: boolean
  botUsername: string | null
  links: TelegramLink[]
}

interface WebhookState {
  configured: boolean
  botUsername: string | null
  expectedUrl: string
  registered?: boolean
  matches?: boolean
  webhook?: { url: string; pending_update_count: number; last_error_message?: string } | null
}

export function TelegramConnect({ formId, isAdmin = false }: { formId: number; isAdmin?: boolean }) {
  const [state, setState] = useState<TelegramState | null>(null)
  const [loading, setLoading] = useState(true)
  const [code, setCode] = useState<string | null>(null)
  const [deepLink, setDeepLink] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [webhook, setWebhook] = useState<WebhookState | null>(null)
  const [registering, setRegistering] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Diagnostyka webhooka (tylko admin) — pozwala sprawdzić i zarejestrować adres,
  // pod który Telegram wysyła wiadomości. Bez tego bot "nic nie robi".
  const loadWebhook = useCallback(async () => {
    if (!isAdmin) return
    try {
      const res = await fetch("/api/telegram/setup")
      if (res.ok) setWebhook(await res.json())
    } catch {
      // sekcja opcjonalna
    }
  }, [isAdmin])

  async function registerWebhook() {
    setRegistering(true)
    try {
      const res = await fetch("/api/telegram/setup", { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Nie udało się zarejestrować webhooka.")
        return
      }
      toast.success("Webhook zarejestrowany. Bot będzie teraz odbierać komendy.")
      await loadWebhook()
    } catch {
      toast.error("Błąd połączenia.")
    } finally {
      setRegistering(false)
    }
  }

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/forms/${formId}/telegram`)
      const data = await res.json()
      if (res.ok) setState(data)
    } catch {
      // cichy błąd — sekcja opcjonalna
    } finally {
      setLoading(false)
    }
  }, [formId])

  useEffect(() => {
    load()
    loadWebhook()
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [load, loadWebhook])

  // Po wygenerowaniu kodu odpytujemy serwer, aż użytkownik połączy czat.
  useEffect(() => {
    if (!code) return
    pollRef.current = setInterval(async () => {
      const before = state?.links.length ?? 0
      const res = await fetch(`/api/forms/${formId}/telegram`)
      if (res.ok) {
        const data: TelegramState = await res.json()
        setState(data)
        if (data.links.length > before) {
          setCode(null)
          setDeepLink(null)
          toast.success("Połączono nowy czat Telegram.")
        }
      }
    }, 3000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [code, formId, state?.links.length])

  async function generate() {
    setGenerating(true)
    try {
      const res = await fetch(`/api/forms/${formId}/telegram`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Nie udało się wygenerować kodu.")
        return
      }
      setCode(data.code)
      setDeepLink(data.deepLink)
    } catch {
      toast.error("Błąd połączenia.")
    } finally {
      setGenerating(false)
    }
  }

  async function unlink(chatId: string) {
    const res = await fetch(`/api/forms/${formId}/telegram?chatId=${encodeURIComponent(chatId)}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Odłączono czat.")
      load()
    } else {
      toast.error("Nie udało się odłączyć.")
    }
  }

  function copyCode() {
    if (!code) return
    navigator.clipboard.writeText(`/polacz ${code}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
    toast.success("Skopiowano komendę.")
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Wczytywanie ustawień Telegram...</p>
  }

  if (!state?.configured) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        Powiadomienia Telegram są nieaktywne. Ustaw zmienną środowiskową <code className="rounded bg-muted px-1 py-0.5 text-foreground">TELEGRAM_BOT_TOKEN</code> (token z @BotFather), aby włączyć tę funkcję.
      </div>
    )
  }

  // Czy webhook jest gotowy (zarejestrowany i wskazuje na to wdrożenie).
  const webhookReady = webhook?.matches === true

  return (
    <div className="flex flex-col gap-4">
      {/* Diagnostyka webhooka — widoczna tylko dla administratora */}
      {isAdmin && webhook && (
        <div
          className={cn(
            "flex flex-col gap-3 rounded-lg border p-4",
            webhookReady ? "border-primary/30 bg-primary/5" : "border-amber-500/40 bg-amber-500/5",
          )}
        >
          <div className="flex items-start gap-2">
            {webhookReady ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            ) : (
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
            )}
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">
                {webhookReady ? "Webhook aktywny — bot odbiera komendy" : "Webhook nie jest zarejestrowany"}
              </p>
              <p className="text-xs text-muted-foreground">
                {webhookReady
                  ? "Telegram wysyła wiadomości do tej aplikacji. Komendy /polacz i powiadomienia działają."
                  : "Jeśli wysyłasz komendy do bota i nic się nie dzieje, zarejestruj webhook dla tego wdrożenia."}
              </p>
              {webhook.webhook?.last_error_message && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Ostatni błąd Telegrama: {webhook.webhook.last_error_message}
                </p>
              )}
              <p className="break-all text-[11px] text-muted-foreground">
                Adres webhooka: <code className="rounded bg-muted px-1 py-0.5">{webhook.expectedUrl}</code>
              </p>
            </div>
          </div>
          {!webhookReady && (
            <Button size="sm" onClick={registerWebhook} disabled={registering} className="self-start">
              <RefreshCw className={cn("size-4", registering && "animate-spin")} />
              {registering ? "Rejestrowanie..." : "Zarejestruj webhook"}
            </Button>
          )}
        </div>
      )}

      {/* Połączone czaty */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Połączone czaty ({state.links.length})</p>
        {state.links.length === 0 ? (
          <p className="text-sm text-muted-foreground">Brak połączonych czatów. Wygeneruj kod poniżej.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {state.links.map((link) => (
              <li
                key={link.chat_id}
                className="flex items-center justify-between gap-2 rounded-lg border bg-background p-2.5"
              >
                <span className="flex items-center gap-2 text-sm">
                  <Send className="size-4 text-primary" />
                  <span className="font-medium">{link.chat_title || `Czat ${link.chat_id}`}</span>
                </span>
                <Button variant="ghost" size="icon" onClick={() => unlink(link.chat_id)} aria-label="Odłącz czat">
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Generowanie kodu */}
      {code ? (
        <div className="flex flex-col gap-3 rounded-lg border border-primary/40 bg-primary/5 p-4">
          <div>
            <p className="text-sm font-medium">Twój kod (ważny 10 minut)</p>
            <p className="text-xs text-muted-foreground">
              Otwórz bota Telegram i wyślij poniższą komendę, aby połączyć czat.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md bg-background px-3 py-2 text-center text-lg font-semibold tracking-widest">
              /polacz {code}
            </code>
            <Button variant="outline" size="icon" onClick={copyCode} aria-label="Kopiuj komendę">
              {copied ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {deepLink && (
              <a
                href={deepLink}
                target="_blank"
                rel="noreferrer"
                className={cn(buttonVariants({ size: "sm" }))}
              >
                <Send className="size-4" />
                Otwórz bota i połącz
              </a>
            )}
            <Button variant="ghost" size="sm" onClick={generate} disabled={generating}>
              <RefreshCw className="size-4" />
              Nowy kod
            </Button>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <RefreshCw className="size-3 animate-spin" />
            Oczekiwanie na połączenie...
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 rounded-lg border p-4">
          <p className="text-sm">
            Wygeneruj jednorazowy kod i wyślij go do bota Telegram komendą <code className="rounded bg-muted px-1 py-0.5">/polacz KOD</code>,
            aby otrzymywać powiadomienia o nowych zgłoszeniach.
          </p>
          <Button onClick={generate} disabled={generating} className="self-start">
            <Send className="size-4" />
            {generating ? "Generowanie..." : "Połącz Telegram"}
          </Button>
        </div>
      )}
    </div>
  )
}
