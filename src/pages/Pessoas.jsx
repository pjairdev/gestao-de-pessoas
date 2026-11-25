import { useDeferredValue, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { MessageCircle, Plus, Search, UserPlus, X } from 'lucide-react'
import { useDados } from '../context/DataContext'
import { useUI } from '../components/Layout'
import { Esqueleto, Iniciais, Segmentado, Selo, Vazio } from '../components/Pecas'
import { OBS_NAO_COMUNICADA, formatarWhatsapp } from '../lib/validation'
import { ROTULO_PERIODO, calorDias, formatarMoeda, idade, textoDias } from '../lib/format'
import clsx from 'clsx'

const semAcento = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
const COR_CALOR = { folha: 'text-folha', ambar: 'text-ambar', brasa: 'text-brasa' }
const inicial = (nome = '') => {
  const l = semAcento(nome.trim()).charAt(0).toUpperCase()
  return /[A-Z]/.test(l) ? l : '#'
}

export function Pessoas() {
  const { pessoas, contagem, carregando } = useDados()
  const ui = useUI()
  const [params, setParams] = useSearchParams()
  const filtro = ['interessada', 'comunicada', 'sem_interesse'].includes(params.get('status')) ? params.get('status') : 'todas'
  const busca = params.get('q') ?? ''
  const buscaAdiada = useDeferredValue(busca)

  function atualizar(chave, valor) {
    const p = new URLSearchParams(params)
    if (!valor || valor === 'todas') p.delete(chave)
    else p.set(chave, valor)
    setParams(p, { replace: true })
  }

  const lista = useMemo(() => {
    const termo = semAcento(buscaAdiada.trim())
    const digitos = buscaAdiada.replace(/\D/g, '')
    return pessoas.filter((p) => {
      if (filtro !== 'todas' && p.status !== filtro) return false
      if (!termo) return true
      return semAcento(p.nomeCompleto).includes(termo) || (digitos.length >= 3 && p.whatsapp.includes(digitos))
    })
  }, [pessoas, filtro, buscaAdiada])

  const opcoes = [
    { valor: 'todas', rotulo: 'Todas', contagem: pessoas.length },
    { valor: 'interessada', rotulo: 'Interessadas', contagem: contagem.interessada },
    { valor: 'comunicada', rotulo: 'Comunicadas', contagem: contagem.comunicada },
    { valor: 'sem_interesse', rotulo: 'Sem interesse', contagem: contagem.sem_interesse },
  ]

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-semibold md:text-4xl">Pessoas</h1>
        <button className="btn-primario hidden md:inline-flex" onClick={ui.novaPessoa}>
          <Plus size={18} /> Nova pessoa
        </button>
      </header>

      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative xl:w-80">
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-tinta-2" />
          <input
            type="search"
            className="campo pl-10 pr-9"
            placeholder="Buscar por nome ou número"
            aria-label="Buscar por nome ou número"
            value={busca}
            maxLength={60}
            onChange={(e) => atualizar('q', e.target.value)}
          />
          {busca && (
            <button className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-tinta-2 hover:text-tinta" onClick={() => atualizar('q', '')} aria-label="Limpar busca">
              <X size={16} />
            </button>
          )}
        </div>
        <div className="-mx-4 overflow-x-auto px-4 xl:mx-0 xl:px-0">
          <Segmentado id="filtro" rotulo="Filtrar por status" opcoes={opcoes} valor={filtro} aoMudar={(v) => atualizar('status', v)} className="min-w-max" />
        </div>
      </div>

      {carregando ? (
        <Esqueleto linhas={6} />
      ) : pessoas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-linha">
          <Vazio icone={<UserPlus size={26} />} titulo="Nenhuma pessoa cadastrada"
            texto="Cadastre quem você já conversou para acompanhar o interesse e os pacotes escolhidos."
            acao={<button className="btn-primario" onClick={ui.novaPessoa}><Plus size={18} /> Cadastrar a primeira</button>} />
        </div>
      ) : lista.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-linha">
          <Vazio icone={<Search size={26} />} titulo="Ninguém encontrado"
            texto={busca ? `Nada com "${busca}" neste filtro. Tente outro termo ou veja todas.` : 'Nenhuma pessoa com este status agora.'}
            acao={<button className="btn-contorno" onClick={() => setParams({}, { replace: true })}>Ver todas</button>} />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-linha bg-cartao">
          <div className="hidden grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)_minmax(0,1.8fr)_auto] gap-4 border-b border-linha px-5 py-3 text-[13px] font-semibold text-tinta-2 lg:grid">
            <span>Nome</span><span>WhatsApp</span><span>Situação</span><span className="w-[116px]" />
          </div>
          <ul>
            <AnimatePresence initial={false}>
              {lista.flatMap((p, i) => {
                const letra = inicial(p.nomeCompleto)
                const itens = []
                if (i === 0 || inicial(lista[i - 1].nomeCompleto) !== letra) {
                  itens.push(
                    <motion.li key={`letra-${letra}`} layout="position"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.12 } }}
                      className="border-b border-linha bg-papel/60 px-5 py-1.5 font-display text-sm font-semibold text-tinta-2"
                      aria-hidden>
                      {letra}
                    </motion.li>,
                  )
                }
                itens.push(
                  <motion.li key={p.id} layout="position"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.12 } }}
                    className="border-b border-linha last:border-b-0">
                    <Linha p={p} ui={ui} />
                  </motion.li>,
                )
                return itens
              })}
            </AnimatePresence>
          </ul>
        </div>
      )}
      {!carregando && lista.length > 0 && (
        <p className="mt-3 text-[13px] text-tinta-2">
          {lista.length === pessoas.length ? `${lista.length} no total` : `${lista.length} de ${pessoas.length}`}
        </p>
      )}
    </div>
  )
}

