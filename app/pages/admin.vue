<template>
  <section class="admin">
    <header class="admin__head">
      <div>
        <p class="admin__kicker">Arquivo · painel</p>
        <h1 class="admin__title">Relíquias</h1>
        <p class="admin__lede">
          {{ relics.length }} registo{{ relics.length === 1 ? '' : 's' }} · o último cartão abre o formulário
        </p>
      </div>
      <div class="admin__actions">
        <button type="button" class="admin__ghost" @click="signOutAndLeave">Sair</button>
      </div>
    </header>

    <p v-if="saveErrorText" class="admin__error" role="alert">{{ saveErrorText }}</p>

    <div v-if="!user" class="admin__locked">
      <p class="admin__lockedTitle">Acesso restrito</p>
      <p class="admin__lede">Entra para abrir o arquivo.</p>
      <button type="button" class="admin__primary" @click="requestLogin">Entrar</button>
    </div>

    <p v-else-if="loadedFor !== 'admin'" class="admin__lede">A carregar o arquivo…</p>

    <ul v-else class="admin__grid">
      <li v-for="relic in relics" :key="relic.id" class="admin__item">
        <article class="card" :class="{ 'is-draft': relic.published === false }">
          <RelicCover class="card__img" :src="relic.image" :poster="relic.image" :alt="relic.alt" />
          <div class="card__scrim" />
          <div class="card__body">
            <p class="card__flags">
              <StatusBadge :status="relicStatus(relic)" />
              <span v-if="relic.is_extra" class="card__draft">Extra</span>
              <span v-if="relic.published === false" class="card__draft">Rascunho</span>
            </p>
            <p class="card__mission">{{ relic.mission }}</p>
            <h2 class="card__name">{{ relic.name }}</h2>
            <p class="card__tagline">{{ relic.tagline }}</p>
            <p class="card__meta">{{ relic.facts.length }} factos · {{ relic.scenes.length }} cenas</p>
          </div>
          <div class="card__tools">
            <button type="button" class="card__tool" @click="togglePublished(relic)">
              {{ relic.published === false ? 'Publicar' : 'Despublicar' }}
            </button>
            <button type="button" class="card__tool" @click="openForm(relic)">Editar</button>
            <button type="button" class="card__tool card__tool--danger" @click="confirmRemove(relic)">Remover</button>
          </div>
        </article>
      </li>

      <li v-if="user" class="admin__item">
        <button type="button" class="card card--new" @click="openForm(null)">
          <span class="card__center" aria-hidden="true">
            <span class="card__plus">
              <svg viewBox="0 0 48 48"><path d="M24 10v28M10 24h28" /></svg>
            </span>
          </span>
          <span class="card__newLabel">Adicionar relíquia</span>
        </button>
      </li>
    </ul>

    <Transition name="toast">
      <p v-if="toast" class="admin__toast" role="status">{{ toast }}</p>
    </Transition>

    <RelicForm
      :open="formOpen"
      :relic="editing"
      :taken-ids="takenIds"
      @close="formOpen = false"
      @save="store"
    />
  </section>
</template>

<script setup lang="ts">
import type { Relic, RelicInput } from '#shared/types/relic'
import { relicStatus } from '~/utils/relics'

const { relics, loadedFor, load, create, update, patch, remove, error: loadError } = useRelics()
const { user, restore, signOut } = useAuth()
const { open: openPanel } = usePanels()

const formOpen = ref(false)
const editing = ref<Relic | null>(null)
const saveError = ref('')

const saveErrorText = computed(() => saveError.value || loadError.value)

const takenIds = computed(() => relics.value.map(relic => relic.id).filter(id => id !== editing.value?.id))

const toast = ref('')
let toastTimer = 0

function flash(message: string): void {
  toast.value = message
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => { toast.value = '' }, 2600)
}

onMounted(async () => {
  await restore()
  if (!user.value) {
    openPanel('profile')
    await navigateTo('/')
    return
  }
  await load(true)
})

onBeforeUnmount(() => window.clearTimeout(toastTimer))

function openForm(relic: Relic | null): void {
  saveError.value = ''
  editing.value = relic
  formOpen.value = true
}

async function store(input: RelicInput): Promise<void> {
  saveError.value = ''
  try {
    if (editing.value) {
      await update(editing.value.id, input)
      flash('Alterações guardadas.')
    }
    else {
      await create(input)
      flash('Relíquia criada.')
    }
    formOpen.value = false
    editing.value = null
  }
  catch (err: unknown) {
    const apiError = err as { data?: { message?: string }, statusMessage?: string, message?: string }
    saveError.value = apiError.data?.message || apiError.statusMessage || 'Falha ao guardar a relíquia.'
  }
}

async function togglePublished(relic: Relic): Promise<void> {
  const next = relic.published === false
  saveError.value = ''
  try {
    await patch(relic.id, { published: next })
    flash(next ? 'Publicada na home.' : 'Movida para rascunho.')
  }
  catch (err: unknown) {
    const apiError = err as { data?: { message?: string }, message?: string }
    saveError.value = apiError.data?.message || 'Falha ao alterar a visibilidade.'
  }
}

async function confirmRemove(relic: Relic): Promise<void> {
  if (!window.confirm(`Remover “${relic.name}” do arquivo?`)) return
  saveError.value = ''
  try {
    await remove(relic.id)
    flash('Relíquia removida.')
  }
  catch (err: unknown) {
    const apiError = err as { data?: { message?: string }, message?: string }
    saveError.value = apiError.data?.message || 'Falha ao remover a relíquia.'
  }
}

async function signOutAndLeave(): Promise<void> {
  await signOut()
  formOpen.value = false
  await navigateTo('/')
}

function requestLogin(): void {
  openPanel('profile')
}
</script>

