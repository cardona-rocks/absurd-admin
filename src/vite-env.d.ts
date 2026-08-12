/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL pública de absurd-api. Vacío en desarrollo: se usa el proxy de Vite. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
