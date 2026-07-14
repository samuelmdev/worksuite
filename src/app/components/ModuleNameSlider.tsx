'use client'

import React from 'react'
import { useLocale } from '../lib/locale'
import type { TranslationKey } from '../lib/translations'

const MODULE_SLIDES: TranslationKey[] = [
  'nav.crm',
  'nav.timeTracking',
  'nav.projects',
  'nav.billing',
  'landing.fullSuite.f5',
]

function SlideTrack() {
  const { t } = useLocale()

  return (
    <>
      {MODULE_SLIDES.map((nameKey) => (
        <span
          key={nameKey}
          className="inline-flex items-center gap-3 shrink-0 text-lg sm:text-xl font-semibold tracking-tight whitespace-nowrap text-slate-500 dark:text-slate-400"
        >
          {t(nameKey)}
          <span className="text-slate-300 dark:text-slate-600 font-light" aria-hidden>·</span>
        </span>
      ))}
    </>
  )
}

function MarqueeHalf({ duplicate = false }: { duplicate?: boolean }) {
  return (
    <div className="flex items-center shrink-0" aria-hidden={duplicate || undefined}>
      <div className="shrink-0 w-screen" aria-hidden />
      <div className="flex items-center gap-10 sm:gap-14 px-5 sm:px-7 shrink-0">
        <SlideTrack />
      </div>
      <div className="shrink-0 w-[min(50vw,20rem)] sm:w-[min(40vw,28rem)]" aria-hidden />
    </div>
  )
}

const LIGHT_VIGNETTE =
  'linear-gradient(to right, rgb(248 250 252) 0%, rgba(248,250,252,0.75) 14%, rgba(248,250,252,0.48) 30%, rgba(248,250,252,0.26) 44%, rgba(248,250,252,0.12) 56%, rgba(248,250,252,0.04) 68%, transparent 82%), linear-gradient(to left, rgb(248 250 252) 0%, rgba(248,250,252,0.75) 14%, rgba(248,250,252,0.48) 30%, rgba(248,250,252,0.26) 44%, rgba(248,250,252,0.12) 56%, rgba(248,250,252,0.04) 68%, transparent 82%)'

const DARK_VIGNETTE =
  'linear-gradient(to right, rgb(2 6 23) 0%, rgba(2,6,23,0.75) 14%, rgba(2,6,23,0.48) 30%, rgba(2,6,23,0.26) 44%, rgba(2,6,23,0.12) 56%, rgba(2,6,23,0.04) 68%, transparent 82%), linear-gradient(to left, rgb(2 6 23) 0%, rgba(2,6,23,0.75) 14%, rgba(2,6,23,0.48) 30%, rgba(2,6,23,0.26) 44%, rgba(2,6,23,0.12) 56%, rgba(2,6,23,0.04) 68%, transparent 82%)'

export default function ModuleNameSlider() {
  return (
    <div className="relative mt-auto border-t border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
      <div
        className="absolute inset-0 z-10 pointer-events-none dark:hidden"
        aria-hidden
        style={{ background: LIGHT_VIGNETTE }}
      />
      <div
        className="absolute inset-0 z-10 pointer-events-none hidden dark:block"
        aria-hidden
        style={{ background: DARK_VIGNETTE }}
      />

      <div className="overflow-hidden py-4 sm:py-5">
        <div className="flex w-max animate-module-marquee hover:[animation-play-state:paused]">
          <MarqueeHalf />
          <MarqueeHalf duplicate />
        </div>
      </div>
    </div>
  )
}
