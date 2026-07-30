// Klucze pól, które można włączyć w formularzu.
export type FieldKey = "name" | "email" | "phone" | "select" | "description"

export interface BaseFieldConfig {
  enabled: boolean
  label: string
  required: boolean
}

export interface SelectFieldConfig extends BaseFieldConfig {
  options: string[]
}

export interface FormConfig {
  title: string
  description: string
  submitLabel: string
  fields: {
    name: BaseFieldConfig
    email: BaseFieldConfig
    phone: BaseFieldConfig
    select: SelectFieldConfig
    description: BaseFieldConfig
  }
}

export type UserRole = "admin" | "user"

export interface UserRecord {
  id: number
  email: string
  role: UserRole
  created_at: string
  form_count?: number
}

export interface FormRecord {
  id: number
  user_id: number
  assigned_user_id: number | null
  assigned_email?: string | null
  name: string
  slug: string
  notification_email: string | null
  config: FormConfig
  created_at: string
}

export interface SubmissionRecord {
  id: number
  form_id: number
  name: string | null
  email: string | null
  phone: string | null
  select_value: string | null
  description: string | null
  created_at: string
  form_name?: string
}

// Domyślna konfiguracja nowego formularza.
export function defaultFormConfig(): FormConfig {
  return {
    title: "Skontaktuj się z nami",
    description: "Wypełnij formularz, a odezwiemy się jak najszybciej.",
    submitLabel: "Wyślij",
    fields: {
      name: { enabled: true, label: "Imię i nazwisko", required: false },
      email: { enabled: true, label: "Email", required: false },
      phone: { enabled: true, label: "Numer telefonu", required: false },
      select: {
        enabled: true,
        label: "Temat",
        required: false,
        options: ["Zapytanie ogólne", "Wsparcie techniczne", "Współpraca", "Inne"],
      },
      description: { enabled: true, label: "Wiadomość", required: false },
    },
  }
}

// Gotowe szablony przyspieszające tworzenie formularza.
export type TemplateKey = "contact" | "callback" | "support" | "signup" | "blank"

export interface FormTemplate {
  key: TemplateKey
  name: string
  description: string
  config: FormConfig
}

export function formTemplates(): FormTemplate[] {
  return [
    {
      key: "contact",
      name: "Kontakt ogólny",
      description: "Imię, email, telefon, temat i wiadomość.",
      config: defaultFormConfig(),
    },
    {
      key: "callback",
      name: "Oddzwonimy",
      description: "Szybki formularz: imię i telefon.",
      config: {
        title: "Zostaw numer — oddzwonimy",
        description: "Podaj numer telefonu, a skontaktujemy się z Tobą.",
        submitLabel: "Poproś o kontakt",
        fields: {
          name: { enabled: true, label: "Imię", required: true },
          email: { enabled: false, label: "Email", required: false },
          phone: { enabled: true, label: "Numer telefonu", required: true },
          select: { enabled: false, label: "Temat", required: false, options: [] },
          description: { enabled: false, label: "Wiadomość", required: false },
        },
      },
    },
    {
      key: "support",
      name: "Wsparcie techniczne",
      description: "Email, priorytet i szczegółowy opis problemu.",
      config: {
        title: "Zgłoś problem",
        description: "Opisz problem, a nasz zespół wsparcia się nim zajmie.",
        submitLabel: "Wyślij zgłoszenie",
        fields: {
          name: { enabled: true, label: "Imię i nazwisko", required: false },
          email: { enabled: true, label: "Email", required: true },
          phone: { enabled: false, label: "Numer telefonu", required: false },
          select: {
            enabled: true,
            label: "Priorytet",
            required: true,
            options: ["Niski", "Średni", "Wysoki", "Krytyczny"],
          },
          description: { enabled: true, label: "Opis problemu", required: true },
        },
      },
    },
    {
      key: "signup",
      name: "Zapisy / rejestracja",
      description: "Imię, email i wybór opcji.",
      config: {
        title: "Zapisz się",
        description: "Wypełnij formularz, aby dołączyć.",
        submitLabel: "Zapisz się",
        fields: {
          name: { enabled: true, label: "Imię i nazwisko", required: true },
          email: { enabled: true, label: "Email", required: true },
          phone: { enabled: true, label: "Numer telefonu", required: false },
          select: {
            enabled: true,
            label: "Wybierz opcję",
            required: true,
            options: ["Opcja A", "Opcja B", "Opcja C"],
          },
          description: { enabled: false, label: "Uwagi", required: false },
        },
      },
    },
    {
      key: "blank",
      name: "Pusty (minimalny)",
      description: "Tylko email — resztę dodasz sam.",
      config: {
        title: "Formularz kontaktowy",
        description: "",
        submitLabel: "Wyślij",
        fields: {
          name: { enabled: false, label: "Imię i nazwisko", required: false },
          email: { enabled: true, label: "Email", required: true },
          phone: { enabled: false, label: "Numer telefonu", required: false },
          select: { enabled: false, label: "Temat", required: false, options: [] },
          description: { enabled: false, label: "Wiadomość", required: false },
        },
      },
    },
  ]
}
