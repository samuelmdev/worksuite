'use client'

import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Users, FolderOpen, Clock, FileText, Wallet } from 'lucide-react'
import { useLocale } from '../lib/locale'
import type { TranslationKey } from '../lib/translations'

/**
 * The path a single piece of work takes through the suite, drawn as one line.
 *
 * This is the product's actual data flow, not decoration — the same chain the
 * "how it fits together" section spells out in words. It earns the colour it
 * uses because each node is a real module.
 */
const NODES: {
  nameKey: TranslationKey
  icon: typeof Users
  dot: string
  ring: string
  text: string
}[] = [
  {
    nameKey: 'nav.crm',
    icon: Users,
    dot: 'bg-cyan-500',
    ring: 'ring-cyan-500/20 group-hover:ring-cyan-500/40',
    text: 'text-cyan-700 dark:text-cyan-300',
  },
  {
    nameKey: 'nav.projects',
    icon: FolderOpen,
    dot: 'bg-violet-500',
    ring: 'ring-violet-500/20 group-hover:ring-violet-500/40',
    text: 'text-violet-700 dark:text-violet-300',
  },
  {
    nameKey: 'nav.timeTracking',
    icon: Clock,
    dot: 'bg-emerald-500',
    ring: 'ring-emerald-500/20 group-hover:ring-emerald-500/40',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  {
    nameKey: 'nav.billing',
    icon: FileText,
    dot: 'bg-blue-500',
    ring: 'ring-blue-500/20 group-hover:ring-blue-500/40',
    text: 'text-blue-700 dark:text-blue-300',
  },
  {
    nameKey: 'nav.finance',
    icon: Wallet,
    dot: 'bg-amber-500',
    ring: 'ring-amber-500/20 group-hover:ring-amber-500/40',
    text: 'text-amber-700 dark:text-amber-300',
  },
]

export default function LandingChain() {
  const { t } = useLocale()
  const reduceMotion = useReducedMotion()

  return (
    <div className="relative">
      {/* The connecting line sits behind the nodes and stops short of both
          ends so it reads as a path between them, not a full-width rule. */}
      <div
        aria-hidden
        className="hidden sm:block absolute left-[10%] right-[10%] top-5 h-px bg-gradient-to-r from-cyan-500/30 via-emerald-500/30 to-amber-500/30"
      />

      <ol className="relative grid grid-cols-2 sm:grid-cols-5 gap-x-2 gap-y-6">
        {NODES.map((node, index) => {
          const Icon = node.icon
          return (
            <motion.li
              key={node.nameKey}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduceMotion ? 0 : 0.4 + index * 0.09, duration: 0.4 }}
              className="group flex flex-col items-center text-center"
            >
              <span
                className={`w-10 h-10 rounded-full bg-white dark:bg-slate-950 ring-8 ${node.ring} transition-all flex items-center justify-center`}
              >
                <span className={`w-8 h-8 rounded-full ${node.dot} flex items-center justify-center`}>
                  <Icon className="w-4 h-4 text-white" strokeWidth={2.25} />
                </span>
              </span>
              <span className={`mt-3 text-xs font-medium ${node.text}`}>
                {t(node.nameKey)}
              </span>
            </motion.li>
          )
        })}
      </ol>
    </div>
  )
}
