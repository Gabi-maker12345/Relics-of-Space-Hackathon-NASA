import { messages, type MessageKey } from '~/i18n/messages'

export type TranslateParams = Record<string, string | number>

/**
 * Interface translations (FE-18). Há **um** idioma para todo o sistema,
 * escolhido no cabeçalho (`useLocale`, persistido). Uma chave em falta cai no
 * português, tal como a API faz para conteúdo sem tradução.
 */
export function useI18n() {
  const { lang } = useLocale()

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
