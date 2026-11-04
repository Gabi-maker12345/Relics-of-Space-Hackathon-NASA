'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Providers } from '@/components/Providers'
import { CosmosBackground } from '@/components/CosmosBackground'
import { GlCanvas } from '@/components/GlCanvas'
import { ForgeHeader } from '@/components/ForgeHeader'
import { CosmosGate } from '@/components/CosmosGate'
import { ScrollProgress } from '@/components/ScrollProgress'
import { ProfilePanel } from '@/components/ProfilePanel'
import { ProjectModal } from '@/components/ProjectModal'
import { BootLoader } from '@/components/BootLoader'
import { initSmoothScroll, destroySmoothScroll } from '@/lib/smoothScroll'

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  useEffect(() => {
    initSmoothScroll()
    return () => destroySmoothScroll()
  }, [])

  useEffect(() => {
    if (pathname !== '/') window.scrollTo({ top: 0 })
  }, [pathname])

  return (
    <Providers>
      <div className="site">
        <CosmosBackground />
        <GlCanvas />
        <main className="site__main">{children}</main>
        <ForgeHeader />
        <CosmosGate />
        <ScrollProgress />
        <ProfilePanel />
        <ProjectModal />
        <BootLoader />
      </div>
    </Providers>
  )
}
