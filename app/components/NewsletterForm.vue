<template>
  <div class="flex-1 flex flex-col items-center">
    <p data-gl="text" class="text-14 leading-14 tracking-[-0.02em] max-w-[30rem] s:max-w-[32.5rem] text-center">
      An occasional newsletter with insights and thoughts from a design engineer, drawn from over a decade of freelancing.
    </p>
    <form
      :aria-busy="busy"
      class="mt-25 s:mt-30 flex w-full max-w-[26rem] s:max-w-[32rem] items-center gap-x-8"
      novalidate
      @submit.prevent="submit"
    >
      <div
        data-gl="pill"
        data-ring
        class="invisible relative flex h-40 s:h-45 w-full items-center rounded-full bg-black px-20 text-14 tracking-[-0.02em] has-not-hover:text-[max(1.4rem,16px)] min-w-0 flex-1"
      >
        <span class="visible absolute inset-0 rounded-[inherit]" aria-hidden="true"></span>
        <input
          v-model="email"
          type="email"
          name="email"
          autocomplete="email"
          autocapitalize="off"
          autocorrect="off"
          spellcheck="false"
          enterkeyhint="send"
          aria-label="Email address"
          class="visible relative z-1 h-full w-full border-0 bg-transparent text-transparent caret-white outline-none pointer-events-auto [font:inherit] [letter-spacing:inherit] [-webkit-text-fill-color:transparent] selection:bg-white/20 autofill:bg-clip-text autofill:[-webkit-text-fill-color:transparent] autofill:[transition:background-color_0s_999999s]"
        >
        <span aria-hidden="true" data-gl="text" class="visible pointer-events-none absolute inset-x-20 top-1/2 -translate-y-1/2 overflow-hidden whitespace-pre [-webkit-text-fill-color:transparent]">{{ email }}</span>
        <span aria-hidden="true" data-gl="text" :class="email.length > 0 ? 'invisible' : 'visible'" class="pointer-events-none absolute inset-x-20 top-1/2 -translate-y-1/2 truncate opacity-40 [-webkit-text-fill-color:transparent]">Email address</span>
      </div>
      <button
        type="submit"
        aria-label="Subscribe"
        :disabled="busy"
        data-gl="pill"
        data-arrow
        class="invisible relative size-40 s:size-45 flex-none rounded-full bg-white text-black text-[max(1.6rem,16px)] pointer-events-auto disabled:pointer-events-none"
      >
        <span class="visible absolute inset-0 rounded-[inherit]" aria-hidden="true"></span>
      </button>
      <input v-model="company" name="company" tabindex="-1" autocomplete="off" aria-hidden="true" class="hidden">
    </form>
    <p role="status" aria-live="polite" class="label mt-15 min-h-[1.2em] w-full text-center">
      <span data-gl="text" class="inline-block opacity-60">{{ status }}</span>
    </p>
  </div>
</template>

<script setup lang="ts">
const email = ref('')
const company = ref('')
const busy = ref(false)
const status = ref('\u200b')

async function submit(): Promise<void> {
  if (busy.value) return
  busy.value = true
  status.value = '\u200b'
  try {
    const response = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: email.value, company: company.value }),
    })
    const payload: unknown = await response.json()
    status.value = isResult(payload) ? payload.message : 'Something went wrong. Try again.'
  } catch {
    status.value = 'Something went wrong. Try again.'
  }
  busy.value = false
}

type ApiResult = { ok: boolean; message: string }

function isResult(value: unknown): value is ApiResult {
  return typeof value === 'object' && value !== null &&
    typeof (value as { ok?: unknown }).ok === 'boolean' &&
    typeof (value as { message?: unknown }).message === 'string'
}
</script>
