import type { Metadata, Viewport } from 'next'
import '@fontsource-variable/inter'
import '@fontsource-variable/newsreader'
import '@/styles/main.css'
import '@/styles/components.css'
import { SiteShell } from '@/components/SiteShell'

export const metadata: Metadata = {
  title: 'Space Relics — abandonados, mas não esquecidos',
  description:
    'Um arquivo vivo das máquinas que a humanidade deixou na Lua e em Marte: Módulo Lunar Apollo, Opportunity e Viking 1 — e o portfólio que continua o arquivo.',
  metadataBase: new URL('https://spacerelics.space'),
  alternates: { canonical: '/' },
  icons: { icon: '/images/nasa-logo.png' },
  openGraph: {
    type: 'website',
    title: 'Space Relics',
    description:
      'Um arquivo vivo das máquinas que a humanidade deixou na Lua e em Marte — e o portfólio que continua o arquivo.',
    url: 'https://spacerelics.space/',
    siteName: 'Space Relics',
    images: [{ url: '/images/relics/opportunity.jpg', width: 1376, height: 768, alt: 'Space Relics' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Relics',
    description:
      'Um arquivo vivo das máquinas que a humanidade deixou na Lua e em Marte — e o portfólio que continua o arquivo.',
    images: ['/images/relics/opportunity.jpg'],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT">
      {/* extensões do browser (ex.: ColorZilla) injectam atributos no <body> */}
      <body suppressHydrationWarning>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  )
}
