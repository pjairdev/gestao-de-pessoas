import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Package, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import clsx from 'clsx'
import { Confirmar, Gaveta } from './Camadas'
import { Campo, Segmentado } from './Pecas'
import { useDados } from '../context/DataContext'
import { atualizarPessoa, criarPessoa, excluirPessoa, mensagemErro } from '../lib/repo'
import { OBSERVACOES_COMUNICADA, errosPorCampo, mascararWhatsapp, normalizarWhatsapp, pessoaSchema } from '../lib/validation'
import { ROTULO_PERIODO, ROTULO_STATUS, formatarMoeda, idade, primeiroNome, textoDias } from '../lib/format'

const VAZIO = { nomeCompleto: '', dataNascimento: '', whatsapp: '', status: 'comunicada', planoId: null, observacoes: '' }

const OPCOES_STATUS = [
  { valor: 'interessada', rotulo: 'Interessada' },
  { valor: 'comunicada', rotulo: 'Comunicada' },
  { valor: 'sem_interesse', rotulo: 'Sem interesse' },
]

export function FormPessoa({ aberta, pessoa, inicial, versao, aoFechar }) {
  const editando = !!pessoa
  return (
    <Gaveta
      aberta={aberta}
      aoFechar={aoFechar}
      titulo={editando ? primeiroNome(pessoa.nomeCompleto) || 'Editar pessoa' : 'Nova pessoa'}
      descricao={
        editando
          ? `${ROTULO_STATUS[pessoa.status]} ${textoDias(pessoa.dias)}${pessoa.lembretes ? `, ${pessoa.lembretes} ${pessoa.lembretes === 1 ? 'lembrete' : 'lembretes'}` : ''}`
          : 'Só o nome é obrigatório. Quanto mais dados, mais fácil acompanhar.'
      }
    >
      <Conteudo key={versao} pessoa={pessoa} inicial={inicial} aoFechar={aoFechar} />
    </Gaveta>
  )
}

