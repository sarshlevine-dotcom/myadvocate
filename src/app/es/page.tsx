import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'MyAdvocate en Español — Próximamente',
  description:
    'Herramientas gratuitas para apelar denegaciones de seguro médico en español.',
  alternates: {
    canonical: 'https://getmyadvocate.org/es',
  },
}

export default function EsComingSoonPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-16">
      <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide mb-4">
        Próximamente
      </p>
      <h1 className="text-4xl font-bold mb-4">
        MyAdvocate en Español
      </h1>
      <p className="text-xl text-gray-600 mb-8">
        Estamos construyendo herramientas gratuitas para ayudarte a apelar denegaciones
        de seguro médico. Únete a la lista de espera.
      </p>
      {/* TODO: embed Beehiiv form here — tag signups as es-waitlist (Beehiiv account not live yet) */}
      <div className="flex gap-4 flex-wrap">
        <Link
          href="/"
          className="border border-blue-600 text-blue-600 px-6 py-3 rounded-lg font-medium text-lg"
        >
          Ver versión en inglés
        </Link>
      </div>
    </main>
  )
}
