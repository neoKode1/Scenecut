import './globals.css'
import { Inter, Orbitron } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })
const orbitron = Orbitron({ 
  subsets: ['latin'],
  weight: ['700'],
  variable: '--font-orbitron'
})

export const metadata = {
  title: 'Scene Cut - Video Analysis',
  description: 'AI-powered video analysis tool',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${orbitron.variable}`}>{children}</body>
    </html>
  )
} 