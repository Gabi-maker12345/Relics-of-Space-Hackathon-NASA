'use client'

import { RelicsProvider } from '@/hooks/useRelics'
import { AuthProvider } from '@/hooks/useAuth'
import { PanelsProvider } from '@/hooks/usePanels'
import { ProjectModalProvider } from '@/hooks/useProjectModal'
import { ActProvider } from '@/hooks/useAct'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <RelicsProvider>
      <AuthProvider>
        <PanelsProvider>
          <ProjectModalProvider>
            <ActProvider>{children}</ActProvider>
          </ProjectModalProvider>
        </PanelsProvider>
      </AuthProvider>
    </RelicsProvider>
  )
}
