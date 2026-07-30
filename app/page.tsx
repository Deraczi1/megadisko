import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  LayoutGrid,
  SlidersHorizontal,
  Inbox,
  Mail,
  ArrowRight,
  ShieldCheck,
  Users,
  Link2,
} from "lucide-react"

const features = [
  {
    icon: SlidersHorizontal,
    title: "Konfigurowalne pola",
    desc: "Włączaj i wyłączaj pola: imię, email, telefon, listę wyboru i opis. Ustaw etykiety oraz pola wymagane.",
  },
  {
    icon: Users,
    title: "Przypisywanie użytkowników",
    desc: "Administrator tworzy formularze i przypisuje je konkretnym osobom. Użytkownik widzi tylko swoje formularze.",
  },
  {
    icon: Mail,
    title: "Powiadomienia email",
    desc: "Email powiadomień ustawia się automatycznie na adres przypisanej osoby — zawsze możesz go nadpisać.",
  },
  {
    icon: Inbox,
    title: "Zakładka Kontakt",
    desc: "Zobacz kto wysłał zgłoszenie, o której godzinie i przez który formularz — wszystko w jednym miejscu.",
  },
  {
    icon: Link2,
    title: "Bezpieczne linki UUID",
    desc: "Każdy formularz dostaje nieodgadywalny adres z UUID — gotowy do publikacji i osadzenia przez iframe.",
  },
  {
    icon: ShieldCheck,
    title: "Role i zabezpieczenia",
    desc: "Podział na administratora i użytkownika, walidacja po stronie serwera i nagłówki bezpieczeństwa.",
  },
]

const steps = [
  { n: "01", title: "Utwórz formularz", desc: "Admin dodaje formularz i wybiera widoczne pola." },
  { n: "02", title: "Przypisz osobę", desc: "Wskaż użytkownika — email powiadomień uzupełni się sam." },
  { n: "03", title: "Opublikuj link", desc: "Udostępnij adres z UUID lub osadź komponent na stronie." },
  { n: "04", title: "Zbieraj zgłoszenia", desc: "Wiadomości trafiają do zakładki Kontakt i na email." },
]

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2 font-semibold">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <LayoutGrid className="size-4" />
            </span>
            Panel formularzy
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Zaloguj się
            </Link>
            <Link href="/panel" className={buttonVariants({ size: "sm" })}>
              Przejdź do panelu
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-4 py-24 text-center">
          <span className="animate-fade-up rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            Formularze kontaktowe z panelem administracyjnym
          </span>
          <h1
            className="animate-fade-up max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl"
            style={{ animationDelay: "60ms" }}
          >
            Twórz formularze, przypisuj użytkowników i zbieraj zgłoszenia w jednym miejscu
          </h1>
          <p
            className="animate-fade-up max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground"
            style={{ animationDelay: "120ms" }}
          >
            Zdecyduj, które pola mają być widoczne, przypisz formularz konkretnej osobie i osadź gotowy komponent na swojej
            stronie. Zawsze wymagany jest email lub numer telefonu.
          </p>
          <div
            className="animate-fade-up flex flex-wrap items-center justify-center gap-3"
            style={{ animationDelay: "180ms" }}
          >
            <Link href="/panel" className={buttonVariants({ size: "lg" })}>
              Otwórz panel
              <ArrowRight className="size-4" />
            </Link>
            <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
              Zaloguj się
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-20">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-semibold text-balance sm:text-3xl">Wszystko, czego potrzebujesz</h2>
          <p className="mt-2 text-muted-foreground">Od budowy formularza po bezpieczną publikację.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => {
            const Icon = f.icon
            return (
              <div
                key={f.title}
                className="animate-fade-up hover-lift rounded-lg border bg-card p-6"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span className="mb-3 flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      <section className="border-t bg-muted/30">
        <div className="mx-auto w-full max-w-6xl px-4 py-20">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-semibold text-balance sm:text-3xl">Jak to działa</h2>
            <p className="mt-2 text-muted-foreground">Cztery kroki od pomysłu do pierwszego zgłoszenia.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <div
                key={s.n}
                className="animate-fade-up rounded-lg border bg-card p-6"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span className="font-mono text-sm font-semibold text-primary">{s.n}</span>
                <h3 className="mt-2 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex justify-center">
            <Link href="/panel" className={cn(buttonVariants({ size: "lg" }))}>
              Zacznij teraz
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 text-sm text-muted-foreground">
          Panel formularzy kontaktowych
        </div>
      </footer>
    </main>
  )
}
