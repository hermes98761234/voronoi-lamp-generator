import { DEFAULTS, sanitize, type LampParams } from './params'

export type Lang = 'en' | 'uk'
export type Theme = 'auto' | 'light' | 'dark'

export interface AppState {
  params: LampParams
  lang: Lang
  theme: Theme
  lampOn: boolean
}

const KEY = 'voronoi-lamp-generator:v1'

export function defaultLang(): Lang {
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('uk') ? 'uk' : 'en'
}

export function loadState(): AppState {
  const base: AppState = { params: DEFAULTS, lang: defaultLang(), theme: 'auto', lampOn: false }
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<AppState> | null
    if (!raw || typeof raw !== 'object') return base
    return {
      params: sanitize(raw.params ?? {}),
      lang: raw.lang === 'uk' || raw.lang === 'en' ? raw.lang : base.lang,
      theme: raw.theme === 'light' || raw.theme === 'dark' || raw.theme === 'auto' ? raw.theme : 'auto',
      lampOn: raw.lampOn === true,
    }
  } catch {
    return base
  }
}

export function saveState(s: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    // storage may be unavailable (private mode); settings just won't persist
  }
}
