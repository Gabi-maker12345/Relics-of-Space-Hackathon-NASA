<template>
  <Teleport to="body">
    <Transition name="botset">
      <div
        v-if="open"
        class="botset"
        role="dialog"
        aria-modal="true"
        aria-labelledby="botset-title"
        data-lenis-prevent
      >
        <button type="button" class="botset__scrim" :aria-label="t('bot.close')" @click="close" />

        <section class="botset__panel">
          <header class="botset__head">
            <div>
              <p class="botset__kicker">{{ t('bot.kicker') }}</p>
              <h2 id="botset-title" class="botset__title">{{ t('bot.title') }}</h2>
              <p class="botset__subtitle">{{ t('bot.subtitle') }}</p>
            </div>
            <button type="button" class="botset__x" :aria-label="t('bot.close')" @click="close">
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3 3 13" /></svg>
            </button>
          </header>

          <div class="botset__body">
            <p v-if="loading" class="botset__hint">{{ t('admin.loading') }}</p>
            <p v-else-if="loadError" class="botset__error" role="alert">{{ t('bot.loadError') }}</p>

            <template v-else>
              <fieldset class="botset__fieldset" :disabled="readOnly">
              <label class="botset__field">
                <span class="botset__label">{{ t('bot.prompt') }}</span>
                <textarea v-model="prompt" class="botset__area" rows="9" spellcheck="false" />
                <span class="botset__hint">{{ t('bot.promptHint') }}</span>
              </label>

              <label class="botset__field">
                <span class="botset__label">{{ t('bot.instructions') }}</span>
                <textarea v-model="instructions" class="botset__area" rows="4" spellcheck="false" />
                <span class="botset__hint">{{ t('bot.instructionsHint') }}</span>
              </label>

              <section class="botset__catalogs">
                <div class="botset__catalogsHead">
                  <span class="botset__label">{{ t('bot.catalogs') }}</span>
                  <button type="button" class="botset__add" @click="addCatalog">+ {{ t('bot.add') }}</button>
                </div>
                <p class="botset__hint">{{ t('bot.catalogsHint') }}</p>

                <ul class="botset__list">
                  <li v-for="(catalog, index) in catalogs" :key="index" class="botset__row">
                    <input
                      v-model="catalog.label"
                      class="botset__input botset__input--label"
                      type="text"
                      maxlength="80"
                      :aria-label="t('bot.label')"
                      :placeholder="t('bot.label')"
                    >
                    <input
                      v-model="catalog.url"
                      class="botset__input"
                      type="url"
                      maxlength="2048"
                      :aria-label="t('bot.url')"
                      placeholder="https://"
                    >
                    <button
                      type="button"
                      class="botset__remove"
                      :aria-label="`${t('bot.remove')}: ${catalog.label || catalog.url}`"
                      @click="removeCatalog(index)"
                    >
                      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
                    </button>
                  </li>
                </ul>
                <p v-if="catalogs.length === 0" class="botset__hint">{{ t('bot.emptyCatalogs') }}</p>
              </section>

              <p v-if="error" class="botset__error" role="alert">{{ error }}</p>
              </fieldset>
            </template>
          </div>

          <footer class="botset__foot">
            <button type="button" class="botset__ghost" @click="close">{{ t('bot.cancel') }}</button>
            <button
              type="button"
              class="botset__primary"
              :disabled="readOnly || loading || saving || loadError"
              @click="save"
            >
              {{ saving ? t('bot.saving') : t('bot.save') }}
            </button>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{ open: boolean, readOnly?: boolean }>()
const emit = defineEmits<{ close: [], saved: [] }>()
const { t } = useI18n()

type BotCatalog = { label: string, url: string }

const loading = ref(false)
const saving = ref(false)
const loadError = ref(false)
const error = ref('')
const prompt = ref('')
const instructions = ref('')
const catalogs = ref<BotCatalog[]>([])

async function loadSettings(): Promise<void> {
  loading.value = true
  loadError.value = false
  error.value = ''
  try {
    const result = await $fetch<{ system_prompt: string, instructions: string, catalogs: BotCatalog[] }>('/api/admin/bot')
    prompt.value = result.system_prompt
    instructions.value = result.instructions
    catalogs.value = result.catalogs.map(catalog => ({ label: catalog.label, url: catalog.url }))
  }
  catch {
    loadError.value = true
  }
  finally {
    loading.value = false
  }
}

watch(() => props.open, (open) => {
  if (open) void loadSettings()
}, { immediate: false })

function close(): void {
  emit('close')
}

function addCatalog(): void {
  catalogs.value = [...catalogs.value, { label: '', url: '' }]
}

function removeCatalog(index: number): void {
  catalogs.value = catalogs.value.filter((_, i) => i !== index)
}

async function save(): Promise<void> {
  if (props.readOnly) return
  error.value = ''
  const catalogsClean: BotCatalog[] = []
  for (const catalog of catalogs.value) {
    const label = catalog.label.trim()
    const url = catalog.url.trim()
    if (!label && !url) continue
    if (!label || !/^https:\/\/[^\s]+$/i.test(url)) {
      error.value = t('bot.invalidUrl')
      return
    }
    catalogsClean.push({ label, url })
  }

  saving.value = true
  try {
    await $fetch('/api/admin/bot', {
      method: 'PUT',
      body: {
        system_prompt: prompt.value,
        instructions: instructions.value,
        catalogs: catalogsClean,
      },
    })
    emit('saved')
    close()
  }
  catch (err: unknown) {
    const message = (err as { data?: { message?: string } }).data?.message
    error.value = message || t('bot.error')
  }
  finally {
    saving.value = false
  }
}

