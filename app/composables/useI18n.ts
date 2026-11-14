import { messages, type Lang, type MessageKey } from '~/i18n/messages'
import type { Ref } from 'vue'

export type TranslateParams = Record<string, string | number>

const I18N_LANG: InjectionKey<Ref<Lang>> = Symbol('i18n-lang')

/**
 * O painel fornece o seu próprio idioma: tudo o que estiver dentro do subtree
 * do admin (lista, formulário, pré-visualização, badges) traduz nesse idioma,
 * e o resto do site usa o idioma público do cabeçalho.
 */
export function provideI18nLang(lang: Ref<Lang>): void {
  provide(I18N_LANG, lang)
}

/**
 * Interface translations (FE-18). Missing keys fall back to Portuguese, which
 * is also what the API does for content without a translation.
 */
export function useI18n(explicit?: Ref<Lang>) {
  const override = inject(I18N_LANG, null)
  const { lang: publicLang } = useLocale()
  const lang = computed(() => explicit?.value ?? override?.value ?? publicLang.value)

  function t(key: MessageKey, params?: TranslateParams): string {
    const dict = messages[lang.value] ?? messages.pt
    let text: string = dict[key] ?? messages.pt[key] ?? key
    if (params) {
      for (const [name, value] of Object.entries(params)) {
        text = text.replaceAll(`{${name}}`, String(value))
      }
    }
    return text
  }

  return { t, lang }
}
