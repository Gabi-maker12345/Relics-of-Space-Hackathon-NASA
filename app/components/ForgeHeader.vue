<script setup lang="ts">
import { scrollToElement, setSmoothScrollEnabled } from '~/composables/useSmoothScroll'

const { toggle: togglePanel } = usePanels()
const { act, reset } = useAct()
const { user } = useAuth()
const { lang, toggle: toggleLang } = useLocale()
const { muted, toggle: toggleSound } = useSound()
const { t } = useI18n()
const route = useRoute()

const menuOpen = ref(false)
const contactOpen = ref(false)
const burger = ref<HTMLButtonElement | null>(null)
const menu = ref<HTMLElement | null>(null)

/** Um item por secção da landing; a ordem segue a leitura da página. */
const sections = [
  { key: 'nav.home', id: 'top' },
  { key: 'nav.relics', id: 'relics' },
  { key: 'nav.missions', id: 'missions' },
  { key: 'nav.archive', id: 'archive' },
] as const

/**
 * Os antigos ícones do header vivem agora dentro de "contacto": três canais em
 * grande escala. O email fica como linha discreta — era o quarto canal e não
 * justifica um quarto ícone.
 */
const channels = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/zanecarrie9/',
    path: 'M4.6 1.8h6.8a2.8 2.8 0 0 1 2.8 2.8v6.8a2.8 2.8 0 0 1-2.8 2.8H4.6a2.8 2.8 0 0 1-2.8-2.8V4.6a2.8 2.8 0 0 1 2.8-2.8Zm0 1.3a1.5 1.5 0 0 0-1.5 1.5v6.8a1.5 1.5 0 0 0 1.5 1.5h6.8a1.5 1.5 0 0 0 1.5-1.5V4.6a1.5 1.5 0 0 0-1.5-1.5H4.6ZM8 5.1a2.9 2.9 0 1 1 0 5.8 2.9 2.9 0 0 1 0-5.8Zm0 1.3a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2Zm3.4-1.9a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5Z',
  },
  {
    label: 'X',
    href: 'https://x.com/Zane_littleboy',
    path: 'M2.2 2h3.3l3 4.1L12 2h1.8L9.2 7.7 14 14h-3.3L7.5 9.6 3.9 14H2.1l4.8-5.9L2.2 2Zm1.6 1.1 8 9.8h1.1l-8-9.8H3.8Z',
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/gabriel-cristóvão-a509113b4',
    path: 'M3.1 2.3a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5ZM2 5.7h2.2V14H2V5.7Zm3.7 0h2.1v1.1h.03c.3-.56 1.03-1.15 2.12-1.15 2.27 0 2.69 1.5 2.69 3.44V14H10.5V9.6c0-1.05-.02-2.4-1.46-2.4-1.46 0-1.68 1.14-1.68 2.32V14H5.7V5.7Z',
  },
] as const

const email = 'contacto@zenite.team'

/** Na landing, o logo fecha o segundo acto e volta ao topo em vez de "não fazer nada". */
function onLogoClick(event: MouseEvent): void {
  closeMenu()
  if (route.path !== '/') return
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
  event.preventDefault()
  if (act.value !== 'page') reset()
  window.scrollTo({ top: 0 })
}

function toggleMenu(): void {
  menuOpen.value = !menuOpen.value
}

function closeMenu(): void {
  menuOpen.value = false
}

/** Fecha o menu, garante o primeiro acto e desliza até à secção pedida. */
function goTo(id: string): void {
  closeMenu()
  if (act.value !== 'page') reset()
  void nextTick(() => {
    const section = document.getElementById(id)
    if (section) scrollToElement(section)
  })
}

function openProfile(): void {
  closeMenu()
  togglePanel('profile')
}

/**
 * O contacto abre ao pairar (rato) e ao tocar (telemóvel). O `pointerType`
 * decide: só o rato ganha revelação por hover, senão o toque revelaria e
 * fechava no mesmo gesto. Como os ícones ficam centrados no ecrã, a saída do
 * botão não os esconde de imediato: há uma janela para o ponteiro os alcançar.
 */
let hideContactTimer: ReturnType<typeof setTimeout> | null = null

function showContact(): void {
  if (hideContactTimer) {
    clearTimeout(hideContactTimer)
    hideContactTimer = null
  }
  contactOpen.value = true
}

function onContactEnter(event: PointerEvent): void {
  if (event.pointerType === 'mouse') showContact()
}

function onContactLeave(event: PointerEvent): void {
  if (event.pointerType !== 'mouse') return
  if (hideContactTimer) clearTimeout(hideContactTimer)
  hideContactTimer = setTimeout(() => {
    contactOpen.value = false
    hideContactTimer = null
  }, 350)
}

function toggleContact(): void {
  if (contactOpen.value) {
    contactOpen.value = false
    return
  }
  showContact()
}

/**
 * No rato o clique só confirma o que o hover já revelou (fechar é sair da
 * área); no toque não há hover, por isso o toque alterna.
 */
function onContactClick(event: PointerEvent): void {
  if (event.pointerType === 'touch' || event.pointerType === 'pen') {
    toggleContact()
    return
  }
  showContact()
}

watch(menuOpen, async (open) => {
  if (!import.meta.client) return
  document.documentElement.classList.toggle('is-menu-open', open)
  setSmoothScrollEnabled(!open)
  if (open) {
    await nextTick()
    menu.value?.querySelector<HTMLElement>('.fr-menu__link')?.focus()
    return
  }
  contactOpen.value = false
  if (hideContactTimer) {
    clearTimeout(hideContactTimer)
    hideContactTimer = null
  }
  if (menu.value?.contains(document.activeElement)) burger.value?.focus()
})

