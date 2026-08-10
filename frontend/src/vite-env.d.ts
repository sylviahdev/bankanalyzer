/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the Flask API, e.g. http://127.0.0.1:8000 */
  readonly VITE_API_URL?: string
  /** ISO 4217 code used to format amounts. Defaults to USD. */
  readonly VITE_CURRENCY?: string
  /** BCP 47 locale for number/date formatting. Defaults to the browser locale. */
  readonly VITE_LOCALE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
