<script setup lang="ts">
import type { ChatMessage } from '~/composables/useRelicChat'

const {
  open,
  messages,
  relicName,
  sending,
  error,
  openChat,
  closeChat,
  reset,
  send,
} = useRelicChat()

const { t } = useI18n()

const text = ref('')
const logEl = ref<HTMLElement | null>(null)
const inputEl = ref<HTMLInputElement | null>(null)

/* Efeito de escrita: as respostas aparecem letra a letra. */
const typedId = ref<string | null>(null)
const typedText = ref('')
let typeTimer: ReturnType<typeof setTimeout> | null = null
let reduced = false

function cancelTyping(): void {
  if (typeTimer) {
    clearTimeout(typeTimer)
    typeTimer = null
  }
  typedId.value = null
  typedText.value = ''
}

function typeOut(message: ChatMessage): void {
  cancelTyping()
  if (reduced) return
  typedId.value = message.id
  typedText.value = ''
  let index = 0
  const step = (): void => {
    index += 2
    typedText.value = message.content.slice(0, index)
    if (index < message.content.length) typeTimer = setTimeout(step, 16)
    else {
      typeTimer = null
      typedId.value = null
      typedText.value = ''
    }
  }
  typeTimer = setTimeout(step, 16)
}

watch(() => messages.value.length, (length, previous = 0) => {
  if (length <= previous) return
  const last = messages.value[length - 1]
  if (!last || last.role !== 'assistant') return
  typeOut(last)
})

const canSend = computed(() => text.value.trim().length > 0 && !sending.value)

function submit(): void {
  if (!canSend.value) return
  const value = text.value
  text.value = ''
  void send(value)
}

function onKeydown(event: KeyboardEvent): void {
  if (!open.value || event.key !== 'Escape') return
  event.preventDefault()
  event.stopPropagation()
  closeChat()
}

function applyChatStage(): void {
  const root = document.documentElement
  const engine = getGlEngine()
  if (!root.classList.contains('chat-open') || window.innerWidth < 1024) {
    root.style.removeProperty('--chat-stage-scale')
    root.style.removeProperty('--chat-left')
    engine?.setChatStage(1, 0)
    return
  }
  const height = window.innerHeight
  const scale = Math.max(0.55, Math.min(1, (height - 100) / 844))
  const left = Math.round(390 * scale + 48)
  root.style.setProperty('--chat-stage-scale', String(scale))
  root.style.setProperty('--chat-left', `${left}px`)
  engine?.setChatStage(scale, 844)
}

watch(open, async (value) => {
  document.documentElement.classList.toggle('chat-open', value)
  applyChatStage()
  void nextTick(() => {
    const engine = getGlEngine()
    engine?.resetCarousel()
    engine?.snapPlanes()
    // a coluna muda de largura depois do primeiro layout: cola outra vez
    window.setTimeout(() => engine?.snapPlanes(), 140)
  })
  if (!value) return
  await nextTick()
  inputEl.value?.focus()
})

watch([() => messages.value.length, sending, typedText], async () => {
  await nextTick()
  const el = logEl.value
  if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
})

onMounted(() => {
  window.addEventListener('keydown', onKeydown, true)
  window.addEventListener('resize', applyChatStage)
  reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown, true)
  window.removeEventListener('resize', applyChatStage)
  cancelTyping()
  document.documentElement.classList.remove('chat-open')
  getGlEngine()?.resetCarousel()
  getGlEngine()?.snapPlanes()
  reset()
})
</script>

<template>
  <Teleport to="body">
    <!-- type=transition: a animação infinita do glow faria o Vue esperar o
         animationend (3 s) e o bot deixava de estar no DOM tarde demais. -->
    <Transition name="chat-fab-fade" type="transition">
      <button
        v-if="!open"
        type="button"
        class="chat-fab"
        :aria-label="t('chat.open')"
        @click="openChat"
      >
        <svg class="chat-fab__spark" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3.5l1.7 5.1a4 4 0 0 0 2.6 2.6l5.2 1.7-5.2 1.7a4 4 0 0 0-2.6 2.6L12 22.3l-1.7-5.1a4 4 0 0 0-2.6-2.6L2.5 12.9l5.2-1.7a4 4 0 0 0 2.6-2.6L12 3.5Z" />
        </svg>
        <span>{{ t('chat.fab') }}</span>
      </button>
    </Transition>

    <Transition name="chat-panel">
      <aside v-if="open" class="chat" role="dialog" :aria-label="t('chat.title')">
        <header class="chat__head">
          <div class="chat__heading">
            <p class="chat__kicker">{{ t('chat.kicker') }}</p>
            <h2 class="chat__title">{{ t('chat.title') }}</h2>
            <p v-if="relicName" class="chat__context">{{ t('chat.about', { name: relicName }) }}</p>
            <p v-else class="chat__context">{{ t('chat.idle') }}</p>
          </div>
          <button type="button" class="chat__close" :aria-label="t('common.close')" @click="closeChat">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
            </svg>
          </button>
        </header>

        <div ref="logEl" class="chat__log" aria-live="polite">
          <div v-if="messages.length === 0" class="chat__empty">
            <p class="chat__emptyKicker">{{ t('chat.kicker') }}</p>
            <p class="chat__emptyText">{{ t('chat.greeting') }}</p>
          </div>

          <div
            v-for="message in messages"
            :key="message.id"
            class="chat__msg"
            :class="`chat__msg--${message.role}`"
          >
            <p>{{ message.id === typedId ? typedText : message.content }}</p>
          </div>
          <p v-if="sending" class="chat__typing">
            <span /><span /><span />
            <em>{{ t('chat.thinking') }}</em>
          </p>
          <p v-if="error" class="chat__error" role="alert">{{ error }}</p>
        </div>

        <form class="chat__composer" @submit.prevent="submit">
          <div class="chat__field">
            <input
              ref="inputEl"
              v-model="text"
              class="chat__input"
              type="text"
              :placeholder="relicName ? t('chat.placeholderRelic', { name: relicName }) : t('chat.placeholder')"
              autocomplete="off"
              enterkeyhint="send"
              :disabled="sending"
            >
            <button
              type="submit"
              class="chat__send"
              :class="{ 'is-armed': canSend }"
              :disabled="!canSend"
              :aria-label="t('chat.send')"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 19V5M6 11l6-6 6 6" />
              </svg>
            </button>
          </div>
          <p class="chat__hint">{{ t('chat.hint') }}</p>
        </form>
      </aside>
    </Transition>
  </Teleport>
