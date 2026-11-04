'use client'

import { RelicHero } from '@/components/RelicHero'
import { RelicApproach } from '@/components/RelicApproach'
import { RelicPanels } from '@/components/RelicPanels'
import { RelicArchive } from '@/components/RelicArchive'

export default function HomePage() {
  return (
    <div className="fr">
      <RelicHero />
      <RelicApproach />
      <RelicPanels />
      <RelicArchive />
    </div>
  )
}
