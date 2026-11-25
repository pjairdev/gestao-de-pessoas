import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Cake, Hourglass, MessageCircle, ThumbsDown, ThumbsUp } from 'lucide-react'
import { toast } from 'sonner'
import clsx from 'clsx'
import { useAuth } from '../context/AuthContext'
import { useDados } from '../context/DataContext'
import { useUI } from '../components/Layout'
import { COR_STATUS, Dias, Esqueleto, Vazio } from '../components/Pecas'
import { mensagemErro, mudarStatus } from '../lib/repo'
import { OBS_NAO_COMUNICADA, formatarWhatsapp } from '../lib/validation'
import { ROTULO_PERIODO, ROTULO_STATUS, dataCurta, formatarMoeda, primeiroNome, saudacao } from '../lib/format'

export function Painel() {
  const { usuario } = useAuth()
  const { pessoas, planos, contagem, usoPlano, carregando, uid } = useDados()
  const ui = useUI()
  const [ocupado, setOcupado] = useState(null)

  const fila = useMemo(
    () => pessoas.filter((p) => p.status === 'comunicada').sort((a, b) => b.dias - a.dias || a.nomeCompleto.localeCompare(b.nomeCompleto)),
    [pessoas],
  )

  const total = pessoas.length

  const negociacao = useMemo(() => {
    const porPeriodo = {}
    pessoas.forEach((p) => {
      if (p.status === 'interessada' && p.plano) {
        porPeriodo[p.plano.periodicidade] = (porPeriodo[p.plano.periodicidade] || 0) + p.plano.valor
      }
    })
    return Object.entries(porPeriodo)
  }, [pessoas])

  const aniversariantes = useMemo(() => {
    const mes = String(new Date().getMonth() + 1).padStart(2, '0')
    return pessoas
      .filter((p) => p.status !== 'sem_interesse' && p.dataNascimento?.slice(5, 7) === mes)
      .sort((a, b) => a.dataNascimento.slice(8).localeCompare(b.dataNascimento.slice(8)))
  }, [pessoas])

  async function semInteresse(p) {
    setOcupado(p.id)
    try {
      await mudarStatus(uid, p, 'sem_interesse')
      toast(`${primeiroNome(p.nomeCompleto)} foi marcada como sem interesse.`)
    } catch (e) {
      toast.error(mensagemErro(e))
    } finally {
      setOcupado(null)
    }
  }

  const nome = primeiroNome(usuario?.displayName || '')

  return (
    <div>
      <header className="mb-8">
        <p className="text-[15px] text-tinta-2">{saudacao()}{nome ? `, ${nome}` : ''}.</p>
        <h1 className="mt-1 text-3xl font-semibold md:text-4xl">
          {carregando ? 'Carregando…' : fila.length === 0 ? 'Nenhum retorno pendente' : fila.length === 1 ? '1 pessoa esperando retorno' : `${fila.length} pessoas esperando retorno`}
        </h1>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* Fila de retorno */}
        <section aria-labelledby="fila">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="fila" className="text-lg font-semibold">Aguardando retorno</h2>
            <span className="hidden text-[13px] text-tinta-2 sm:inline">Quem espera há mais tempo aparece primeiro</span>
          </div>

          {carregando ? (
            <Esqueleto linhas={3} />
          ) : fila.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-linha">
              <Vazio
                icone={<Hourglass size={26} />}
                titulo="Tudo em dia"
                texto="Quando alguém for marcado como Comunicada, aparece aqui com a contagem de dias até responder."
                acao={<button className="btn-primario" onClick={ui.novaPessoa}>Cadastrar pessoa</button>}
              />
            </div>
          ) : (
            <ul className="overflow-hidden rounded-2xl border border-linha bg-cartao">
              <AnimatePresence initial={false}>
                {fila.map((p) => (
                  <motion.li
                    key={p.id}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0, transition: { duration: 0.25 } }}
                    className="border-b border-linha last:border-b-0"
                  >
                    <div className="flex items-center gap-4 px-4 py-4 sm:gap-5 sm:px-5">
                      <div className="w-14 shrink-0"><Dias dias={p.dias} /></div>
                      <button className="min-w-0 flex-1 cursor-pointer text-left" onClick={() => ui.editarPessoa(p)}>
                        <span className="block truncate font-semibold">{p.nomeCompleto}</span>
                        <span className={p.whatsapp ? 'numero block text-sm text-tinta-2' : 'block text-sm italic text-tinta-2/70'}>
                          {p.whatsapp ? formatarWhatsapp(p.whatsapp) : 'Sem WhatsApp cadastrado'}
                        </span>
                        {p.observacoes?.includes(OBS_NAO_COMUNICADA) && (
                          <span className="mt-1 inline-block rounded-full bg-maracuja-claro px-2 py-0.5 text-[12px] font-semibold text-ambar">Comunicação pendente</span>
                        )}
                        <span className="mt-0.5 block text-[13px] text-tinta-2">
                          {p.lembretes === 0
                            ? 'Nenhum lembrete enviado'
                            : `${p.lembretes} ${p.lembretes === 1 ? 'lembrete' : 'lembretes'}, o último em ${dataCurta(p.ultimoLembreteEm)}`}
                        </span>
                      </button>
                      <div className="flex shrink-0 items-center gap-1">
                        <button className="btn-fantasma hidden p-2.5 sm:inline-flex" title="Marcar como interessada" aria-label={`Marcar ${p.nomeCompleto} como interessada`}
                          onClick={() => ui.editarPessoa(p, { status: 'interessada' })}>
                          <ThumbsUp size={18} />
                        </button>
                        <button className="btn-fantasma hidden p-2.5 sm:inline-flex" title="Marcar sem interesse" aria-label={`Marcar ${p.nomeCompleto} sem interesse`}
                          disabled={ocupado === p.id} onClick={() => semInteresse(p)}>
                          <ThumbsDown size={18} />
                        </button>
                        {p.whatsapp ? (
                          <button className="btn-zap px-3 sm:px-4" onClick={() => ui.enviarLembrete(p)}>
                            <MessageCircle size={18} />
                            <span className="hidden sm:inline">Lembrete</span>
                          </button>
                        ) : (
                          <button className="btn-contorno px-3 text-sm sm:px-4" onClick={() => ui.editarPessoa(p)}>
                            <span className="hidden sm:inline">Adicionar WhatsApp</span>
                            <span className="sm:hidden">+ Número</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </section>

        {/* Coluna lateral */}
        <div className="space-y-8">
          <section aria-labelledby="funil">
            <h2 id="funil" className="mb-3 text-lg font-semibold">Situação dos cadastros</h2>
            <div className="rounded-2xl border border-linha bg-cartao p-5">
              <p className="numero text-4xl font-semibold">{total}</p>
              <p className="text-sm text-tinta-2">{total === 1 ? 'pessoa cadastrada' : 'pessoas cadastradas'}</p>
              <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-tinta/[0.06]" aria-hidden>
                {['interessada', 'comunicada', 'sem_interesse'].map((s) => (
                  <motion.div key={s} className={COR_STATUS[s].barra}
                    initial={false} animate={{ width: total ? `${(contagem[s] / total) * 100}%` : '0%' }}
                    transition={{ type: 'spring', stiffness: 200, damping: 30 }} />
                ))}
              </div>
              <ul className="mt-4 space-y-1">
                {['interessada', 'comunicada', 'sem_interesse'].map((s) => (
                  <li key={s}>
                    <Link to={`/pessoas?status=${s}`} className="-mx-2 flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-tinta/[0.04]">
                      <span className={clsx('size-2.5 rounded-full', COR_STATUS[s].barra)} />
                      <span className="flex-1 text-[15px]">{ROTULO_STATUS[s]}</span>
                      <span className="numero font-semibold">{contagem[s]}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section aria-labelledby="negociacao">
            <h2 id="negociacao" className="mb-3 text-lg font-semibold">Em negociação</h2>
            <div className="rounded-2xl bg-tinta p-5 text-white">
              {negociacao.length === 0 ? (
                <p className="text-[15px] text-white/70">Os valores aparecem quando alguém fica Interessada em um plano.</p>
              ) : (
                <ul className="space-y-2">
                  {negociacao.map(([per, v]) => (
                    <li key={per} className="flex items-baseline justify-between gap-3">
                      <span className="numero text-2xl font-semibold text-maracuja">{formatarMoeda(v)}</span>
                      <span className="text-sm text-white/65">{ROTULO_PERIODO[per]}</span>
                    </li>
                  ))}
                </ul>
              )}
              {planos.length > 0 && (
                <ul className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm">
                  {planos.map((pl) => (
                    <li key={pl.id} className="flex justify-between gap-3 text-white/80">
                      <span className="truncate">{pl.nome}</span>
                      <span className="numero shrink-0">{usoPlano[pl.id] || 0} {(usoPlano[pl.id] || 0) === 1 ? 'pessoa' : 'pessoas'}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {aniversariantes.length > 0 && (
            <section aria-labelledby="aniver">
              <h2 id="aniver" className="mb-3 flex items-center gap-2 text-lg font-semibold">
                <Cake size={19} className="text-ambar" /> Aniversários do mês
              </h2>
              <ul className="space-y-1">
                {aniversariantes.map((p) => (
                  <li key={p.id}>
                    <button onClick={() => ui.editarPessoa(p)} className="-mx-2 flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-tinta/[0.04]">
                      <span className="numero w-8 text-lg font-semibold text-ambar">{p.dataNascimento.slice(8)}</span>
                      <span className="flex-1 truncate text-[15px]">{p.nomeCompleto}</span>
                      <span className="text-[13px] text-tinta-2">
                        {Number(p.dataNascimento.slice(8)) < new Date().getDate() ? 'fez' : Number(p.dataNascimento.slice(8)) === new Date().getDate() ? 'hoje,' : 'faz'}{' '}
                        {new Date().getFullYear() - Number(p.dataNascimento.slice(0, 4))}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