function onKeydown(event: KeyboardEvent): void {
  if (!props.open || event.key !== 'Escape') return
  event.preventDefault()
  event.stopPropagation()
  close()
}

onMounted(() => window.addEventListener('keydown', onKeydown, true))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown, true))
</script>

<style scoped>
.botset {
  position: fixed;
  inset: 0;
  z-index: 170;
  display: grid;
  place-items: center;
  padding: 24px;
}

.botset__scrim {
  position: absolute;
  inset: 0;
  border: 0;
  background: color-mix(in srgb, #03040a 86%, transparent);
  backdrop-filter: blur(12px);
  cursor: default;
}

.botset__panel {
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(760px, 100%);
  max-height: min(90vh, 860px);
  overflow: hidden;
  color: var(--fr-fg, #e8e6e1);
  background:
    radial-gradient(70% 40% at 50% -10%, color-mix(in srgb, var(--accent, #7aa2ff) 12%, transparent), transparent 70%),
    #070910;
  border: 1px solid rgb(255 255 255 / 12%);
  box-shadow: 0 60px 160px rgb(0 0 0 / 72%);
}

.botset__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 28px 32px 18px;
  border-bottom: 1px solid rgb(255 255 255 / 8%);
}

.botset__kicker {
  margin: 0 0 8px;
  font-size: 9px;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  opacity: 0.45;
}

.botset__title {
  margin: 0;
  font-family: var(--fr-serif, inherit);
  font-size: clamp(26px, 3vw, 38px);
  font-weight: 400;
  line-height: 0.95;
  letter-spacing: -0.03em;
}

.botset__subtitle {
  margin: 8px 0 0;
  font-size: 11px;
  letter-spacing: 0.04em;
  opacity: 0.6;
}

.botset__x {
  display: grid;
  flex: none;
  place-items: center;
  width: 40px;
  height: 40px;
  color: inherit;
  background: none;
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: 50%;
  cursor: pointer;
}

.botset__x svg {
  width: 12px;
  height: 12px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.2;
}

.botset__fieldset {
  min-inline-size: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.botset__body {
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 22px 32px 26px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.botset__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.botset__label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  opacity: 0.72;
}

.botset__area,
.botset__input {
  width: 100%;
  padding: 12px 14px;
  font: inherit;
  font-size: 13px;
  line-height: 1.55;
  color: inherit;
  background: rgb(255 255 255 / 3.5%);
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 3px;
  outline: none;
  resize: vertical;
}

.botset__area:focus-visible,
.botset__input:focus-visible {
  border-color: color-mix(in srgb, var(--accent, #7aa2ff) 60%, transparent);
}

.botset__hint {
  margin: 0;
  font-size: 10.5px;
  line-height: 1.5;
  opacity: 0.5;
}

.botset__catalogs {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.botset__catalogsHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.botset__add {
  padding: 7px 10px;
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: inherit;
  background: none;
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: 3px;
  cursor: pointer;
}

.botset__add:hover,
.botset__ghost:hover {
  background: rgb(255 255 255 / 7%);
}

.botset__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.botset__row {
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.6fr) auto;
  gap: 8px;
  align-items: center;
}

.botset__input--label {
  min-width: 0;
}

.botset__remove {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  color: inherit;
  background: none;
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 3px;
  cursor: pointer;
  opacity: 0.6;
}

.botset__remove:hover {
  opacity: 1;
  border-color: rgb(255 255 255 / 32%);
}

.botset__remove svg {
  width: 10px;
  height: 10px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.2;
}

.botset__error {
  margin: 0;
  font-size: 12px;
  color: #ffb4a8;
}

.botset__foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 32px 22px;
  border-top: 1px solid rgb(255 255 255 / 8%);
}

.botset__ghost,
.botset__primary {
  padding: 11px 18px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: inherit;
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: 3px;
  cursor: pointer;
}

.botset__ghost {
  background: none;
}

.botset__primary {
  color: #070910;
  background: var(--fr-paper, #e8e6e1);
  border-color: transparent;
}

.botset__primary:disabled {
  opacity: 0.45;
  cursor: default;
}

.botset-enter-active,
.botset-leave-active {
  transition: opacity 0.25s ease;
}

.botset-enter-from,
.botset-leave-to {
  opacity: 0;
}

@media (max-width: 620px) {
  .botset {
    padding: 12px;
  }

  .botset__head,
  .botset__body,
  .botset__foot {
    padding-inline: 18px;
  }

  .botset__row {
    grid-template-columns: minmax(0, 1fr) 34px;
    grid-auto-rows: auto;
  }

  .botset__row .botset__input:nth-child(1) {
    grid-column: 1;
    grid-row: 1;
  }

  .botset__row .botset__input:nth-child(2) {
    grid-column: 1 / -1;
    grid-row: 2;
  }

  .botset__row .botset__remove {
    grid-column: 2;
    grid-row: 1;
  }
}
</style>
