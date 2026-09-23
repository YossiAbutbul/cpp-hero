# Deploy Cpp Hero (Firebase cloud save + Vercel)

These are the manual steps. You create every account and paste every key yourself.
Cloud save is optional: with no `VITE_FIREBASE_*` vars set, the app runs device-only.

Where values go:
- Local: copy `.env.example` to `.env.local` (git-ignored) and fill it in.
- Production: Vercel > Project > Settings > Environment Variables (same names).

## 1. Create the Firebase project

1. Open https://console.firebase.google.com and click **Create a project**.
2. Enter a name. Note the **Project ID** shown under the name (for example `cpp-hero-1a2b3`).
3. Google Analytics is not needed. You can turn it off.
4. Click **Create project**.
5. In `.firebaserc`, replace `your-firebase-project-id` with your Project ID.

## 2. Add a Web app and copy its config

1. In the project, click the gear icon > **Project settings** > **General**.
2. Under **Your apps**, click the Web icon (`</>`).
3. Enter a nickname. Leave **Firebase Hosting** unchecked. Click **Register app**.
4. Pick **Config** (not npm). Copy the values into these vars:

| Firebase config key | Env var |
| --- | --- |
| `apiKey` | `VITE_FIREBASE_API_KEY` |
| `authDomain` | `VITE_FIREBASE_AUTH_DOMAIN` |
| `projectId` | `VITE_FIREBASE_PROJECT_ID` |
| `appId` | `VITE_FIREBASE_APP_ID` |
| `storageBucket` | `VITE_FIREBASE_STORAGE_BUCKET` (optional) |
| `messagingSenderId` | `VITE_FIREBASE_MESSAGING_SENDER_ID` (optional) |

`authDomain` is `<project-id>.firebaseapp.com`. Keep that value (see Troubleshooting for a custom one).
This config is not secret (it ships in the JS bundle), but keep it out of git anyway.

## 3. Turn on Google sign-in

1. Firebase console > **Build** > **Authentication** > **Get started**.
2. Tab **Sign-in method** > **Add new provider** > **Google**.
3. Switch **Enable** on. Pick a **Project support email**. Click **Save**.
4. Tab **Settings** > **Authorized domains** > **Add domain**. Add:
   - your Vercel production domain, for example `cpp-hero.vercel.app`
   - any custom domain you use, for example `cpphero.com`
   - `localhost` is already there.

Preview deploys (`*-git-*.vercel.app`) are not authorized unless you add each one. Sign-in fails there. That is fine.

The app signs in with a popup. If the browser blocks the popup, it falls back to a full-page redirect.

## 4. Create the Firestore database

1. Firebase console > **Build** > **Firestore Database** > **Create database**.
2. Keep the database ID `(default)`. Edition: **Standard**.
3. Pick a **Location** close to your users (for example `eur3` or `nam5`). It cannot be changed later.
4. Pick **Start in production mode**. Click **Create**.

## 5. Deploy the security rules

In the repo folder:

```
npx firebase login
npm run deploy:rules
```

This uploads `firestore.rules` and `firestore.indexes.json` to the project in `.firebaserc`.
Check it: Firestore Database > **Rules** tab shows the Cpp Hero rules.
Run `npm run deploy:rules` again after every change to `firestore.rules`.

## 6. App Check (recommended for production)

App Check blocks requests that do not come from your site.
The code uses **reCAPTCHA Enterprise** by default (`VITE_FIREBASE_APPCHECK_PROVIDER=enterprise`).
It also supports reCAPTCHA v3 (`VITE_FIREBASE_APPCHECK_PROVIDER=v3`). Pick one.
App Check stays off while `VITE_FIREBASE_APPCHECK_SITE_KEY` is empty.

### Option A: reCAPTCHA Enterprise (default)

1. Open https://console.cloud.google.com and select the same project (Firebase projects are Cloud projects).
2. Menu > **Security** > **reCAPTCHA**. Enable the API if asked.
3. Click **Create key**. Type: **Website**. Add domains: your Vercel production domain and any custom domain.
   Add `localhost` only if you want App Check on during local dev.
4. Leave the checkbox challenge **off** (score-based key). Click **Create key**.
5. Copy the key ID. That is your site key.
6. Firebase console > **Build** > **App Check** > **Apps** tab > click your web app > **reCAPTCHA Enterprise**.
   Paste the site key. Click **Save**.
7. Set env vars:
   - `VITE_FIREBASE_APPCHECK_PROVIDER=enterprise`
   - `VITE_FIREBASE_APPCHECK_SITE_KEY=<key id>`

The free tier covers a small site. Above it, Google asks for a billing account.

### Option B: reCAPTCHA v3

