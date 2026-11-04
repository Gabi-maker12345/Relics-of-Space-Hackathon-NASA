import { notFound } from 'next/navigation'

/** Qualquer rota desconhecida cai no `app/not-found.tsx` com status 404. */
export default function CatchAllPage(): never {
  notFound()
}
