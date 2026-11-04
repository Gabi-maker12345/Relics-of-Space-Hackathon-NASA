'use client'

import { createContext, useContext, useMemo, useState } from 'react'

type ProjectModalContextValue = {
  activeSlug: string | null
  open: (slug: string) => void
  close: () => void
}

const ProjectModalContext = createContext<ProjectModalContextValue | null>(null)

export function ProjectModalProvider({ children }: { children: React.ReactNode }) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null)

  const value = useMemo<ProjectModalContextValue>(
    () => ({
      activeSlug,
      open: (slug) => setActiveSlug(slug),
      close: () => setActiveSlug(null),
    }),
    [activeSlug],
  )

  return <ProjectModalContext.Provider value={value}>{children}</ProjectModalContext.Provider>
}

export function useProjectModal(): ProjectModalContextValue {
  const value = useContext(ProjectModalContext)
  if (!value) throw new Error('useProjectModal fora de <ProjectModalProvider>')
  return value
}
