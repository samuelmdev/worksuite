
import React from 'react'
import { Archivo, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'
import { LocaleProvider } from './lib/locale'
import { ThemeProvider } from './lib/theme'
import { AuthProvider } from './lib/auth-context-multi-org'
import HeaderWithNav from './components/HeaderWithNav'
import SiteFooter from './components/SiteFooter'
import PageTransition from './components/PageTransition'


// Archivo carries a width axis, which the .display classes use to stretch
// headlines; IBM Plex Mono is reserved for labels and figures.
const archivo = Archivo({
  subsets: ['latin', 'latin-ext'],
  axes: ['wdth'],
  variable: '--font-archivo',
  display: 'swap',
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
})

export const metadata = {
title: 'My Suite',
description: 'CRM + Time Tracking Suite',
}


export default function RootLayout({ children }: { children: React.ReactNode }) {
return (
<html lang="en" suppressHydrationWarning className={`light ${archivo.variable} ${plexMono.variable}`}>
<body className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased">
<ThemeProvider>
<AuthProvider>
<LocaleProvider>
<div className="flex flex-col min-h-screen">
<HeaderWithNav />


<main className="flex-1">
<div className="w-full px-4 sm:px-6 lg:px-8">
<PageTransition>
{children}
</PageTransition>
</div>
</main>


<SiteFooter />
</div>
</LocaleProvider>
</AuthProvider>
</ThemeProvider>
</body>
</html>
)
}