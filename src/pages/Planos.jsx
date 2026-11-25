import { Package, Plus } from 'lucide-react'
import clsx from 'clsx'
import { useDados } from '../context/DataContext'
import { useUI } from '../components/Layout'
import { Esqueleto, Vazio } from '../components/Pecas'
import { NOME_PERIODO, ROTULO_PERIODO, formatarMoeda } from '../lib/format'

export function Planos() {
  const { planos, usoPlano, carregando } = useDados()
  const ui = useUI()

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold md:text-4xl">Planos</h1>
          <p className="mt-1 max-w-xl text-[15px] text-tinta-2">Os pacotes que uma pessoa pode escolher quando fica Interessada.</p>
        </div>
        <button className="btn-primario" onClick={ui.novoPlano}><Plus size={18} /> Novo plano</button>
      </header>

      {carregando ? (
        <Esqueleto linhas={3} />
      ) : planos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-linha">
          <Vazio icone={<Package size={26} />} titulo="Nenhum plano ainda"
            texto="Crie os pacotes que você oferece com nome, valor e forma de cobrança."
            acao={<button className="btn-primario" onClick={ui.novoPlano}><Plus size={18} /> Criar primeiro plano</button>} />
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {planos.map((p) => {
            const n = usoPlano[p.id] || 0
            return (
              <li key={p.id}>
                <button onClick={() => ui.editarPlano(p)}
                  className={clsx('group flex h-full w-full cursor-pointer flex-col rounded-2xl border bg-cartao p-5 text-left transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-tinta/30',
                    p.ativo ? 'border-linha' : 'border-dashed border-linha opacity-70')}>
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-xl font-semibold">{p.nome}</h2>
                    <span className="rounded-full bg-tinta/[0.06] px-2.5 py-1 text-xs font-semibold text-tinta-2">
                      {p.ativo ? NOME_PERIODO[p.periodicidade] : 'Indisponível'}
                    </span>
                  </div>
                  <p className="mt-4">
                    <span className="numero text-3xl font-semibold">{formatarMoeda(p.valor)}</span>
                    <span className="ml-1.5 text-sm text-tinta-2">{ROTULO_PERIODO[p.periodicidade]}</span>
                  </p>
                  {p.descricao && <p className="mt-2 line-clamp-2 text-[15px] text-tinta-2">{p.descricao}</p>}
                  <div className="min-h-5 flex-1" />
                  <div className="flex items-baseline justify-between border-t border-linha pt-4 text-sm">
                    <span className="text-tinta-2">{n === 0 ? 'Ninguém escolheu ainda' : n === 1 ? '1 pessoa interessada' : `${n} pessoas interessadas`}</span>
                    {n > 0 && <span className="numero font-semibold text-folha">{formatarMoeda(n * p.valor)}</span>}
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
