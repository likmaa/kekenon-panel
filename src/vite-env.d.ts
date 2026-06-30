/// <reference types="vite/client" />

// Optional: augment to get intellisense for your custom env vars
// Remove or extend as needed.
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
