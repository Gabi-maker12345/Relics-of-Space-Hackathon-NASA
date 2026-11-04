'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { isMuted, loadMutedFromStorage, setMutedFlag, subscribeMuted } from '@/lib/soundState'

export function useSound() {
  const muted = useSyncExternalStore(subscribeMuted, isMuted, () => true)

  const toggle = useCallback(() => setMutedFlag(!isMuted()), [])

  return { muted, load: loadMutedFromStorage, setMuted: setMutedFlag, toggle }
}
