'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { type Lang, t } from './translations'

interface LanguageContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  /** Resolve a translation key to a string for the current language */
  tr: (node: { en: string; nl: string }) => string
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'en',
  setLang: () => {},
  tr: (node) => node.en,
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en')

  useEffect(() => {
    const stored = localStorage.getItem('jobba_lang') as Lang | null
    if (stored === 'nl' || stored === 'en') setLangState(stored)
  }, [])

  function setLang(l: Lang) {
    setLangState(l)
    localStorage.setItem('jobba_lang', l)
  }

  function tr(node: { en: string; nl: string }): string {
    return node[lang]
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, tr }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}

// Re-export t so consumers only need one import
export { t }