</template>

<style scoped>
.chat-fab {
  position: fixed;
  right: clamp(16px, 2.6vw, 32px);
  bottom: clamp(16px, 2.6vw, 32px);
  z-index: 96;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 13px 18px;
  border: 0;
  border-radius: 999px;
  background: #f2f1ed;
  color: #0b0b0b;
  font-family: "Inter Variable", Arial, sans-serif;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  cursor: pointer;
  box-shadow:
    0 0 0 1px rgb(255 255 255 / 0.25),
    0 12px 32px rgb(0 0 0 / 0.5),
    0 0 22px rgb(255 255 255 / 0.28);
  animation: chat-fab-glow 3s ease-in-out infinite;
  transition: transform 0.25s cubic-bezier(0.23, 1, 0.32, 1);
}

.chat-fab:hover {
  transform: translateY(-2px) scale(1.02);
}

.chat-fab__spark {
  width: 15px;
  height: 15px;
  fill: currentColor;
  animation: chat-spark 4s ease-in-out infinite;
}

@keyframes chat-fab-glow {
  0%,
  100% {
    box-shadow:
      0 0 0 1px rgb(255 255 255 / 0.25),
      0 12px 32px rgb(0 0 0 / 0.5),
      0 0 18px rgb(255 255 255 / 0.22);
  }
  50% {
    box-shadow:
      0 0 0 1px rgb(255 255 255 / 0.4),
      0 12px 32px rgb(0 0 0 / 0.55),
      0 0 32px rgb(255 255 255 / 0.42);
  }
}

@keyframes chat-spark {
  0%,
  100% {
    transform: rotate(0deg) scale(1);
  }
  50% {
    transform: rotate(18deg) scale(1.08);
  }
}

.chat {
  position: fixed;
  top: clamp(76px, 9vh, 100px);
  right: clamp(12px, 2vw, 24px);
  bottom: clamp(12px, 2vw, 24px);
  z-index: 95;
  display: flex;
  flex-direction: column;
  width: var(--chat-w, clamp(360px, 32vw, 480px));
  overflow: hidden;
  border: 1px solid rgb(255 255 255 / 0.16);
  border-radius: 18px;
  color: #f2f1ed;
  font-family: "Inter Variable", Arial, sans-serif;
  background: rgb(4 5 9 / 0.44);
  backdrop-filter: blur(9px) saturate(108%);
  -webkit-backdrop-filter: blur(9px) saturate(108%);
  box-shadow: 0 30px 80px rgb(0 0 0 / 0.45);
}

.chat__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 18px 14px;
  border-bottom: 1px solid rgb(255 255 255 / 0.08);
}

.chat__kicker {
  margin: 0 0 6px;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: rgb(242 241 237 / 0.45);
}

.chat__title {
  margin: 0;
  font-family: "Newsreader Variable", Georgia, serif;
  font-size: 24px;
  font-weight: 300;
  letter-spacing: -0.02em;
  line-height: 1;
}

.chat__context {
  margin: 8px 0 0;
  font-size: 11px;
  line-height: 1.4;
  color: rgb(242 241 237 / 0.55);
}

.chat__close {
  display: grid;
  flex: none;
  place-items: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid rgb(255 255 255 / 0.16);
  border-radius: 50%;
  background: transparent;
  color: inherit;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.25s, border-color 0.25s;
}

.chat__close:hover {
  opacity: 1;
  border-color: rgb(255 255 255 / 0.4);
}

.chat__close svg {
  width: 12px;
  height: 12px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.2;
  stroke-linecap: round;
}

.chat__log {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 10px;
  padding: 16px 18px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
}

.chat__empty {
  display: grid;
  place-content: center;
  gap: 14px;
  flex: 1 1 auto;
  padding: 24px 10px;
  text-align: center;
}

