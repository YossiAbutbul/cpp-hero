/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/** All content/**\/*.yaml, parsed + validated at build time (scripts/lib/vite-plugin-content.ts). */
declare module 'virtual:cpp-hero-content' {
  import type { Content } from '@/content/schema';
  const content: Content;
  export default content;
}

/** Optional cloud save config (.env.example, docs/DEPLOY.md). All unset = no cloud features. */
interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_USE_EMULATORS?: string;
  readonly VITE_FIREBASE_EMULATOR_HOST?: string;
  readonly VITE_FIREBASE_APPCHECK_PROVIDER?: string;
  readonly VITE_FIREBASE_APPCHECK_SITE_KEY?: string;
  readonly VITE_FIREBASE_APPCHECK_DEBUG_TOKEN?: string;
}
