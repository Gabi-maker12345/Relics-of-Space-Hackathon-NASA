'use client'

import type { RelicStatus } from '@/data/relics'
import { STATUS_LABEL } from '@/utils/relics'

export function StatusBadge({ status = 'active' }: { status?: RelicStatus }) {
  return <span className={`badge badge--${status}`}>{STATUS_LABEL[status]}</span>
}
