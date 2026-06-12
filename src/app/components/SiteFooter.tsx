'use client'

import { useLocale } from '../lib/locale'

export default function SiteFooter() {
  const { t } = useLocale()
  const year = new Date().getFullYear()

  return (
    <footer className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 py-4">
      <div className="w-full px-4 sm:px-6 lg:px-8 text-sm text-gray-600 dark:text-slate-400">
        © {year} {t('footer.copyright')}
      </div>
    </footer>
  )
}
