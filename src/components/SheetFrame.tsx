'use client'

import { useImperativeHandle, useRef } from 'react'
import Link from 'next/link'
import { SheetCloseIcon } from './SheetCloseIcon'

export type SheetFrameHandle = {
  focusSelf: () => void
}

type SheetFrameProps = {
  overlay?: boolean
  closeTo?: string
  label?: string
  progress?: number
  glitch?: boolean
  onClose: () => void
  children: React.ReactNode
  ref?: React.Ref<SheetFrameHandle>
}

export function SheetFrame({
  overlay = false,
  closeTo,
  label,
  progress = 0,
  glitch = false,
  onClose,
  children,
  ref,
}: SheetFrameProps) {
  const frameRef = useRef<HTMLDivElement | null>(null)

  /** Foco no próprio dialog (sem anel no botão); Tab leva ao close. */
  useImperativeHandle(
    ref,
    () => ({
      focusSelf: (): void => {
        requestAnimationFrame(() => frameRef.current?.focus({ preventScroll: true }))
      },
    }),
    [],
  )

  return (
    <div
      className={`flex items-center justify-center overflow-hidden${
        overlay ? ' fixed inset-0 z-[90]' : ' absolute inset-0'
      }`}
    >
      {overlay ? (
        <div
          data-scrim
          className="absolute inset-0 bg-black/95"
          aria-hidden="true"
          onClick={onClose}
        />
      ) : null}
      <div
        ref={frameRef}
        className={`sheet outline-none${glitch ? ' is-glitch' : ''}`}
        role="dialog"
        tabIndex={-1}
        aria-modal={overlay ? true : undefined}
        aria-label={label}
      >
        <div className="sheet__body" data-lenis-prevent>
          {children}
        </div>
        <svg
          className="sheet__progress"
          viewBox="0 0 28 28"
          aria-hidden="true"
          style={{ '--progress': String(progress) } as React.CSSProperties}
        >
          <circle className="track" cx="14" cy="14" r="13" />
          <circle className="fill" cx="14" cy="14" r="13" />
        </svg>
        {closeTo ? (
          <Link href={closeTo} className="sheet__close" aria-label="Close">
            <SheetCloseIcon />
          </Link>
        ) : (
          <button type="button" className="sheet__close" aria-label="Close" onClick={onClose}>
            <SheetCloseIcon />
          </button>
        )}
      </div>
    </div>
  )
}
