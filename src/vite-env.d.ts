/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BUILD?: string
  readonly VITE_AUDIO_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
