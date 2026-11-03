<template>
  <Teleport to="body">
    <Transition name="login">
      <div
        v-if="active === 'profile'"
        id="profile-panel"
        class="login"
        data-gl-shield
        data-shield="profile"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
      >
        <button class="login__scrim" type="button" aria-label="Fechar" @click="close()" />
        <form class="login__card" @submit.prevent="submit">
          <p class="login__kicker">Arquivo · acesso restrito</p>
          <h2 id="login-title" class="login__title">Entrar</h2>
          <p class="login__lede">Autentica-te para abrir o painel de relíquias.</p>

          <label class="login__field">
            <span class="login__label">Email</span>
            <input
              v-model="email"
              type="email"
              name="email"
              autocomplete="email"
              class="login__input"
              placeholder="nome@dominio.space"
              required
            >
          </label>

          <label class="login__field">
            <span class="login__label">Palavra-passe</span>
            <input
              v-model="password"
              :type="reveal ? 'text' : 'password'"
              name="password"
              autocomplete="current-password"
              class="login__input"
              placeholder="••••••••"
              required
            >
            <button
              class="login__reveal"
              type="button"
              :aria-pressed="reveal"
              @click="reveal = !reveal"
            >{{ reveal ? 'Esconder' : 'Mostrar' }}</button>
          </label>

          <p v-if="error" class="login__error" role="alert">{{ error }}</p>

          <button class="login__submit" type="submit">
            <span>Entrar</span>
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8h10M8.5 3.5 13 8l-4.5 4.5" /></svg>
          </button>

          <p class="login__hint">
            Demo: <code>admin@spacerelics.space</code> · <code>relics2026</code>
          </p>
        </form>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const { active, close } = usePanels()
const { signIn, error } = useAuth()

const email = ref('')
const password = ref('')
const reveal = ref(false)

async function submit(): Promise<void> {
  if (!signIn(email.value, password.value)) return
  password.value = ''
  close()
  await navigateTo('/admin')
}
</script>

<style scoped>
.login {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: grid;
  place-items: center;
  padding: 20px;
}

.login__scrim {
  position: absolute;
  inset: 0;
  border: 0;
  background: color-mix(in srgb, #04050a 82%, transparent);
  backdrop-filter: blur(10px) saturate(0.7);
  cursor: default;
}

.login__card {
  position: relative;
  width: min(460px, 100%);
  padding: 38px 34px 30px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  color: var(--fr-fg, #e8e6e1);
  background:
    radial-gradient(120% 90% at 50% -10%, color-mix(in srgb, var(--accent, #7aa2ff) 18%, transparent), transparent 60%),
    color-mix(in srgb, #080a12 92%, transparent);
  border: 1px solid color-mix(in srgb, var(--fr-fg, #e8e6e1) 18%, transparent);
  box-shadow: 0 40px 120px rgb(0 0 0 / 65%), 0 0 0 1px rgb(255 255 255 / 4%) inset;
}

.login__card::before {
  content: '';
  position: absolute;
  inset: -1px;
  pointer-events: none;
  background: linear-gradient(120deg, transparent 30%, color-mix(in srgb, var(--accent, #7aa2ff) 45%, transparent), transparent 70%);
  mask: linear-gradient(#000, #000) content-box, linear-gradient(#000, #000);
  mask-composite: exclude;
  padding: 1px;
}

.login__kicker {
  margin: 0;
  font-size: 10px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  opacity: 0.55;
}

.login__title {
  margin: 0;
  font-family: var(--fr-serif, inherit);
  font-size: clamp(38px, 6vw, 56px);
  font-weight: 400;
  line-height: 0.95;
  letter-spacing: -0.03em;
}

.login__lede {
  margin: -4px 0 10px;
  font-size: 13px;
  line-height: 1.5;
  opacity: 0.65;
}

.login__field {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.login__label {
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  opacity: 0.55;
}

.login__input {
  width: 100%;
  padding: 12px 14px;
  font: inherit;
  font-size: 14px;
  color: inherit;
  background: rgb(255 255 255 / 4%);
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: 2px;
  outline: none;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.login__input:focus-visible {
  border-color: color-mix(in srgb, var(--accent, #7aa2ff) 70%, transparent);
  background: rgb(255 255 255 / 7%);
}

.login__reveal {
  position: absolute;
  right: 12px;
  bottom: 12px;
  font-size: 9px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  opacity: 0.5;
  background: none;
  border: 0;
  cursor: pointer;
}

.login__reveal:hover { opacity: 0.9; }

.login__error {
  margin: 2px 0 0;
  font-size: 12px;
  color: #ff8b8b;
}

.login__submit {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 8px;
  padding: 15px 18px;
  font-size: 11px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #06070c;
  background: var(--fr-fg, #e8e6e1);
  border: 0;
  cursor: pointer;
  transition: transform 0.25s ease, filter 0.25s ease;
}

.login__submit svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.4;
}

.login__submit:hover { filter: brightness(1.08); transform: translateX(2px); }

.login__hint {
  margin: 10px 0 0;
  font-size: 10px;
  letter-spacing: 0.06em;
  opacity: 0.45;
}

.login__hint code {
  font-size: 10px;
  padding: 1px 4px;
  border: 1px solid rgb(255 255 255 / 12%);
}

.login-enter-active, .login-leave-active { transition: opacity 0.35s ease; }
.login-enter-from, .login-leave-to { opacity: 0; }
</style>
