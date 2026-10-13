import React from 'react'

/**
 * Hero backdrop: a slow mesh gradient built from the module colours, so the
 * background belongs to this product rather than being generic decoration.
 * Each field maps to a module — cyan CRM, violet Projects, emerald Time,
 * gold Finance — the same palette as the chain directly below it.
 *
 * The colour and grid rules live in globals.css: Tailwind v4 does not resolve
 * theme() inside arbitrary values, so writing them here would silently produce
 * no background at all.
 *
 * Purely presentational — no pointer events, hidden from assistive tech.
 */
export default function HeroBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="hero-mesh-mask absolute inset-0">
        <div className="hero-blob hero-blob--crm hero-blob-a -top-[30%] -left-[12%] w-[45rem] h-[45rem]" />
        <div className="hero-blob hero-blob--project hero-blob-b -top-[22%] left-[30%] w-[40rem] h-[40rem]" />
        <div className="hero-blob hero-blob--finance hero-blob-c -top-[18%] -right-[12%] w-[38rem] h-[38rem]" />
        {/* Emerald sits low and wide, leading the eye into the chain. */}
        <div className="hero-blob hero-blob--time hero-blob-b -bottom-[35%] left-[22%] w-[42rem] h-[30rem]" />
      </div>

      <div className="hero-grid hero-grid-mask absolute inset-0" />

      {/* Settle back to the page colour at the section edge. */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-white dark:to-slate-950" />
    </div>
  )
}