watch(() => route.path, () => closeMenu())

/** Escape em camadas (contacto → menu) e Tab preso ao diálogo enquanto aberto. */
function onKeydown(event: KeyboardEvent): void {
  if (!menuOpen.value) return
  if (event.key === 'Escape') {
    event.preventDefault()
    if (contactOpen.value) contactOpen.value = false
    else closeMenu()
    return
  }
  if (event.key !== 'Tab' || !menu.value) return
  const focusables = Array.from(
    menu.value.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
  )
  if (focusables.length === 0) return
  const first = focusables[0]!
  const last = focusables[focusables.length - 1]!
  const active = document.activeElement
  if (event.shiftKey && (active === first || !menu.value.contains(active))) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  if (hideContactTimer) clearTimeout(hideContactTimer)
})
</script>

<template>
  <header class="fr-header fr">
    <NuxtLink id="logo-slot" to="/" class="fr-logo" :aria-label="`Zénite — ${t('nav.home')}`" @click="onLogoClick">
      <img src="/images/zenite-logo-animavel.svg" alt="Zénite" width="498" height="366" decoding="async" />
    </NuxtLink>

    <div class="fr-nav">
      <button
        type="button"
        class="fr-lang"
        :aria-label="`${lang === 'pt' ? 'PT' : 'EN'} — ${t('nav.langTo')}`"
        @click="toggleLang"
      >{{ lang === 'pt' ? 'PT' : 'EN' }}</button>

      <button
        type="button"
        class="fr-sound"
        :aria-pressed="!muted"
        :aria-label="muted ? t('nav.soundOn') : t('nav.soundOff')"
        @click="toggleSound"
      >
        <svg viewBox="0 0 20 16" aria-hidden="true">
          <path d="M2 6h3l4.5-3.4v10.8L5 10H2z" />
          <path v-if="muted" d="M13 5.5l4 5M17 5.5l-4 5" />
          <path v-else d="M13.4 5.2a3.6 3.6 0 0 1 0 5.6M15.6 3.2a6.4 6.4 0 0 1 0 9.6" />
        </svg>
      </button>

      <button
        ref="burger"
        type="button"
        class="fr-burger"
        :class="{ 'is-open': menuOpen }"
        :aria-expanded="menuOpen"
        aria-controls="site-menu"
        :aria-label="menuOpen ? t('nav.closeMenu') : t('nav.menu')"
        @click="toggleMenu"
      >
        <span class="fr-burger__line" />
        <span class="fr-burger__line" />
      </button>
    </div>

    <div
      id="site-menu"
      ref="menu"
      class="fr-menu"
      :class="{ 'is-open': menuOpen, 'is-contact': contactOpen }"
      role="dialog"
      :aria-label="t('nav.menu')"
      @pointerdown.self="closeMenu"
    >
      <nav class="fr-menu__nav" :aria-label="t('nav.menu')">
        <ul class="fr-menu__list">
          <li
            v-for="(item, index) in sections"
            :key="item.id"
            class="fr-menu__item"
            :style="{ '--i': index }"
          >
            <a class="fr-menu__link" :href="`#${item.id}`" @click.prevent="goTo(item.id)">{{ t(item.key) }}</a>
          </li>
          <li class="fr-menu__item fr-menu__item--contact" :style="{ '--i': sections.length }">
            <button
              type="button"
              class="fr-menu__link fr-menu__contact"
              aria-controls="contact-layer"
              :aria-expanded="contactOpen"
              @pointerenter="onContactEnter"
              @pointerleave="onContactLeave"
              @focus="showContact"
              @click="onContactClick"
            >{{ t('nav.contact') }}</button>
          </li>
        </ul>
      </nav>

      <div class="fr-menu__utils">
        <NuxtLink
          v-if="user && route.path !== '/admin'"
          to="/admin"
          class="fr-menu__util"
          @click="closeMenu"
        >{{ t('nav.panel') }}</NuxtLink>
        <NuxtLink
          v-else-if="user"
          to="/"
          class="fr-menu__util"
          @click="closeMenu"
        >{{ t('nav.archive') }}</NuxtLink>
        <button
          v-else
          type="button"
          class="fr-menu__util"
          :aria-expanded="false"
          aria-controls="profile-panel"
          @click="openProfile"
        >{{ t('nav.enter') }}</button>
      </div>
    </div>

    <div
      id="contact-layer"
      class="fr-contact-layer"
      :class="{ 'is-open': contactOpen }"
      :aria-hidden="!contactOpen"
    >
      <div
        class="fr-contact-layer__cluster"
        @pointerenter="onContactEnter"
        @pointerleave="onContactLeave"
      >
        <div class="fr-contact-layer__row" role="group" :aria-label="t('nav.contactChannels')">
          <a
            v-for="(channel, index) in channels"
            :key="channel.label"
            class="fr-contact-layer__link"
            :href="channel.href"
            :aria-label="channel.label"
            target="_blank"
            rel="noopener noreferrer"
            :style="{ '--i': index }"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path :d="channel.path" />
            </svg>
          </a>
        </div>
        <a class="fr-contact-layer__mail" :href="`mailto:${email}`">{{ email }}</a>
      </div>
    </div>
  </header>
</template>
