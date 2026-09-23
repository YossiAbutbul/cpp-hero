/**
 * Cloud (Firebase) config from VITE_FIREBASE_* env vars (see .env.example).
 * No Firebase import here: when the vars are missing, `cloudConfig` is null,
 * every cloud UI is hidden and the Firebase SDK is never downloaded.
 */

export interface CloudConfig {
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    appId: string;
    storageBucket?: string;
    messagingSenderId?: string;
  };
  /** Connect to the local Emulator Suite (auth :9099, firestore :8080). */
  emulators: { host: string } | null;
  /** App Check with reCAPTCHA (off when no site key). */
  appCheck: { provider: 'enterprise' | 'v3'; siteKey: string; debugToken: string | boolean } | null;
}

type Env = Record<string, string | boolean | undefined>;

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

export function readCloudConfig(env: Env): CloudConfig | null {
  const apiKey = str(env.VITE_FIREBASE_API_KEY);
  const projectId = str(env.VITE_FIREBASE_PROJECT_ID);
  const appId = str(env.VITE_FIREBASE_APP_ID);
  if (!apiKey || !projectId || !appId) return null;
  const authDomain = str(env.VITE_FIREBASE_AUTH_DOMAIN) || `${projectId}.firebaseapp.com`;
  const useEmu = str(env.VITE_FIREBASE_USE_EMULATORS) === 'true';
  const siteKey = str(env.VITE_FIREBASE_APPCHECK_SITE_KEY);
  const debug = str(env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN);
  const firebase: CloudConfig['firebase'] = { apiKey, authDomain, projectId, appId };
  const bucket = str(env.VITE_FIREBASE_STORAGE_BUCKET);
  const sender = str(env.VITE_FIREBASE_MESSAGING_SENDER_ID);
  if (bucket) firebase.storageBucket = bucket;
  if (sender) firebase.messagingSenderId = sender;
  return {
    firebase,
    emulators: useEmu ? { host: str(env.VITE_FIREBASE_EMULATOR_HOST) || '127.0.0.1' } : null,
    appCheck:
      siteKey && !useEmu
        ? {
            provider: str(env.VITE_FIREBASE_APPCHECK_PROVIDER) === 'v3' ? 'v3' : 'enterprise',
            siteKey,
            // "true" = print a debug token in the console (register it in the Firebase console).
            // Dev server only: a token baked into a production bundle would let anyone past App Check.
            debugToken: env.DEV !== true ? '' : debug === 'true' ? true : debug,
          }
        : null,
  };
}

export const cloudConfig: CloudConfig | null = readCloudConfig(import.meta.env as unknown as Env);
