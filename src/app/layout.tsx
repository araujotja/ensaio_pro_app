import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    template: '%s — Ensaio Pro',
    default: 'Ensaio Pro',
  },
  description: 'Plataforma de preparação musical entre ensaios para corais e orquestras',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  )
}
