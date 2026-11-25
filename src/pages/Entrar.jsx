import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Eye, EyeOff, LockKeyhole, MailCheck } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../context/AuthContext'
import { Campo } from '../components/Pecas'
import { mensagemErro } from '../lib/repo'
import { credenciaisSchema, errosPorCampo } from '../lib/validation'
import { modoDemo } from '../lib/firebase'

const FILA_EXEMPLO = [
  { dias: 9, nome: 'Marina S.', cor: 'text-brasa' },
  { dias: 4, nome: 'Carlos H.', cor: 'text-ambar' },
  { dias: 1, nome: 'Joana R.', cor: 'text-folha' },
]

function Google() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1 .7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.7V6.6h-4a12 12 0 0 0 0 10.8l4-3Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z" />
    </svg>
  )
}

export function Entrar() {
  const auth = useAuth()
  const [modo, setModo] = useState('entrar') // entrar | cadastrar | recuperar
  const [v, setV] = useState({ nome: '', email: '', senha: '' })
  const [erros, setErros] = useState({})
  const [ocupado, setOcupado] = useState(false)
  const [verSenha, setVerSenha] = useState(false)

  const mudar = (c) => (e) => { setV({ ...v, [c]: e.target.value }); setErros({ ...erros, [c]: undefined }) }

  async function enviar(e) {
    e.preventDefault()
    const email = v.email.trim().toLowerCase()
    let er = {}
    if (modo === 'cadastrar') {
      er = errosPorCampo(credenciaisSchema.safeParse({ email, senha: v.senha }))
      if (v.nome.trim().length < 2) er.nome = 'Como devemos te chamar?'
    } else {
      if (!/^\S+@\S+\.\S+$/.test(email)) er.email = 'E-mail inválido.'
      if (modo === 'entrar' && !v.senha) er.senha = 'Digite sua senha.'
    }
    setErros(er)
    if (Object.keys(er).length) return

    setOcupado(true)
    try {
      if (modo === 'entrar') await auth.entrar(email, v.senha)
      if (modo === 'cadastrar') {
        await auth.cadastrar(v.nome, email, v.senha)
        toast.success('Conta criada. Enviamos um link de confirmação para o seu e-mail.')
      }
      if (modo === 'recuperar') {
        await auth.recuperarSenha(email)
        toast.success('Se este e-mail tiver conta, o link para criar uma nova senha chega em instantes.')
        setModo('entrar')
      }
    } catch (err) {
      // Na recuperação, não revelamos se o e-mail existe.
      if (modo === 'recuperar') { toast.success('Se este e-mail tiver conta, o link chega em instantes.'); setModo('entrar') }
      else toast.error(mensagemErro(err))
    } finally {
      setOcupado(false)
    }
  }

  async function google() {
    setOcupado(true)
    try { await auth.entrarGoogle() } catch (err) { toast.error(mensagemErro(err)) } finally { setOcupado(false) }
  }

  const titulo = { entrar: 'Entrar', cadastrar: 'Criar conta', recuperar: 'Nova senha' }[modo]

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-tinta p-12 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <img src="/icone.svg" alt="" className="size-9" />
          <span className="font-display text-2xl font-semibold">Inscritos</span>
        </div>
        <div className="max-w-md">
          <h1 className="font-display text-[44px] font-semibold leading-[1.05] tracking-tight">Saiba quem está esperando a sua resposta.</h1>
          <p className="mt-4 text-lg text-white/70">Cadastre quem você conversou, acompanhe o interesse e lembre no WhatsApp quem ainda não respondeu.</p>
          <ul className="mt-10 space-y-2" aria-hidden>
            {FILA_EXEMPLO.map((f, i) => (
              <motion.li key={f.nome}
                initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.12, type: 'spring', stiffness: 260, damping: 26 }}
                className="flex items-center gap-4 rounded-xl bg-white px-4 py-3 text-tinta">
                <span className={`numero w-10 text-center text-3xl font-semibold ${f.cor}`}>{f.dias}</span>
                <span className="flex-1 font-semibold">{f.nome}</span>
                <span className="rounded-lg bg-zap px-3 py-1.5 text-sm font-semibold text-white">Lembrete</span>
              </motion.li>
            ))}
          </ul>
        </div>
        <p className="flex items-center gap-2 text-sm text-white/55">
          <LockKeyhole size={15} /> Conexão criptografada e dados acessíveis só pela sua conta.
        </p>
      </aside>

      <main className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <img src="/icone.svg" alt="" className="size-9" />
            <span className="font-display text-2xl font-semibold">Inscritos</span>
          </div>

          {modoDemo ? (
            <div>
              <h2 className="text-3xl font-semibold">Modo demonstração</h2>
              <p className="mt-2 text-[15px] text-tinta-2">
                O Firebase ainda não foi configurado, então o app usa dados de exemplo guardados só neste navegador.
                Preencha o arquivo <code className="rounded bg-tinta/[0.07] px-1">.env.local</code> para ativar login e banco de dados.
              </p>
              <button className="btn-primario mt-6 w-full" onClick={auth.entrarDemo}>Abrir demonstração</button>
            </div>
          ) : (
            <>
              <AnimatePresence mode="wait">
                <motion.h2 key={titulo} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}
                  className="text-3xl font-semibold">{titulo}</motion.h2>
              </AnimatePresence>
              {modo === 'recuperar' && <p className="mt-2 text-[15px] text-tinta-2">Informe seu e-mail e enviaremos um link para criar outra senha.</p>}

              {modo !== 'recuperar' && (
                <>
                  <button className="btn-contorno mt-6 w-full" onClick={google} disabled={ocupado}><Google /> Continuar com Google</button>
                  <div className="my-5 flex items-center gap-3 text-[13px] text-tinta-2">
                    <span className="h-px flex-1 bg-linha" /> ou com e-mail <span className="h-px flex-1 bg-linha" />
                  </div>
                </>
              )}

              <form onSubmit={enviar} noValidate className={`space-y-4 ${modo === 'recuperar' ? 'mt-6' : ''}`}>
                <AnimatePresence initial={false}>
                  {modo === 'cadastrar' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <Campo rotulo="Seu nome" htmlFor="nome" erro={erros.nome}>
                        <input id="nome" className="campo" autoComplete="name" maxLength={80} value={v.nome} onChange={mudar('nome')} aria-invalid={erros.nome ? 'true' : undefined} />
                      </Campo>
                    </motion.div>
                  )}
                </AnimatePresence>
                <Campo rotulo="E-mail" htmlFor="email" erro={erros.email}>
                  <input id="email" type="email" className="campo" autoComplete="email" maxLength={254} value={v.email} onChange={mudar('email')} aria-invalid={erros.email ? 'true' : undefined} />
                </Campo>
                {modo !== 'recuperar' && (
                  <Campo rotulo="Senha" htmlFor="senha" erro={erros.senha} dica={modo === 'cadastrar' ? 'Pelo menos 8 caracteres, com letras e números.' : undefined}>
                    <div className="relative">
                      <input id="senha" type={verSenha ? 'text' : 'password'} className="campo pr-11" maxLength={128}
                        autoComplete={modo === 'cadastrar' ? 'new-password' : 'current-password'}
                        value={v.senha} onChange={mudar('senha')} aria-invalid={erros.senha ? 'true' : undefined} />
                      <button type="button" onClick={() => setVerSenha(!verSenha)} className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-2 text-tinta-2 hover:text-tinta"
                        aria-label={verSenha ? 'Esconder senha' : 'Mostrar senha'}>
                        {verSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </Campo>
                )}
                <button type="submit" className="btn-primario w-full" disabled={ocupado}>
                  {ocupado ? 'Aguarde…' : { entrar: 'Entrar', cadastrar: 'Criar conta', recuperar: 'Enviar link' }[modo]}
                </button>
              </form>

              <div className="mt-6 space-y-2 text-center text-[15px]">
                {modo === 'entrar' && (
                  <>
                    <button className="font-semibold text-tinta underline-offset-4 hover:underline" onClick={() => setModo('recuperar')}>Esqueci minha senha</button>
                    <p className="text-tinta-2">Ainda não tem conta? <button className="font-semibold text-tinta underline-offset-4 hover:underline" onClick={() => setModo('cadastrar')}>Criar conta</button></p>
                  </>
                )}
                {modo !== 'entrar' && (
                  <button className="font-semibold text-tinta underline-offset-4 hover:underline" onClick={() => setModo('entrar')}>Voltar para entrar</button>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export function ConfirmarEmail() {
  const { usuario, reenviarVerificacao, conferirVerificacao, sair } = useAuth()
  const [ocupado, setOcupado] = useState(false)

  async function conferir() {
    setOcupado(true)
    try {
      const ok = await conferirVerificacao()
      if (!ok) toast('Ainda não confirmado. Abra o link que enviamos e tente de novo.')
    } catch (e) { toast.error(mensagemErro(e)) } finally { setOcupado(false) }
  }

  async function reenviar() {
    try { await reenviarVerificacao(); toast.success('Link reenviado.') } catch (e) { toast.error(mensagemErro(e)) }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-5">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-maracuja-claro text-ambar"><MailCheck size={30} /></div>
        <h1 className="text-3xl font-semibold">Confirme seu e-mail</h1>
        <p className="mt-2 text-[15px] text-tinta-2">
          Enviamos um link para <strong className="text-tinta">{usuario?.email}</strong>. Os dados só ficam acessíveis depois da confirmação.
        </p>
        <button className="btn-primario mt-6 w-full" onClick={conferir} disabled={ocupado}>{ocupado ? 'Conferindo…' : 'Já confirmei'}</button>
        <div className="mt-4 flex justify-center gap-2">
          <button className="btn-fantasma text-sm" onClick={reenviar}>Reenviar link</button>
          <button className="btn-fantasma text-sm" onClick={sair}>Sair</button>
        </div>
      </div>
    </main>
  )
}
