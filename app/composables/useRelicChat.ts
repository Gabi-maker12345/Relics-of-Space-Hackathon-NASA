export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

let sequence = 0

const nextId = (): string => {
  sequence += 1
  return `msg-${Date.now().toString(36)}-${sequence}`
}

/**
 * Estado do chat do arquivo. Vive em `useState` para sobreviver à navegação
 * dentro da cena; a conversa é enviada ao servidor sem a chave da IA.
 */
export function useRelicChat() {
  const { t, lang } = useI18n()

  const open = useState('relic-chat-open', () => false)
  const messages = useState<ChatMessage[]>('relic-chat-messages', () => [])
  const relicId = useState<string | null>('relic-chat-relic', () => null)
  const relicName = useState('relic-chat-name', () => '')
  const sending = useState('relic-chat-sending', () => false)
  const error = useState('relic-chat-error', () => '')

  function ensureGreeting(): void {
    if (messages.value.length > 0) return
    messages.value = [{ id: nextId(), role: 'assistant', content: t('chat.greeting') }]
  }

  function openChat(): void {
    open.value = true
    error.value = ''
    ensureGreeting()
  }

  function closeChat(): void {
    open.value = false
  }

  function reset(): void {
    open.value = false
    messages.value = []
    relicId.value = null
    relicName.value = ''
    sending.value = false
    error.value = ''
  }

  async function request(): Promise<void> {
    sending.value = true
    error.value = ''
    try {
      const history = messages.value.slice(-12).map(message => ({
        role: message.role,
        content: message.content,
      }))
      const result = await $fetch<{ reply: string }>('/api/chat', {
        method: 'POST',
        body: {
          lang: lang.value,
          relicId: relicId.value ?? undefined,
          messages: history,
        },
      })
      messages.value = [...messages.value, { id: nextId(), role: 'assistant', content: result.reply }]
    }
    catch (err: unknown) {
      const apiError = err as { data?: { message?: string }, message?: string }
      error.value = apiError.data?.message || t('chat.error')
    }
    finally {
      sending.value = false
    }
  }

  async function send(text: string): Promise<void> {
    const content = text.trim()
    if (!content || sending.value) return
    ensureGreeting()
    messages.value = [...messages.value, { id: nextId(), role: 'user', content }]
    await request()
  }

  /** Clique num painel da cena: abre o chat e começa a falar da relíquia. */
  async function askAbout(relic: { id: string, name: string }): Promise<void> {
    if (sending.value) return
    openChat()
    relicId.value = relic.id
    relicName.value = relic.name
    await send(t('chat.ask', { name: relic.name }))
  }

  return {
    open,
    messages,
    relicId,
    relicName,
    sending,
    error,
    openChat,
    closeChat,
    reset,
    send,
    askAbout,
  }
}
