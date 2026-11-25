import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onIdTokenChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { auth, modoDemo } from '../lib/firebase'
import { limparTexto } from '../lib/validation'

const AuthCtx = createContext(null)
const CHAVE_DEMO = 'inscritos-demo-sessao'

const usuarioDemo = { uid: 'demo', displayName: 'Visitante', email: 'demo@inscritos.local', emailVerified: true }

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (modoDemo) {
      let logado = false
      try { logado = sessionStorage.getItem(CHAVE_DEMO) === '1' } catch { /* ignora */ }
      setUsuario(logado ? usuarioDemo : null)
      setCarregando(false)
      return
    }
    return onIdTokenChanged(auth, (u) => {
      setUsuario(u ? { uid: u.uid, displayName: u.displayName, email: u.email, emailVerified: u.emailVerified, photoURL: u.photoURL, providerId: u.providerData[0]?.providerId } : null)
      setCarregando(false)
    })
  }, [])

  const acoes = useMemo(() => ({
    async entrar(email, senha) {
      if (modoDemo) return acoes.entrarDemo()
      await signInWithEmailAndPassword(auth, email, senha)
    },
    async cadastrar(nome, email, senha) {
      const cred = await createUserWithEmailAndPassword(auth, email, senha)
      const nomeLimpo = limparTexto(nome).slice(0, 80)
      if (nomeLimpo) await updateProfile(cred.user, { displayName: nomeLimpo })
      await sendEmailVerification(cred.user)
    },
    async entrarGoogle() {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      await signInWithPopup(auth, provider)
    },
    async recuperarSenha(email) {
      await sendPasswordResetEmail(auth, email)
    },
    async reenviarVerificacao() {
      if (auth.currentUser) await sendEmailVerification(auth.currentUser)
    },
    async conferirVerificacao() {
      if (!auth.currentUser) return false
      await reload(auth.currentUser)
      await auth.currentUser.getIdToken(true) // token novo já com email_verified
      return auth.currentUser.emailVerified
    },
    entrarDemo() {
      try { sessionStorage.setItem(CHAVE_DEMO, '1') } catch { /* ignora */ }
      setUsuario(usuarioDemo)
    },
    async sair() {
      if (modoDemo) {
        try { sessionStorage.removeItem(CHAVE_DEMO) } catch { /* ignora */ }
        setUsuario(null)
        return
      }
      await signOut(auth)
    },
  }), [])

  const precisaVerificar = !!usuario && !modoDemo && !usuario.emailVerified && usuario.providerId !== 'google.com'

  return (
    <AuthCtx.Provider value={{ usuario, carregando, precisaVerificar, ...acoes }}>
      {children}
    </AuthCtx.Provider>
  )
}

export function useAuth() {
  return useContext(AuthCtx)
}
