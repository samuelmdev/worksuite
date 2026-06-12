'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { translations, type TranslationKey } from './translations'

export const locales = ['en', 'fi'] as const
export type Locale = (typeof locales)[number]

type Params = Record<string, string | number>

interface LocaleContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: TranslationKey, params?: Params) => string
}

const LocaleContext = createContext<LocaleContextType>({
  locale: 'en',
  setLocale: () => {},
  t: (key) => key,
})

function translate(locale: Locale, key: TranslationKey, params?: Params): string {
  let result = String(translations[locale][key] ?? translations.en[key] ?? key)
  if (!params) return result
  for (const [paramKey, value] of Object.entries(params)) {
    result = result.replace(`{${paramKey}}`, String(value))
  }
  return result
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('locale')
    if (saved === 'en' || saved === 'fi') {
      setLocaleState(saved)
    }
  }, [])

  useEffect(() => {
    if (!mounted) return
    document.documentElement.lang = locale
    localStorage.setItem('locale', locale)
  }, [locale, mounted])

  const setLocale = (next: Locale) => setLocaleState(next)

  const t = useMemo(
    () => (key: TranslationKey, params?: Params) => translate(locale, key, params),
    [locale]
  )

  return (
    <LocaleContext.Provider value={{ locale: mounted ? locale : 'en', setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  return useContext(LocaleContext)
}
