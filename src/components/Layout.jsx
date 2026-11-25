import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { NavLink, useLocation, useOutlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { LayoutGrid, LogOut, Package, Plus, Users } from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../context/AuthContext'
import { FormPessoa } from './FormPessoa'
import { FormPlano } from './FormPlano'
import { Lembrete } from './Lembrete'
import { modoDemo } from '../lib/firebase'
import { reiniciarDemo } from '../lib/demoStore'

const UICtx = createContext(null)
export const useUI = () => useContext(UICtx)

const NAV = [
  { para: '/', rotulo: 'Painel', icone: LayoutGrid },
  { para: '/pessoas', rotulo: 'Pessoas', icone: Users },
  { para: '/planos', rotulo: 'Planos', icone: Package },
]

function Marca({ claro }) {
  return (
    <div className="flex items-center gap-2.5">
      <img src="/icone.svg" alt="" className="size-8" />
      <span className={clsx('font-display text-xl font-semibold tracking-tight', claro ? 'text-white' : 'text-tinta')}>Inscritos</span>
    </div>
  )
}

export function Layout() {
  const { usuario, sair } = useAuth()
  const local = useLocation()
  const outlet = useOutlet()
  const [pessoaForm, setPessoaForm] = useState({ aberta: false, pessoa: null })
  const [planoForm, setPlanoForm] = useState({ aberta: false, plano: null })
  const [lembrete, setLembrete] = useState(null)

  const ui = {
    novaPessoa: useCallback(() => setPessoaForm({ aberta: true, pessoa: null, inicial: null, versao: Date.now() }), []),
    editarPessoa: useCallback((p, inicial = null) => setPessoaForm({ aberta: true, pessoa: p, inicial, versao: Date.now() }), []),
    novoPlano: useCallback(() => setPlanoForm({ aberta: true, plano: null, versao: Date.now() }), []),
    editarPlano: useCallback((p) => setPlanoForm({ aberta: true, plano: p, versao: Date.now() }), []),
    enviarLembrete: useCallback((p) => setLembrete(p), []),
  }

  // Atalho: tecla N abre "Nova pessoa"
  useEffect(() => {
    const fn = (e) => {
      const alvo = e.target
      if (e.key.toLowerCase() !== 'n' || e.metaKey || e.ctrlKey || e.altKey) return
      if (alvo.closest('input, textarea, select, [contenteditable], [role="dialog"]')) return
      e.preventDefault()
      ui.novaPessoa()
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [ui.novaPessoa])

  return (
    <UICtx.Provider value={ui}>
      <div className="min-h-dvh md:grid md:grid-cols-[248px_1fr]">
        {/* Barra lateral (desktop) */}
        <aside className="sticky top-0 hidden h-dvh flex-col bg-tinta px-4 py-6 text-white md:flex">
          <div className="px-2"><Marca claro /></div>
          <button onClick={ui.novaPessoa} className="btn-destaque mt-8 w-full justify-start">
            <Plus size={18} strokeWidth={2.5} /> Nova pessoa
            <kbd className="ml-auto rounded bg-tinta/10 px-1.5 text-xs font-semibold">N</kbd>
          </button>
          <nav className="mt-6 space-y-1" aria-label="Principal">
            {NAV.map(({ para, rotulo, icone: Icone }) => (
              <NavLink key={para} to={para} end={para === '/'}
                className={({ isActive }) => clsx('relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-semibold transition-colors',
                  isActive ? 'text-white' : 'text-white/60 hover:text-white')}>
                {({ isActive }) => (
                  <>
                    {isActive && <motion.span layoutId="nav-lateral" className="absolute inset-0 rounded-lg bg-white/10" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                    <Icone size={19} className="relative" />
                    <span className="relative">{rotulo}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto space-y-3">
            {modoDemo && (
              <div className="rounded-xl bg-white/[0.07] p-3 text-[13px] leading-snug text-white/75">
                <strong className="block text-white">Modo demonstração</strong>
                Os dados ficam só neste navegador. Preencha o .env para usar o Firebase.
                <button onClick={reiniciarDemo} className="mt-2 block font-semibold text-maracuja hover:underline">Restaurar exemplos</button>
              </div>
            )}
            <div className="flex items-center gap-3 rounded-xl px-2 py-2">
              {usuario?.photoURL ? (
                <img src={usuario.photoURL} alt="" className="size-9 rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <span className="grid size-9 place-items-center rounded-full bg-white/10 font-display font-semibold">
                  {(usuario?.displayName || usuario?.email || '?')[0].toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{usuario?.displayName || 'Sua conta'}</p>
                <p className="truncate text-xs text-white/55">{usuario?.email}</p>
              </div>
              <button onClick={sair} className="rounded-lg p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white" aria-label="Sair" title="Sair">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </aside>

        {/* Topo (celular) */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-linha bg-papel/90 px-4 py-3 backdrop-blur md:hidden">
          <Marca />
          <button onClick={sair} className="btn-fantasma p-2" aria-label="Sair"><LogOut size={19} /></button>
        </header>

        <main className="min-w-0 px-4 pb-32 pt-5 md:px-10 md:pb-16 md:pt-10">
          {modoDemo && (
            <p className="mb-4 rounded-lg bg-maracuja-claro px-3.5 py-2.5 text-[13px] text-tinta md:hidden">
              Modo demonstração: dados só neste navegador.
            </p>
          )}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={local.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14 }}
              className="mx-auto max-w-6xl"
            >
              {outlet}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Abas (celular) */}
        <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-30 border-t border-linha bg-cartao/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
          <div className="relative grid grid-cols-4 items-center">
            {NAV.slice(0, 2).map((n) => <Aba key={n.para} {...n} />)}
            <div className="flex justify-center">
              <button onClick={ui.novaPessoa} aria-label="Nova pessoa"
                className="-mt-7 grid size-14 place-items-center rounded-2xl bg-maracuja text-tinta shadow-[0_10px_24px_-8px_rgba(168,102,11,.7)] transition-transform active:scale-90">
                <Plus size={26} strokeWidth={2.5} />
              </button>
            </div>
            <Aba {...NAV[2]} />
          </div>
        </nav>
      </div>

      <FormPessoa {...pessoaForm} aoFechar={() => setPessoaForm((s) => ({ ...s, aberta: false }))} />
      <FormPlano {...planoForm} aoFechar={() => setPlanoForm((s) => ({ ...s, aberta: false }))} />
      <Lembrete pessoa={lembrete} aoFechar={() => setLembrete(null)} />
    </UICtx.Provider>
  )
}

function Aba({ para, rotulo, icone: Icone }) {
  return (
    <NavLink to={para} end={para === '/'}
      className={({ isActive }) => clsx('flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors', isActive ? 'text-tinta' : 'text-tinta-2/70')}>
      {({ isActive }) => (
        <>
          <span className="relative grid h-7 w-12 place-items-center">
            {isActive && <motion.span layoutId="aba" className="absolute inset-0 rounded-full bg-maracuja-claro" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
            <Icone size={20} className="relative" />
          </span>
          {rotulo}
        </>
      )}
    </NavLink>
  )
}
