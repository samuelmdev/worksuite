'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useLocale } from '../lib/locale'

export default function LocaleSwitcher() {
  const { locale, setLocale } = useLocale()
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => setMounted(true), [])

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'fi', name: 'Suomi', flag: '🇫🇮' }
  ]

  const currentLanguage = languages.find(lang => lang.code === locale) || languages[0]

  const updateMenuPos = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    }
  }

  const toggleOpen = () => {
    if (!isOpen) updateMenuPos()
    setIsOpen((open) => !open)
  }

  const closeMenu = () => setIsOpen(false)

  const handleLanguageChange = (langCode: 'en' | 'fi') => {
    setLocale(langCode)
    closeMenu()
  }

  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        className="flex items-center justify-center h-10 w-10 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shrink-0"
      >
        <span className="text-lg leading-none">{currentLanguage.flag}</span>
      </button>

      {mounted && createPortal(
        <>
          {isOpen && (
            <>
              <div
                className="fixed inset-0 z-[60]"
                onClick={closeMenu}
              />
              <div
                className="fixed bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-[70] min-w-[10rem]"
                style={{ top: menuPos.top, right: menuPos.right }}
              >
                {languages.map((language) => (
                  <button
                    key={language.code}
                    type="button"
                    onClick={() => handleLanguageChange(language.code as 'en' | 'fi')}
                    className={`w-full flex items-center space-x-2 px-3 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${
                      locale === language.code ? 'bg-slate-100 dark:bg-slate-700' : ''
                    }`}
                  >
                    <span className="text-lg">{language.flag}</span>
                    <span className="text-slate-900 dark:text-slate-100">{language.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </>,
        document.body
      )}
    </div>
  )
}
