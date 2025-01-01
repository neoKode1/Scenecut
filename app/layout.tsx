import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Scenecut - Video Analysis',
  description: 'AI-powered video analysis for filmmakers',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
} 