1. Open https://www.google.com/recaptcha/admin/create.
2. Type: **Score based (v3)**. Add your domains. Submit.
3. Copy the **site key** and the **secret key**.
4. Firebase console > **App Check** > **Apps** > your web app > **reCAPTCHA**. Paste the **secret key**. Save.
5. Set env vars:
   - `VITE_FIREBASE_APPCHECK_PROVIDER=v3`
   - `VITE_FIREBASE_APPCHECK_SITE_KEY=<site key>`

### Turn on enforcement (after deploy, not before)

1. Deploy with the site key set (step 7). Use the site for a day or two.
2. Firebase console > **App Check** > **APIs** tab. Open **Cloud Firestore**.
   Check the metrics: almost all requests should be **Verified**.
3. Click **Enforce** for **Cloud Firestore**.
4. Do the same for **Authentication** if it is listed there.

Enforce too early and old or unverified clients get 403 errors.

Local dev with App Check on: set `VITE_FIREBASE_APPCHECK_DEBUG_TOKEN=true`, run the app, copy the debug token from the browser console,
then add it in App Check > **Apps** > your app menu (three dots) > **Manage debug tokens**.

## 7. Deploy on Vercel

1. Open https://vercel.com/new and **Import** the GitHub repo `cpp-hero`.
2. Framework preset: **Vite**.
3. Build command: `npm run build`. Output directory: `dist`. Install command: `npm ci`.
   (`vercel.json` already sets these.)
4. Open **Environment Variables**. Add every `VITE_FIREBASE_*` var from steps 2 and 6.
   Tick **Production**. Tick **Preview** too if you want cloud save on previews.
   Do not set `VITE_FIREBASE_USE_EMULATORS` (or set it to `false`).
5. Click **Deploy**.
6. Custom domain (optional): Project > **Settings** > **Domains** > **Add**. Then add it to Firebase authorized domains (step 3) and to the reCAPTCHA key (step 6).

Vars are read at build time. After you change a var, go to **Deployments** > latest > **Redeploy**.

## 8. Verify

1. Open the production URL.
2. Open DevTools > **Console**. There should be no `Content Security Policy` errors.
3. Click sign in. Choose your Google account. Your name or avatar shows.
4. Play one lesson to the end.
5. Firebase console > Firestore Database > **Data**: a `users/<uid>` document exists.
6. Open the site on a second device. Sign in with the same account. Your progress is there.
7. Turn the network off (DevTools > **Network** > **Offline**) and reload. The app still loads and you can play.
   Turn it back on. Progress syncs.

## 9. Test locally with the emulators

Needs **Java 21 or newer (a JDK)** on your PATH. Check with `java -version`.
No real Firebase project is touched: it uses the demo project `demo-cpp-hero` from `.env.emulator`.

Terminal 1:

```
npm run emulators
```

Terminal 2:

```
npm run dev:emulators
```

Open the Vite URL. Sign-in shows a fake Google account screen. Emulator UI: http://127.0.0.1:4000.

Rules tests (starts and stops the Firestore emulator by itself):

```
npm run test:rules
```

## Troubleshooting

- **`auth/unauthorized-domain`**: the site's domain is missing from Authentication > Settings > Authorized domains. Add it. Wait a minute. Retry.
- **Popup blocked or closes at once**: allow popups for the site. The app falls back to a redirect if the popup is blocked.
  If the redirect loops or fails on Safari or iOS (third-party storage blocked), you can serve the auth handler from your own domain:
  add a rewrite in `vercel.json` from `/__/auth/:path*` to `https://<project-id>.firebaseapp.com/__/auth/:path*`,
  set `VITE_FIREBASE_AUTH_DOMAIN` to your site domain, and in Google Cloud console > **APIs & Services** > **Credentials** > your OAuth web client,
  add `https://<your-domain>/__/auth/handler` to **Authorized redirect URIs**. Redeploy.
- **403 or `app-check` errors in the console**: the site key or provider does not match the one registered in App Check, the domain is not on the reCAPTCHA key, or enforcement is on for a client without a token.
  Fix the env vars and redeploy, or turn enforcement off in App Check > APIs while you check.
- **`permission-denied` from Firestore**: rules not deployed to this project. Check `.firebaserc`, then `npm run deploy:rules`.
- **CSP error "Refused to connect / load ... because it violates the Content Security Policy"**: note the blocked host in the message.
  Add it to the matching directive (`connect-src`, `script-src`, `frame-src`, `img-src`) in the `Content-Security-Policy` header in `vercel.json`. Commit and redeploy.
- **No sign-in button at all**: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID` or `VITE_FIREBASE_APP_ID` is empty in that build. Set them and redeploy.
- **Emulators fail to start**: Java is missing or older than 21. Install a JDK 21+ and reopen the terminal.
