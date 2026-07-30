import { ContactForm } from "@/components/contact-form"

export default async function PublicFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        <ContactForm slug={slug} />
      </div>
    </main>
  )
}
