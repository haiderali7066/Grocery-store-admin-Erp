import React from "react"
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { CartProvider } from '@/components/cart/CartProvider'
import WhatsAppButton from "@/components/store/WhatsAppButton";

import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Khas Pure Food',
  description: 'Online grocery store with POS billing system',
  generator: 'Devntom Solutions',
  icons: {
    icon: [
      {
        url: '/',
        media: '(prefers-color-scheme: light)',
      },
      
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <AuthProvider>
          <CartProvider>
            {children}
            <WhatsAppButton />
          </CartProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
