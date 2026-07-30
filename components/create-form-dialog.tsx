"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { formTemplates, type TemplateKey } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Plus, Check, Mail, Phone, LifeBuoy, ClipboardList, FileText } from "lucide-react"

const TEMPLATE_ICONS: Record<TemplateKey, typeof Mail> = {
  contact: Mail,
  callback: Phone,
  support: LifeBuoy,
  signup: ClipboardList,
  blank: FileText,
}

interface CreateFormDialogProps {
  onCreated: (id: number) => void
  variant?: "default" | "outline"
  triggerLabel?: string
}

export function CreateFormDialog({ onCreated, variant = "default", triggerLabel = "Nowy formularz" }: CreateFormDialogProps) {
  const templates = formTemplates()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [templateKey, setTemplateKey] = useState<TemplateKey>("contact")
  const [creating, setCreating] = useState(false)

  async function create() {
    const template = templates.find((t) => t.key === templateKey) || templates[0]
    const finalName = name.trim() || template.name
    setCreating(true)
    try {
      const res = await fetch("/api/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: finalName, config: template.config }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Nie udało się utworzyć.")
        return
      }
      toast.success("Utworzono formularz.")
      setOpen(false)
      setName("")
      setTemplateKey("contact")
      onCreated(data.id)
    } catch {
      toast.error("Błąd połączenia.")
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant={variant}>
            <Plus className="size-4" />
            {triggerLabel}
          </Button>
        }
      />
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Nowy formularz</DialogTitle>
          <DialogDescription>Nadaj nazwę i wybierz szablon — resztę dostosujesz w edytorze.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="new-form-name">Nazwa formularza</Label>
          <Input
            id="new-form-name"
            autoFocus
            placeholder="np. Kontakt ze sklepem"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) create()
            }}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Szablon</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {templates.map((t) => {
              const Icon = TEMPLATE_ICONS[t.key]
              const active = templateKey === t.key
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTemplateKey(t.key)}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                    active ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "hover:bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-md",
                      active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 font-medium">
                      {t.name}
                      {active && <Check className="size-3.5 text-primary" />}
                    </span>
                    <span className="block text-xs text-muted-foreground">{t.description}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={creating}>
            Anuluj
          </Button>
          <Button onClick={create} disabled={creating}>
            <Plus className="size-4" />
            {creating ? "Tworzenie..." : "Utwórz formularz"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