function Linha({ p, ui }) {
  const anos = idade(p.dataNascimento)
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => ui.editarPessoa(p)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ui.editarPessoa(p) } }}
      className={clsx('grid cursor-pointer grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-4 py-3.5 transition-colors hover:bg-tinta/[0.025] sm:px-5',
        'lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)_minmax(0,1.8fr)_auto]', p.pendente && 'opacity-60')}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Iniciais nome={p.nomeCompleto} />
        <div className="min-w-0">
          <p className="truncate font-semibold">{p.nomeCompleto}</p>
          <p className="text-[13px] text-tinta-2">
            {anos !== null && <span>{anos} anos</span>}
            {anos !== null && p.whatsapp && <span className="lg:hidden">, </span>}
            {p.whatsapp && <span className="numero lg:hidden">{formatarWhatsapp(p.whatsapp)}</span>}
            {anos === null && !p.whatsapp && <span className="italic">Sem WhatsApp</span>}
          </p>
        </div>
      </div>

      <span className={clsx('hidden text-[15px] lg:block', p.whatsapp ? 'numero text-tinta-2' : 'italic text-tinta-2/60')}>
        {p.whatsapp ? formatarWhatsapp(p.whatsapp) : 'Sem WhatsApp'}
      </span>

      <div className="col-span-2 flex flex-wrap items-center gap-x-3 gap-y-1 pl-[52px] lg:col-span-1 lg:pl-0">
        <Selo status={p.status} />
        {p.status === 'interessada' && p.plano && (
          <span className="text-[13px] text-tinta">
            <strong className="font-semibold">{p.plano.nome}</strong>{' '}
            <span className="numero text-tinta-2">{formatarMoeda(p.plano.valor)} {ROTULO_PERIODO[p.plano.periodicidade]}</span>
          </span>
        )}
        {p.status === 'comunicada' && (
          <span className={clsx('text-[13px] font-semibold', COR_CALOR[calorDias(p.dias)])}>{textoDias(p.dias)}</span>
        )}
        {p.status === 'comunicada' && p.observacoes?.includes(OBS_NAO_COMUNICADA) && (
          <span className="rounded-full bg-maracuja-claro px-2 py-0.5 text-[12px] font-semibold text-ambar">Comunicação pendente</span>
        )}
        {p.status === 'sem_interesse' && <span className="text-[13px] text-tinta-2">{textoDias(p.dias)}</span>}
      </div>

      <div className="col-start-2 row-start-1 flex w-auto justify-end lg:col-start-auto lg:row-start-auto lg:w-[116px]">
        {p.status === 'comunicada' && p.whatsapp && (
          <button className="btn-zap px-3 py-2 text-sm" onClick={(e) => { e.stopPropagation(); ui.enviarLembrete(p) }}
            aria-label={`Enviar lembrete para ${p.nomeCompleto}`}>
            <MessageCircle size={16} /> <span className="hidden sm:inline">Lembrete</span>
          </button>
        )}
      </div>
    </div>
  )
}
