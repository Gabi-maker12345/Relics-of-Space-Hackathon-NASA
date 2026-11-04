'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { getLang, loadLang, setLang, subscribeLang, type Lang } from '@/lib/locale'

export function useLocale() {
  const lang = useSyncExternalStore(subscribeLang, getLang, () => 'pt' as Lang)

  const toggle = useCallback(() => setLang(getLang() === 'pt' ? 'en' : 'pt'), [])

  return { lang, setLang, toggle, load: loadLang }
}
