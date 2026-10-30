type SubscribeBody = { email?: string; company?: string }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const OK_MESSAGE = "Thanks — you're on the list."

// Mock de POST /api/subscribe — SPEC §7 (resposta [NÃO DETERMINADO] → {ok,message}).
export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as SubscribeBody | undefined
  const email = typeof body?.email === 'string' ? body.email : ''
  const company = typeof body?.company === 'string' ? body.company : ''
  await new Promise((resolve) => setTimeout(resolve, 800))
  if (company.length > 0) {
    // honeypot preenchido: sucesso silencioso
    return { ok: true, message: OK_MESSAGE }
  }
  if (!EMAIL_RE.test(email)) {
    return { ok: false, message: 'Please enter a valid email address.' }
  }
  return { ok: true, message: OK_MESSAGE }
})
