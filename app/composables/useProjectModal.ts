/**
 * Estado do modal de projeto (sheet com mídia placeholder).
 * Mantido em useState para sobreviver a navegações SPA.
 */
export function useProjectModal() {
  const activeSlug = useState<string | null>('project-modal', () => null)

  const open = (slug: string): void => {
    activeSlug.value = slug
  }

  const close = (): void => {
    activeSlug.value = null
  }

  return { activeSlug, open, close }
}
