import Link from 'next/link'

export default function NotFound() {
  return (
    <section className="fixed inset-0 flex flex-col items-center justify-center gap-y-15 px-20">
      <h2 className="text-35 tracking-[-0.035em] leading-14">Not found</h2>
      <Link href="/" className="label pointer-events-auto underline opacity-60">
        Home
      </Link>
    </section>
  )
}
