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
      <section class="portal__card" role="dialog" aria-modal="true" aria-labelledby="portal-title">
        <div class="portal__logo" aria-hidden="true">
          <img src="/images/zenite-logo-web.png" alt="" width="958" height="693" decoding="async">
        </div>

        <h2 id="portal-title" class="sr-only">{{ t('login.title') }}</h2>
        <p class="portal__kicker">{{ t('login.kicker') }}</p>

        <form class="portal__form" novalidate @submit.prevent="submit">
          <label class="portal__field">
            <span class="portal__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="m3.5 7 7.3 5.6a2 2 0 0 0 2.4 0L20.5 7" /></svg>
            </span>
            <span class="sr-only">{{ t('login.email') }}</span>
            <input
              v-model="email"
              type="email"
              name="email"
              autocomplete="email"
              class="portal__input"
              :placeholder="t('login.email')"
            >
          </label>

          <label class="portal__field">
            <span class="portal__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><rect x="4.5" y="10" width="15" height="10.5" rx="2.5" /><path d="M8 10V7.5a4 4 0 0 1 8 0V10" /></svg>
            </span>
            <span class="sr-only">{{ t('login.password') }}</span>
            <input
              v-model="password"
              :type="reveal ? 'text' : 'password'"
              name="password"
              autocomplete="current-password"
              class="portal__input"
              :placeholder="t('login.password')"
            >
            <button
              type="button"
              class="portal__eye"
              :aria-pressed="reveal"
              :aria-label="reveal ? t('login.hide') : t('login.reveal')"
              @click="reveal = !reveal"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M1.8 12S5.6 5.8 12 5.8 22.2 12 22.2 12 18.4 18.2 12 18.2 1.8 12 1.8 12Z" />
                <circle cx="12" cy="12" r="3.2" />
                <path v-if="reveal" d="M4 20 20 4" />
              </svg>
            </button>
          </label>

          <div class="portal__row">
            <label class="portal__check">
              <input v-model="remember" type="checkbox" class="portal__cb">
              <span class="portal__box" aria-hidden="true">
                <svg viewBox="0 0 16 16"><path d="m3 8.5 3.2 3L13 4.5" /></svg>
              </span>
              <span>{{ t('login.remember') }}</span>
            </label>
            <a class="portal__forgot" :href="forgotHref">{{ t('login.forgot') }}</a>
          </div>

          <p v-if="errorText" class="portal__error" role="alert">{{ errorText }}</p>

          <button class="portal__submit" type="submit" :disabled="sending">
            {{ sending ? t('login.busy') : t('login.submit') }}
          </button>
        </form>

        <p class="portal__hint">{{ t('login.hint') }}</p>
      </section>
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
const remember = ref(true)
const sending = ref(false)

const forgotHref = computed(
  () => `mailto:contacto@zenite.team?subject=${encodeURIComponent(`Zénite — ${t('login.forgot')}`)}`,
)

onMounted(() => {
  try {
    const saved = window.localStorage.getItem('zenite:login-email')
    if (saved) email.value = saved
  }
  catch {
    /* sem localStorage */
  }
})

async function submit(): Promise<void> {
  if (sending.value) return
  sending.value = true
  try {
    const ok = await signIn(email.value, password.value)
    if (!ok) return
    try {
      if (remember.value) window.localStorage.setItem('zenite:login-email', email.value.trim().toLowerCase())
      else window.localStorage.removeItem('zenite:login-email')
    }
    catch {
      /* ignora */
    }
    password.value = ''
    close()
    await navigateTo('/admin')
  }
  finally {
    sending.value = false
  }
}
</script>

<style scoped>
.portal {
  position: fixed;
  left: 50%;
  top: 50%;
  z-index: 110;
  width: min(460px, calc(100vw - 32px));
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
  /* Fundo transparente: o cosmos/página fica visível; o véu só apanha o
     clique fora (o vidro do cartão é que faz o blur). */
  background: transparent;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.portal__inner {
  display: flex;
  justify-content: center;
}

.portal__card {
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 34px 34px 28px;
  overflow: hidden;
  color: #fff;
  text-align: left;
  border-radius: 42px;
  background:
    radial-gradient(120% 90% at 12% -10%, rgb(168 88 255 / 0.20) 0%, transparent 58%),
    radial-gradient(130% 110% at 106% 108%, rgb(70 110 255 / 0.22) 0%, transparent 62%),
    linear-gradient(152deg, rgb(255 255 255 / 0.12) 0%, rgb(255 255 255 / 0.03) 38%, rgb(255 255 255 / 0.08) 100%),
    rgb(10 8 20 / 0.16);
  border: 1px solid rgb(255 255 255 / 0.22);
  box-shadow:
    0 44px 120px rgb(0 0 0 / 0.45),
    0 26px 90px rgb(64 32 128 / 0.22),
    inset 0 1px 0 rgb(255 255 255 / 0.40),
    inset 0 -1px 0 rgb(255 255 255 / 0.07),
    inset 0 0 60px rgb(255 255 255 / 0.035);
  backdrop-filter: blur(34px) saturate(165%);
  -webkit-backdrop-filter: blur(34px) saturate(165%);
  text-shadow: 0 1px 2px rgb(0 0 0 / 0.18);
  transform: translateY(14px) scale(0.985);
  transition: transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
}

/* Reflexos do vidro: uma lâmina de luz no topo e uma linha de borda. */
.portal__card::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  border-radius: inherit;
  background:
    radial-gradient(65% 42% at 16% -8%, rgb(255 255 255 / 0.26) 0%, transparent 72%),
    radial-gradient(46% 32% at 92% 2%, rgb(255 255 255 / 0.10) 0%, transparent 76%),
    linear-gradient(122deg, transparent 30%, rgb(255 255 255 / 0.10) 46%, transparent 60%);
  mix-blend-mode: screen;
  opacity: 0.9;
}

