import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'HiveTrace | From Hive to Home, Verified',
  description: 'Honey traceability and smart beekeeping intelligence for trusted supply chains.',
  generator: 'HiveTrace',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f5f3ee',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className="bg-background"><body className="antialiased">{children}{process.env.NODE_ENV === 'production' && <Analytics />}</body></html>
}
