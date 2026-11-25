import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import clsx from 'clsx'
import { Confirmar, Gaveta } from './Camadas'
import { Campo } from './Pecas'
import { useDados } from '../context/DataContext'
import { atualizarPlano, criarPlano, excluirPlano, mensagemErro } from '../lib/repo'
import { errosPorCampo, planoSchema, PERIODICIDADES } from '../lib/validation'
import { NOME_PERIODO } from '../lib/format'

export function FormPlano({ aberta, plano, versao, aoFechar }) {
  return (
    <Gaveta
      aberta={aberta}
      aoFechar={aoFechar}
      titulo={plano ? plano.nome : 'Novo plano'}
      descricao={plano ? 'Mudar o valor atualiza o total de quem já escolheu este plano.' : 'Os planos aparecem para escolher quando alguém fica Interessada.'}
    >
      <Conteudo key={versao} plano={plano} aoFechar={aoFechar} />
    </Gaveta>
  )
}

function Conteudo({ plano, aoFechar }) {
  const { uid, usoPlano } = useDados()
  const editando = !!plano
  const emUso = editando ? usoPlano[plano.id] || 0 : 0
  const [v, setV] = useState(() =>
    plano
      ? { nome: plano.nome, valor: String(plano.valor).replace('.', ','), periodicidade: plano.periodicidade, descricao: plano.descricao ?? '', ativo: plano.ativo }
      : { nome: '', valor: '', periodicidade: 'mensal', descricao: '', ativo: true },
  )
  const [erros, setErros] = useState({})
  const [salvando, setSalvando] = useState(false)
  const [confirmar, setConfirmar] = useState(false)

  // "1.490,00" e "1490.00" viram 1490
  const paraNumero = (s) => {
    s = String(s)
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
    return s
  }
  const paraSchema = (x) => ({ ...x, valor: x.valor === '' ? undefined : paraNumero(x.valor) })

  function mudar(campo, valor) {
    const p = { ...v, [campo]: valor }
    setV(p)
    if (erros[campo]) setErros(errosPorCampo(planoSchema.safeParse(paraSchema(p))))
  }

  async function salvar(e) {
    e.preventDefault()
    const r = planoSchema.safeParse(paraSchema(v))
    const er = errosPorCampo(r)
    setErros(er)
    if (!r.success) return document.getElementById(Object.keys(er)[0])?.focus()
    setSalvando(true)
    try {
      if (editando) await atualizarPlano(uid, plano.id, r.data)
      else await criarPlano(uid, r.data)
      toast.success(editando ? 'Plano atualizado.' : `Plano ${r.data.nome} criado.`)
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
      await excluirPlano(uid, plano.id)
      toast.success('Plano excluído.')
      aoFechar()
    } catch (err) {
      toast.error(mensagemErro(err))
    } finally {
      setSalvando(false)
      setConfirmar(false)
    }
  }

  return (
    <form onSubmit={salvar} noValidate className="flex min-h-full flex-col">
      <div className="flex-1 space-y-5">
        <Campo rotulo="Nome do plano" htmlFor="nome" erro={erros.nome}>
          <input id="nome" className="campo" maxLength={60} placeholder="Ex.: Completo" value={v.nome}
            aria-invalid={erros.nome ? 'true' : undefined}
            onChange={(e) => mudar('nome', e.target.value)} autoFocus={!editando} />
        </Campo>

        <Campo rotulo="Valor" htmlFor="valor" erro={erros.valor}>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-tinta-2">R$</span>
            <input id="valor" className="campo numero pl-10" inputMode="decimal" placeholder="0,00" value={v.valor}
              aria-invalid={erros.valor ? 'true' : undefined}
              onChange={(e) => mudar('valor', e.target.value.replace(/[^\d.,]/g, '').slice(0, 12))} />
          </div>
        </Campo>

        <div className="space-y-2">
          <span className="text-sm font-semibold">Cobrança</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cobrança">
            {PERIODICIDADES.map((p) => (
              <button key={p} type="button" role="radio" aria-checked={v.periodicidade === p}
                onClick={() => mudar('periodicidade', p)}
                className={clsx('cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors',
                  v.periodicidade === p ? 'border-tinta bg-tinta text-white' : 'border-linha bg-cartao text-tinta-2 hover:border-tinta/40')}>
                {NOME_PERIODO[p]}
              </button>
            ))}
          </div>
        </div>

        <Campo rotulo="Descrição" htmlFor="descricao" opcional erro={erros.descricao}>
          <textarea id="descricao" rows={3} maxLength={300} className="campo resize-none" value={v.descricao}
            placeholder="O que está incluído" onChange={(e) => mudar('descricao', e.target.value)} />
        </Campo>

        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-linha bg-cartao px-4 py-3">
          <span>
            <span className="block font-semibold">Disponível para novos interessados</span>
            <span className="block text-[13px] text-tinta-2">Desligado, o plano some da escolha mas continua em quem já tem.</span>
          </span>
          <input type="checkbox" className="peer sr-only" checked={v.ativo} onChange={(e) => mudar('ativo', e.target.checked)} />
          <span className="relative h-7 w-12 shrink-0 rounded-full bg-tinta/15 transition-colors peer-checked:bg-folha peer-focus-visible:ring-4 peer-focus-visible:ring-maracuja/40
            after:absolute after:left-1 after:top-1 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform after:duration-200 peer-checked:after:translate-x-5" aria-hidden />
        </label>
      </div>

      <div className="sticky -bottom-6 -mx-6 -mb-6 mt-6 flex items-center gap-2 border-t border-linha bg-papel/95 px-6 pb-6 pt-4 backdrop-blur">
        {editando && (
          <button type="button" className="btn-perigo px-3" aria-label="Excluir plano"
            onClick={() => emUso ? toast.info(`${emUso} ${emUso === 1 ? 'pessoa escolheu' : 'pessoas escolheram'} este plano. Desligue a disponibilidade em vez de excluir.`) : setConfirmar(true)}>
            <Trash2 size={18} />
          </button>
        )}
        <div className="flex-1" />
        <button type="button" className="btn-fantasma" onClick={aoFechar}>Cancelar</button>
        <button type="submit" className="btn-primario min-w-28" disabled={salvando}>
          {salvando ? 'Salvando…' : editando ? 'Salvar plano' : 'Criar plano'}
        </button>
      </div>

      {editando && (
        <Confirmar aberta={confirmar} aoFechar={() => setConfirmar(false)} titulo={`Excluir o plano ${plano.nome}?`}
          descricao="Ninguém escolheu este plano ainda, então nada mais é afetado." rotulo="Excluir plano"
          aoConfirmar={excluir} ocupado={salvando} />
      )}
    </form>
  )
}