.portal__card::after {
  content: '';
  position: absolute;
  inset: 1px;
  z-index: 0;
  pointer-events: none;
  border-radius: inherit;
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.35),
    inset 0 -1px 0 rgb(255 255 255 / 0.06);
}

.portal__card > * {
  position: relative;
  z-index: 1;
}

.portal.is-open .portal__card {
  transform: none;
}

.portal__logo {
  display: flex;
  justify-content: center;
  margin: 2px auto 16px;
}

.portal__logo img {
  display: block;
  width: 190px;
  max-width: 100%;
  height: auto;
  aspect-ratio: 958 / 693;
  object-fit: contain;
  filter: drop-shadow(0 10px 28px rgb(0 0 0 / 0.35));
}

.portal__kicker {
  margin: 0 0 16px;
  font-size: 9px;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  text-align: center;
  color: rgb(255 255 255 / 0.62);
}

.portal__form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.portal__field {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 7px 2px 9px;
  border-bottom: 1px solid rgb(255 255 255 / 0.42);
  transition: border-color 0.25s ease;
}

.portal__field:focus-within {
  border-color: rgb(255 255 255 / 0.92);
}

.portal__icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 22px;
  height: 22px;
  color: rgb(255 255 255 / 0.92);
}

.portal__icon svg {
  width: 19px;
  height: 19px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.portal__input {
  flex: 1 1 auto;
  min-width: 0;
  padding: 4px 0;
  font: inherit;
  font-size: 15px;
  letter-spacing: 0.01em;
  color: #fff;
  background: transparent;
  border: 0;
  outline: none;
}

.portal__input::placeholder {
  color: rgb(255 255 255 / 0.72);
  opacity: 1;
}

.portal__input:-webkit-autofill,
.portal__input:-webkit-autofill:hover,
.portal__input:-webkit-autofill:focus {
  -webkit-text-fill-color: #fff;
  -webkit-box-shadow: 0 0 0 1000px rgb(255 255 255 / 0.08) inset;
  caret-color: #fff;
  transition: background-color 9999s ease-out;
}

.portal__eye {
  display: grid;
  flex: none;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  color: rgb(255 255 255 / 0.72);
  background: transparent;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
}

.portal__eye:hover {
  color: #fff;
}

.portal__eye svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.portal__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 4px;
  font-size: 10.5px;
  letter-spacing: 0.02em;
  color: rgb(255 255 255 / 0.92);
}

.portal__check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.portal__cb {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

.portal__box {
  display: grid;
  flex: none;
  place-items: center;
  width: 13px;
  height: 13px;
  border: 1px solid rgb(255 255 255 / 0.8);
  border-radius: 2px;
  background: transparent;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.portal__box svg {
  width: 9px;
  height: 9px;
  fill: none;
  stroke: #1a0d26;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.portal__cb:checked + .portal__box {
  background: #fff;
  border-color: #fff;
}

.portal__cb:checked + .portal__box svg {
  opacity: 1;
}

.portal__cb:focus-visible + .portal__box {
  outline: 2px solid rgb(255 255 255 / 0.7);
  outline-offset: 2px;
}

.portal__forgot {
  color: rgb(255 255 255 / 0.86);
  text-decoration: none;
  white-space: nowrap;
}

.portal__forgot:hover {
  color: #fff;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.portal__error {
  margin: 0;
  font-size: 11.5px;
  line-height: 1.45;
  color: #ffd0d0;
}

.portal__submit {
  width: 100%;
  margin-top: 8px;
  padding: 16px 18px;
  font: inherit;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: #fff;
  background: rgb(255 255 255 / 0.06);
  border: 1px solid rgb(255 255 255 / 0.30);
  border-radius: 14px;
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.30),
    0 10px 26px rgb(0 0 0 / 0.18);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  cursor: pointer;
  transition: background-color 0.25s ease, border-color 0.25s ease, transform 0.25s ease;
}

.portal__submit:hover:not(:disabled) {
  background: rgb(255 255 255 / 0.12);
  border-color: rgb(255 255 255 / 0.52);
  transform: translateY(-1px);
}

.portal__submit:disabled {
  opacity: 0.6;
  cursor: default;
}

.portal__hint {
  margin: 16px 0 0;
  font-size: 9px;
  letter-spacing: 0.12em;
  text-align: center;
  color: rgb(255 255 255 / 0.5);
}

/* Apenas para leitores de ecrã (labels e título do diálogo). */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 520px) {
  .portal__card {
    padding: 28px 24px 22px;
    border-radius: 34px;
  }

  .portal__logo {
    margin-bottom: 12px;
  }

  .portal__logo img {
    width: 150px;
  }

  .portal__row {
    flex-wrap: wrap;
    gap: 8px;
  }
}
</style>
