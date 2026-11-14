<template>
  <Teleport to="body">
    <div v-if="active === 'profile'" class="portal__veil" aria-hidden="true" />
  </Teleport>

  <div class="portal" :class="active === 'profile' ? 'is-open' : ''">
    <div
      data-gl-shield
      data-shield="profile"
      class="portal__inner"
      :class="active === 'profile' ? '' : 'pointer-events-none'"
    >
      <p class="portal__kicker" data-gl="text">{{ t('login.kicker') }}</p>
      <h2 class="portal__title" data-gl="text">{{ t('login.title') }}</h2>

      <form class="portal__form" novalidate @submit.prevent="submit">
        <label class="portal__field">
          <span class="portal__label" data-gl="text">{{ t('login.email') }}</span>
          <input
            v-model="email"
            type="email"
            name="email"
            autocomplete="email"
            class="portal__input"
            placeholder="nome@dominio.space"
          >
        </label>

        <label class="portal__field">
          <span class="portal__label" data-gl="text">{{ t('login.password') }}</span>
          <span class="portal__wrap">
            <input
              v-model="password"
              :type="reveal ? 'text' : 'password'"
              name="password"
              autocomplete="current-password"
              class="portal__input"
              placeholder="••••••••"
            >
            <button
              class="portal__reveal"
              type="button"
              :aria-pressed="reveal"
              tabindex="-1"
              @click="reveal = !reveal"
            >{{ reveal ? t('login.hide') : t('login.reveal') }}</button>
          </span>
        </label>

        <p v-if="errorText" class="portal__error" role="alert">{{ errorText }}</p>

        <button class="portal__submit" type="submit">
          <span>{{ t('login.submit') }}</span>
          <svg viewBox="0 0 24 12" aria-hidden="true"><path d="M0 6h22M17 1l5 5-5 5" /></svg>
        </button>
      </form>

      <p class="portal__hint" data-gl="text">
        {{ t('login.hint') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
const { active, close } = usePanels()
const { signIn, error } = useAuth()
const { t } = useI18n()

const errorText = computed(() => {
  switch (error.value) {
    case 'invalid_email': return t('login.errEmail')
    case 'short_password': return t('login.errPassword')
    case 'bad_credentials':
    case 'generic': return t('login.errCredentials')
    default: return ''
  }
})

const email = ref('')
const password = ref('')
const reveal = ref(false)

async function submit(): Promise<void> {
  const ok = await signIn(email.value, password.value)
  if (!ok) return
  password.value = ''
  close()
  await navigateTo('/admin')
}
</script>

<style scoped>
.portal {
  position: fixed;
  left: 50%;
  top: 50%;
  z-index: 110;
  width: min(560px, calc(100vw - 40px));
  transform: translate(-50%, -50%);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.45s ease, visibility 0.45s ease;
}

.portal.is-open {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

.portal__veil {
  position: fixed;
  inset: 0;
  z-index: 15;
  background: color-mix(in srgb, #03040a 78%, transparent);
  backdrop-filter: blur(6px) saturate(0.55);
  animation: veil-in 0.6s ease both;
}

@keyframes veil-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* O engine GL pinta estes textos por cima do véu; o DOM serve de layout.
   `color` fica intacto — é dele que o engine lê a cor dos glifos. */
.portal [data-gl="text"] {
  -webkit-text-fill-color: transparent;
}

.portal__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: #f5f3ee;
  text-align: center;
}

.portal__kicker {
  margin: 0;
  font-size: 9px;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  opacity: 0.5;
}

.portal__title {
  margin: 0 0 18px;
  font-family: var(--fr-serif, inherit);
  font-size: clamp(34px, 5vw, 52px);
  font-weight: 400;
  line-height: 0.9;
  letter-spacing: -0.04em;
}

.portal__form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: min(340px, 100%);
}

.portal__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: left;
}

.portal__label {
  font-size: 8.5px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  opacity: 0.62;
}

.portal__wrap { position: relative; display: block; }

.portal__input {
  width: 100%;
  padding: 8px 0 10px;
  font: inherit;
  font-size: 15px;
  letter-spacing: 0.01em;
  color: inherit;
  background: none;
  border: 0;
  border-bottom: 1px solid rgb(255 255 255 / 22%);
  outline: none;
  transition: border-color 0.25s ease;
}

.portal__input::placeholder { color: rgb(255 255 255 / 28%); }

.portal__input:focus-visible { border-color: #fff; }

.portal__reveal {
  position: absolute;
  right: 0;
  bottom: 12px;
  padding: 0;
  font-size: 8.5px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: inherit;
  opacity: 0.35;
  background: none;
  border: 0;
  cursor: pointer;
}

.portal__reveal:hover { opacity: 0.8; }

.portal__error {
  margin: -4px 0 0;
  font-size: 11.5px;
  line-height: 1.4;
  text-align: left;
  color: #ff9a9a;
}

.portal__submit {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 8px;
  padding: 15px 20px;
  font-size: 9.5px;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: #06070c;
  background: #f5f3ee;
  border: 0;
  cursor: pointer;
  transition: transform 0.3s ease, filter 0.3s ease;
}

.portal__submit svg {
  width: 24px;
  height: 12px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.2;
}

.portal__submit:hover { filter: brightness(1.06); }
.portal__submit:hover svg { transform: translateX(3px); transition: transform 0.3s ease; }

.portal__hint {
  margin: 14px 0 0;
  font-size: 9.5px;
  letter-spacing: 0.1em;
  opacity: 0.45;
}

.portal__hint code { font-size: 9px; }

@media (max-width: 560px) {
  .portal { width: calc(100vw - 32px); }
}
</style>
