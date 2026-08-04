"use client"

import { createContext, useContext, useEffect, useState } from "react"

export type Language = "ar" | "en"

type LanguageContextType = {
  lang: Language
  setLang: (lang: Language) => void
  t: (ar: string, en: string) => string
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "ar",
  setLang: () => {},
  t: (ar) => ar,
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("ar")

  useEffect(() => {
    const saved = localStorage.getItem("app_lang") as Language
    if (saved === "ar" || saved === "en") {
      setLangState(saved)
      document.documentElement.dir = saved === "ar" ? "rtl" : "ltr"
      document.documentElement.lang = saved
    }
  }, [])

  const setLang = (newLang: Language) => {
    setLangState(newLang)
    localStorage.setItem("app_lang", newLang)
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr"
    document.documentElement.lang = newLang
  }

  const t = (ar: string, en: string) => (lang === "ar" ? ar : en)

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