function Conteudo({ pessoa, inicial, aoFechar }) {
  const { uid, planos, pessoas } = useDados()
  const editando = !!pessoa
  const [v, setV] = useState(() =>
    pessoa
      ? {
          nomeCompleto: pessoa.nomeCompleto,
          dataNascimento: pessoa.dataNascimento,
          whatsapp: mascararWhatsapp(pessoa.whatsapp),
          status: pessoa.status,
          planoId: pessoa.planoId,
          observacoes: pessoa.observacoes ?? '',
          ...(inicial || {}),
        }
      : VAZIO,
  )
  const [erros, setErros] = useState({})
  const [tocados, setTocados] = useState({})
  const [salvando, setSalvando] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  const primeiro = useRef(null)

  useEffect(() => {
    if (!editando) setTimeout(() => primeiro.current?.focus(), 250)
  }, [editando])

  const planosVisiveis = planos.filter((p) => p.ativo || p.id === v.planoId)

  const duplicada = useMemo(() => {
    const n = normalizarWhatsapp(v.whatsapp)
    if (n.length < 12) return null
    return pessoas.find((p) => p.whatsapp === n && p.id !== pessoa?.id) ?? null
  }, [v.whatsapp, pessoas, pessoa])

  function validar(proximo = v) {
    const e = errosPorCampo(pessoaSchema.safeParse(proximo))
    setErros(e)
    return e
  }

  function mudar(campo, valor) {
    const proximo = { ...v, [campo]: valor }
    if (campo === 'status' && valor !== 'interessada') proximo.planoId = null
    if (campo === 'status' && valor === 'interessada' && !proximo.planoId && planosVisiveis.length === 1) {
      proximo.planoId = planosVisiveis[0].id
    }
    setV(proximo)
    if (tocados[campo] || erros[campo] || campo === 'status' || campo === 'planoId') validar(proximo)
  }

  // Liga/desliga uma observação pronta sem apagar o que já foi escrito.
  function alternarObservacao(texto) {
    const atual = v.observacoes
    const proximo = atual.includes(texto)
      ? atual.replace(texto, '').replace(/\n{2,}/g, '\n').trim()
      : [atual.trim(), texto].filter(Boolean).join('\n')
    mudar('observacoes', proximo.slice(0, 500))
  }

  const nomeIncompleto = v.nomeCompleto.trim().length >= 2 && !v.nomeCompleto.trim().includes(' ') && !erros.nomeCompleto

  const tocar = (campo) => () => {
    setTocados((t) => ({ ...t, [campo]: true }))
    validar()
  }

  async function salvar(e) {
    e.preventDefault()
    const errosAtuais = validar()
    setTocados({ nomeCompleto: true, dataNascimento: true, whatsapp: true, planoId: true, observacoes: true })
    if (Object.keys(errosAtuais).length) {
      const campo = Object.keys(errosAtuais)[0]
      document.getElementById(campo)?.focus()
      return
    }
    setSalvando(true)
    try {
      if (editando) {
        await atualizarPessoa(uid, pessoa.id, v, pessoa)
        toast.success('Alterações salvas.')
      } else {
        await criarPessoa(uid, v)
        toast.success(`${primeiroNome(v.nomeCompleto.trim())} foi cadastrada.`)
      }
      aoFechar()
    } catch (err) {
      toast.error(mensagemErro(err))
    } finally {
      setSalvando(false)
    }
  }

  async function excluir() {
    setSalvando(true)
    try {
      await excluirPessoa(uid, pessoa.id)
      toast.success('Cadastro excluído.')
      setConfirmar(false)
      aoFechar()
    } catch (err) {
      toast.error(mensagemErro(err))
    } finally {
      setSalvando(false)
    }
  }

  const anos = v.dataNascimento && !erros.dataNascimento ? idade(v.dataNascimento) : null
  const aria = (campo) => ({
    id: campo,
    'aria-invalid': erros[campo] && tocados[campo] ? 'true' : undefined,
    'aria-describedby': erros[campo] ? `${campo}-erro` : undefined,
  })

  return (
    <form onSubmit={salvar} noValidate className="flex min-h-full flex-col">
      <div className="flex-1 space-y-5">
        <Campo
          rotulo="Nome completo"
          htmlFor="nomeCompleto"
          erro={tocados.nomeCompleto && erros.nomeCompleto}
          dica={nomeIncompleto ? 'Dica: com o sobrenome fica mais fácil encontrar a pessoa depois.' : undefined}
        >
          <input
            ref={primeiro}
            {...aria('nomeCompleto')}
            className="campo"
            autoComplete="off"
            maxLength={120}
            placeholder="Ex.: Ana Paula Ribeiro"
            value={v.nomeCompleto}
            onChange={(e) => mudar('nomeCompleto', e.target.value)}
            onBlur={tocar('nomeCompleto')}
          />
        </Campo>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Campo
            rotulo="Data de nascimento"
            opcional
            htmlFor="dataNascimento"
            erro={tocados.dataNascimento && erros.dataNascimento}
            dica={anos !== null ? `${anos} anos` : undefined}
          >
            <input
              {...aria('dataNascimento')}
              type="date"
              className="campo"
              min="1900-01-01"
              max={new Date().toISOString().slice(0, 10)}
              value={v.dataNascimento}
              onChange={(e) => mudar('dataNascimento', e.target.value)}
              onBlur={tocar('dataNascimento')}
            />
          </Campo>

          <Campo
            rotulo="WhatsApp"
            opcional
            htmlFor="whatsapp"
            dica={!erros.whatsapp && !v.whatsapp ? 'Sem número não dá para enviar lembrete.' : undefined}
            erro={tocados.whatsapp && erros.whatsapp}
          >
            <input
              {...aria('whatsapp')}
              className="campo numero"
              type="tel"
              inputMode="numeric"
              autoComplete="off"
              placeholder="(DDD) 99999-9999"
              value={v.whatsapp}
              onChange={(e) => mudar('whatsapp', mascararWhatsapp(e.target.value))}
              onBlur={tocar('whatsapp')}
            />
          </Campo>
        </div>

        <AnimatePresence>
          {duplicada && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden rounded-lg bg-maracuja-claro px-3.5 py-2.5 text-sm text-tinta"
            >
              Este número já está cadastrado para <strong>{duplicada.nomeCompleto}</strong>.
            </motion.p>
          )}
        </AnimatePresence>

        <div className="space-y-2">
          <span className="text-sm font-semibold">Status</span>
          <Segmentado
            id="status-form"
            rotulo="Status"
            opcoes={OPCOES_STATUS}
            valor={v.status}
            aoMudar={(s) => mudar('status', s)}
          />
        </div>

        <AnimatePresence initial={false}>
          {v.status === 'interessada' && (
            <motion.fieldset
              key="pacote"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="min-w-0 overflow-hidden"
            >
              <legend className="mb-2 text-sm font-semibold">Pacote escolhido</legend>
              {planosVisiveis.length === 0 ? (
                <div className="rounded-xl border border-dashed border-linha p-4 text-sm text-tinta-2">
                  Nenhum plano cadastrado ainda.{' '}
                  <Link to="/planos" className="font-semibold text-tinta underline underline-offset-2" onClick={aoFechar}>
                    Criar um plano
                  </Link>
                </div>
              ) : (
                <div role="radiogroup" aria-label="Pacote escolhido" className="space-y-2 pb-1" id="planoId">
                  {planosVisiveis.map((p) => {
                    const ativo = v.planoId === p.id
                    return (
                      <button
                        key={p.id}
                        type="button"
                        role="radio"
                        aria-checked={ativo}
                        onClick={() => mudar('planoId', p.id)}
                        className={clsx(
                          'flex w-full cursor-pointer items-center gap-3 rounded-xl border bg-cartao px-4 py-3 text-left transition-[border-color,box-shadow]',
                          ativo ? 'border-folha ring-4 ring-folha/15' : 'border-linha hover:border-tinta/30',
                        )}
                      >
                        <span className={clsx('grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors', ativo ? 'border-folha bg-folha text-white' : 'border-linha')}>
                          {ativo && <Check size={14} strokeWidth={3} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold">{p.nome}{!p.ativo && <span className="ml-2 text-xs font-normal text-tinta-2">(inativo)</span>}</span>
                          {p.descricao && <span className="block truncate text-[13px] text-tinta-2">{p.descricao}</span>}
                        </span>
                        <span className="text-right">
                          <span className="numero block font-semibold">{formatarMoeda(p.valor)}</span>
                          <span className="block text-xs text-tinta-2">{ROTULO_PERIODO[p.periodicidade]}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
              {erros.planoId && tocados.planoId && (
                <p className="mt-2 text-[13px] font-medium text-brasa" role="alert">
                  <Package size={14} className="mr-1 inline" /> {erros.planoId}
                </p>
              )}
            </motion.fieldset>
          )}
        </AnimatePresence>

        <Campo rotulo="Observações" htmlFor="observacoes" opcional erro={erros.observacoes}>
          <AnimatePresence initial={false}>
            {v.status === 'comunicada' && (
              <motion.div
                key="prontas"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-2 pb-2" role="group" aria-label="Observações prontas">
                  {OBSERVACOES_COMUNICADA.map((texto) => {
                    const marcada = v.observacoes.includes(texto)
                    return (
                      <button
                        key={texto}
                        type="button"
                        aria-pressed={marcada}
                        onClick={() => alternarObservacao(texto)}
                        className={clsx(
                          'inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors',
                          marcada
                            ? 'border-ambar bg-ambar-claro text-ambar'
                            : 'border-linha bg-cartao text-tinta-2 hover:border-tinta/40 hover:text-tinta',
                        )}
                      >
                        {marcada ? <Check size={14} strokeWidth={3} /> : <Plus size={14} strokeWidth={2.5} />}
                        {texto.replace(/\.$/, '')}
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <textarea
            {...aria('observacoes')}
            rows={3}
            maxLength={500}
            className="campo resize-none"
            placeholder="Ex.: prefere contato à noite"
            value={v.observacoes}
            onChange={(e) => mudar('observacoes', e.target.value)}
          />
        </Campo>

        {editando && v.status !== pessoa.status && (
          <p className="rounded-lg bg-tinta/[0.05] px-3.5 py-2.5 text-[13px] text-tinta-2">
            Ao salvar, a contagem de dias recomeça a partir de hoje no novo status.
          </p>
        )}
      </div>

      <div className="sticky -bottom-6 -mx-6 -mb-6 mt-6 flex items-center gap-2 border-t border-linha bg-papel/95 px-6 pb-6 pt-4 backdrop-blur">
        {editando && (
          <button type="button" className="btn-perigo px-3" onClick={() => setConfirmar(true)} aria-label="Excluir cadastro">
            <Trash2 size={18} />
          </button>
        )}
        <div className="flex-1" />
        <button type="button" className="btn-fantasma" onClick={aoFechar}>Cancelar</button>
        <button type="submit" className="btn-primario min-w-32" disabled={salvando}>
          {salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Cadastrar'}
        </button>
      </div>

      {editando && (
        <Confirmar
          aberta={confirmar}
          aoFechar={() => setConfirmar(false)}
          titulo={`Excluir ${pessoa.nomeCompleto}?`}
          descricao="O cadastro e o histórico de lembretes somem de vez. Não dá para desfazer."
          rotulo="Excluir cadastro"
          aoConfirmar={excluir}
          ocupado={salvando}
        />
      )}
    </form>
  )
}
