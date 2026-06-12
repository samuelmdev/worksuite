
import React from 'react'
import './globals.css'
import { LocaleProvider } from './lib/locale'
import { ThemeProvider } from './lib/theme'
import { AuthProvider } from './lib/auth-context-multi-org'
import HeaderWithNav from './components/HeaderWithNav'
import SiteFooter from './components/SiteFooter'
import PageTransition from './components/PageTransition'


export const metadata = {
title: 'My Suite',
description: 'CRM + Time Tracking Suite',
}


export default function RootLayout({ children }: { children: React.ReactNode }) {
return (
<html lang="en" suppressHydrationWarning className="light">
<body className="min-h-screen bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100">
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