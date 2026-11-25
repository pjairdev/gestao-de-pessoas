import { motion } from 'motion/react'
import clsx from 'clsx'
import { ROTULO_STATUS, calorDias } from '../lib/format'

export const COR_STATUS = {
  interessada: { texto: 'text-folha', fundo: 'bg-folha-claro', ponto: 'bg-folha', barra: 'bg-folha' },
  comunicada: { texto: 'text-ambar', fundo: 'bg-ambar-claro', ponto: 'bg-ambar', barra: 'bg-maracuja' },
  sem_interesse: { texto: 'text-pedra', fundo: 'bg-pedra-claro', ponto: 'bg-pedra', barra: 'bg-pedra/50' },
}

export function Selo({ status, className }) {
  const c = COR_STATUS[status]
  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-semibold', c.fundo, c.texto, className)}>
      <span className={clsx('size-1.5 rounded-full', c.ponto)} aria-hidden />
      {ROTULO_STATUS[status]}
    </span>
  )
}

const COR_CALOR = { folha: 'text-folha', ambar: 'text-ambar', brasa: 'text-brasa' }

/** O número grande de dias que alguém está esperando retorno. */
export function Dias({ dias, tamanho = 'g' }) {
  const cor = COR_CALOR[calorDias(dias)]
  return (
    <div className={clsx('flex flex-col items-center leading-none', cor)} aria-label={`${dias} dias neste status`}>
      <span className={clsx('numero font-semibold', tamanho === 'g' ? 'text-[44px] tracking-tight' : 'text-2xl')}>{dias}</span>
      <span className={clsx('font-medium', tamanho === 'g' ? 'mt-1 text-xs' : 'text-[11px]')}>{dias === 1 ? 'dia' : 'dias'}</span>
    </div>
  )
}

/** Controle segmentado com indicador que desliza entre as opções. */
export function Segmentado({ opcoes, valor, aoMudar, id, rotulo, className }) {
  return (
    <div role="radiogroup" aria-label={rotulo} className={clsx('relative flex gap-1 rounded-xl bg-tinta/[0.06] p-1', className)}>
      {opcoes.map((o) => {
        const ativo = o.valor === valor
        return (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={ativo}
            onClick={() => aoMudar(o.valor)}
            className={clsx(
              'relative flex-1 cursor-pointer whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
              ativo ? 'text-tinta' : 'text-tinta-2 hover:text-tinta',
            )}
          >
            {ativo && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-lg bg-cartao shadow-[0_1px_2px_rgba(27,36,51,.12),0_4px_12px_-6px_rgba(27,36,51,.25)]"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
            <span className="relative flex items-center justify-center gap-1.5">
              {o.icone}
              {o.rotulo}
              {o.contagem !== undefined && (
                <span className={clsx('numero text-xs', ativo ? 'text-tinta-2' : 'text-tinta-2/70')}>{o.contagem}</span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function Campo({ rotulo, erro, dica, children, htmlFor, opcional }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="flex items-baseline justify-between text-sm font-semibold text-tinta">
        {rotulo}
        {opcional && <span className="text-xs font-normal text-tinta-2">opcional</span>}
      </label>
      {children}
      {erro ? (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          id={`${htmlFor}-erro`}
          className="text-[13px] font-medium text-brasa"
          role="alert"
        >
          {erro}
        </motion.p>
      ) : dica ? (
        <p className="text-[13px] text-tinta-2">{dica}</p>
      ) : null}
    </div>
  )
}

export function Vazio({ icone, titulo, texto, acao }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-maracuja-claro text-ambar">{icone}</div>
      <h3 className="text-lg font-semibold">{titulo}</h3>
      <p className="mt-1 max-w-sm text-[15px] text-tinta-2">{texto}</p>
      {acao && <div className="mt-5">{acao}</div>}
    </div>
  )
}

export function Esqueleto({ linhas = 4 }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Carregando">
      {Array.from({ length: linhas }).map((_, i) => (
        <div key={i} className="h-[72px] animate-pulse rounded-xl bg-tinta/[0.05]" style={{ animationDelay: `${i * 90}ms` }} />
      ))}
    </div>
  )
}

export function Iniciais({ nome, className }) {
  const partes = (nome || '').split(' ').filter(Boolean)
  const ini = ((partes[0]?.[0] || '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase()
  return (
    <span className={clsx('grid size-10 shrink-0 place-items-center rounded-full bg-tinta/[0.07] font-display text-sm font-semibold text-tinta', className)} aria-hidden>
      {ini}
    </span>
  )
}