<style scoped>
.admin {
  position: relative;
  z-index: 10;
  padding: 140px clamp(20px, 5vw, 72px) 120px;
  color: var(--fr-fg, #e8e6e1);
}

.admin__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
  margin-bottom: 48px;
  padding-bottom: 26px;
  border-bottom: 1px solid rgb(255 255 255 / 10%);
}

.admin__kicker {
  margin: 0 0 10px;
  font-size: 9px;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  opacity: 0.5;
}

.admin__title {
  margin: 0;
  font-family: var(--fr-serif, inherit);
  font-size: clamp(44px, 8vw, 96px);
  font-weight: 400;
  line-height: 0.92;
  letter-spacing: -0.035em;
}

.admin__lede {
  margin: 12px 0 0;
  font-size: 12px;
  letter-spacing: 0.04em;
  opacity: 0.6;
}

.admin__error {
  margin: 0 0 24px;
  padding: 12px 16px;
  font-size: 12px;
  color: #ffb3b3;
  background: rgb(255 90 90 / 8%);
  border: 1px solid rgb(255 90 90 / 25%);
}

.admin__actions { display: flex; gap: 10px; }

.admin__ghost,
.admin__primary {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  cursor: pointer;
}

.admin__ghost {
  color: inherit;
  background: none;
  border: 1px solid rgb(255 255 255 / 16%);
}

.admin__primary {
  color: #06070c;
  background: var(--fr-fg, #e8e6e1);
  border: 0;
}

.admin__primary svg { width: 13px; height: 13px; fill: none; stroke: currentColor; stroke-width: 1.5; }

.admin__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 18px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.admin__item { display: flex; }

.card {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  text-align: left;
  color: inherit;
  background: #0a0c14;
  border: 1px solid rgb(255 255 255 / 10%);
  padding: 0;
}

.card__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scale(1.01);
  transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1), filter 0.4s ease;
  filter: saturate(0.85) contrast(1.02);
}

.card__scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgb(3 4 10 / 92%) 0%, rgb(3 4 10 / 30%) 52%, rgb(3 4 10 / 10%) 100%);
}

.card__body {
  position: absolute;
  inset: auto 18px 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.card__mission {
  margin: 0;
  font-size: 8.5px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  opacity: 0.6;
}

.card__name {
  margin: 0;
  font-family: var(--fr-serif, inherit);
  font-size: 24px;
  font-weight: 400;
  line-height: 1.02;
  letter-spacing: -0.02em;
}

.card__tagline {
  margin: 0;
  font-size: 11.5px;
  line-height: 1.45;
  opacity: 0.72;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card__meta {
  margin: 4px 0 0;
  font-size: 9px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  opacity: 0.45;
}

.card__flags {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 2px;
}

.card__draft {
  padding: 3px 7px;
  font-size: 8px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  border: 1px dashed rgb(255 255 255 / 30%);
  color: rgb(255 255 255 / 65%);
}

.card.is-draft .card__img { opacity: 0.45; filter: grayscale(0.55); }

.admin__toast {
  position: fixed;
  left: 50%;
  bottom: 28px;
  z-index: 140;
  margin: 0;
  padding: 12px 20px;
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #06070c;
  background: var(--fr-fg, #e8e6e1);
  transform: translateX(-50%);
}

.toast-enter-active, .toast-leave-active { transition: opacity 0.25s ease, transform 0.25s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, 8px); }

.card__tools {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 6px;
  opacity: 0;
  transform: translateY(-4px);
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.card:hover .card__tools,
.card:focus-within .card__tools { opacity: 1; transform: none; }

.card:hover .card__img { transform: scale(1.045); filter: saturate(1) contrast(1.04); }

.card__tool {
  padding: 7px 10px;
  font-size: 8.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: inherit;
  background: rgb(4 6 12 / 78%);
  border: 1px solid rgb(255 255 255 / 18%);
  backdrop-filter: blur(6px);
  cursor: pointer;
}

.card__tool:hover { background: rgb(255 255 255 / 12%); }

.card__tool--danger:hover { border-color: #ff8f8f; color: #ff8f8f; }

.card--new {
  display: block;
  background:
    radial-gradient(70% 70% at 50% 40%, color-mix(in srgb, var(--accent, #7aa2ff) 12%, transparent), transparent 70%),
    rgb(255 255 255 / 1.5%);
  border: 1px dashed rgb(255 255 255 / 24%);
  cursor: pointer;
  transition: border-color 0.3s ease, background 0.3s ease;
}

.card--new:hover {
  border-color: color-mix(in srgb, var(--accent, #7aa2ff) 75%, transparent);
  background:
    radial-gradient(70% 70% at 50% 40%, color-mix(in srgb, var(--accent, #7aa2ff) 20%, transparent), transparent 70%),
    rgb(255 255 255 / 3%);
}

.card__center {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
}

.card__plus {
  width: 58px;
  height: 58px;
  display: grid;
  place-items: center;
  border: 1px solid rgb(255 255 255 / 26%);
  border-radius: 50%;
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.3s ease;
}

.card--new:hover .card__plus { transform: rotate(90deg); border-color: var(--accent, #7aa2ff); }

.card__plus svg { width: 24px; height: 24px; fill: none; stroke: currentColor; stroke-width: 1.2; }

.card__newLabel {
  position: absolute;
  inset: auto 0 18px;
  text-align: center;
  font-size: 9px;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  opacity: 0.55;
}

.admin__locked {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 80px 20px;
  text-align: center;
}

.admin__lockedTitle {
  margin: 0;
  font-family: var(--fr-serif, inherit);
  font-size: 34px;
}

@media (max-width: 620px) {
  .admin { padding-top: 120px; }
  .admin__grid { grid-template-columns: 1fr; }
}
</style>
