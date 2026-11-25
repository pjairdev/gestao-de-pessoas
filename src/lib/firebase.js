import { initializeApp } from 'firebase/app'
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth'
import { initializeFirestore, memoryLocalCache } from 'firebase/firestore'

const env = import.meta.env

const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
}

/** Sem configuração → o app roda em modo demonstração, com dados só no navegador. */
export const modoDemo = !config.apiKey || !config.projectId

export let app = null
export let auth = null
export let db = null

if (!modoDemo) {
  app = initializeApp(config)

  // App Check: o Firebase só aceita requisições que provem vir do seu site.
  if (env.VITE_RECAPTCHA_SITE_KEY) {
    if (env.DEV && env.VITE_APPCHECK_DEBUG === 'true') {
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = true
    }
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(env.VITE_RECAPTCHA_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    })
  }

  auth = getAuth(app)
  auth.languageCode = 'pt'
  setPersistence(auth, browserLocalPersistence)

  // Cache só em memória: nada dos clientes fica gravado no disco do aparelho
  // depois que a aba é fechada. Toda conexão com o banco é HTTPS/TLS.
  db = initializeFirestore(app, { localCache: memoryLocalCache() })
}
