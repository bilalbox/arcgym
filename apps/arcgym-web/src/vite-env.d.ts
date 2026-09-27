/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CF_BEACON_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
