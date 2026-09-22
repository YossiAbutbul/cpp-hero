/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/** All content/**\/*.yaml, parsed + validated at build time (scripts/lib/vite-plugin-content.ts). */
declare module 'virtual:cpp-hero-content' {
  import type { Content } from '@/content/schema';
  const content: Content;
  export default content;
}