.chat__emptyKicker {
  margin: 0;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: rgb(242 241 237 / 0.38);
}

.chat__emptyText {
  margin: 0 auto;
  max-width: 16ch;
  font-family: "Newsreader Variable", Georgia, serif;
  font-size: clamp(24px, 2.4vw, 34px);
  font-weight: 300;
  line-height: 1.15;
  letter-spacing: -0.02em;
  text-wrap: balance;
  color: rgb(242 241 237 / 0.92);
}

.chat__msg {
  max-width: 88%;
  padding: 10px 12px;
  border-radius: 14px;
  font-size: 13px;
  line-height: 1.5;
  animation: chat-msg-in 0.34s cubic-bezier(0.22, 1, 0.36, 1);
}

.chat__msg p {
  margin: 0;
}

.chat__msg--assistant {
  align-self: flex-start;
  border: 1px solid rgb(255 255 255 / 0.09);
  border-bottom-left-radius: 4px;
  background: rgb(255 255 255 / 0.05);
  color: rgb(242 241 237 / 0.92);
}

.chat__msg--user {
  align-self: flex-end;
  border: 1px solid rgb(255 255 255 / 0.16);
  border-bottom-right-radius: 4px;
  background: rgb(255 255 255 / 0.07);
  color: #f2f1ed;
}

.chat__typing {
  display: inline-flex;
  align-self: flex-start;
  align-items: center;
  gap: 4px;
  margin: 0;
  padding: 8px 12px;
  border-radius: 12px;
  background: rgb(255 255 255 / 0.04);
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(242 241 237 / 0.5);
  animation: chat-msg-in 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.chat__typing span {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: currentColor;
  animation: chat-dot 1.2s ease-in-out infinite;
}

.chat__typing span:nth-child(2) {
  animation-delay: 0.15s;
}

.chat__typing span:nth-child(3) {
  animation-delay: 0.3s;
}

.chat__typing em {
  margin-left: 6px;
  font-style: normal;
}

@keyframes chat-dot {
  0%,
  100% {
    opacity: 0.25;
  }
  50% {
    opacity: 1;
  }
}

@keyframes chat-msg-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}

.chat-fab-fade-enter-active {
  transition: opacity 0.26s ease;
}

.chat-fab-fade-leave-active {
  transition: opacity 0.18s ease;
}

.chat-fab-fade-enter-from,
.chat-fab-fade-leave-to {
  opacity: 0;
}

.chat__error {
  margin: 0;
  font-size: 11px;
  line-height: 1.4;
  color: #ff9a9a;
}

.chat__composer {
  padding: 12px 14px 14px;
  border-top: 1px solid rgb(255 255 255 / 0.08);
}

.chat__field {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 6px 6px 14px;
  border: 1px solid rgb(255 255 255 / 0.14);
  border-radius: 14px;
  background: rgb(255 255 255 / 0.04);
  transition: border-color 0.25s, box-shadow 0.25s;
}

.chat__field:focus-within {
  border-color: rgb(255 255 255 / 0.45);
  box-shadow: 0 0 0 3px rgb(255 255 255 / 0.08);
}

.chat__input {
  flex: 1 1 auto;
  min-width: 0;
  padding: 8px 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 13px;
  outline: none;
}

.chat__input::placeholder {
  color: rgb(242 241 237 / 0.4);
}

.chat__input:disabled {
  opacity: 0.6;
}

.chat__send {
  display: grid;
  flex: none;
  place-items: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: 10px;
  background: rgb(255 255 255 / 0.1);
  color: rgb(242 241 237 / 0.5);
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s, transform 0.16s;
}

.chat__send svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.chat__send.is-armed {
  background: #f2f1ed;
  color: #0b0b0b;
}

.chat__send.is-armed:hover {
  transform: translateY(-1px);
}

.chat__send:disabled {
  cursor: default;
}

.chat__hint {
  margin: 8px 2px 0;
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(242 241 237 / 0.32);
}

.chat-panel-enter-active,
.chat-panel-leave-active {
  transition: opacity 0.35s cubic-bezier(0.23, 1, 0.32, 1), transform 0.45s cubic-bezier(0.23, 1, 0.32, 1);
}

.chat-panel-enter-from,
.chat-panel-leave-to {
  opacity: 0;
  transform: translateY(18px) scale(0.98);
}

@media (max-width: 1023px) {
  /* No telemóvel o Zénite Bot ocupa tudo abaixo da navbar; a cena por baixo é
     escondida e o fundo é o cosmos (sem cartões nem barra a atravessar). */
  .chat {
    inset: 0;
    width: auto;
    height: auto;
    padding-top: env(safe-area-inset-top, 0px);
    border: 0;
    border-radius: 0;
    background: rgb(4 5 9 / 0.5);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

  .chat-fab {
    right: 14px;
    bottom: 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .chat-fab,
  .chat-fab__spark,
  .chat__typing span {
    animation: none;
  }

  .chat__msg,
  .chat__typing {
    animation: none;
  }

  .chat-fab-fade-enter-active,
  .chat-fab-fade-leave-active {
    transition: none;
  }
}
</style>
