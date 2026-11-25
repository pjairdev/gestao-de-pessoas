import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from './AuthContext'
import { mensagemErro, ouvirPessoas, ouvirPlanos } from '../lib/repo'
import { diasDesde } from '../lib/format'

const DataCtx = createContext(null)
const ordemAlfabetica = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true })

export function DataProvider({ children }) {
  const { usuario } = useAuth()
  const uid = usuario?.uid
  const [pessoas, setPessoas] = useState([])
  const [planos, setPlanos] = useState([])
  const [prontos, setProntos] = useState({ pessoas: false, planos: false })
  const [agora, setAgora] = useState(Date.now())

  useEffect(() => {
    if (!uid) return
    setProntos({ pessoas: false, planos: false })
    const erro = (e) => toast.error(mensagemErro(e))
    const a = ouvirPessoas(uid, (l) => { setPessoas(l); setProntos((p) => ({ ...p, pessoas: true })) }, erro)
    const b = ouvirPlanos(uid, (l) => { setPlanos(l); setProntos((p) => ({ ...p, planos: true })) }, erro)
    return () => { a(); b() }
  }, [uid])

  // Atualiza a contagem de dias sem precisar recarregar a página.
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [])

  const valor = useMemo(() => {
    const planoPorId = Object.fromEntries(planos.map((p) => [p.id, p]))
    // Ordem alfabética (ignora acentos e maiúsculas: "Álvaro" fica junto de "Alice").
    const comDias = pessoas
      .map((p) => ({ ...p, dias: diasDesde(p.statusAlteradoEm, agora), plano: planoPorId[p.planoId] ?? null }))
      .sort((a, b) => ordemAlfabetica.compare(a.nomeCompleto, b.nomeCompleto))
    const contagem = { interessada: 0, comunicada: 0, sem_interesse: 0 }
    comDias.forEach((p) => { contagem[p.status] = (contagem[p.status] || 0) + 1 })
    const usoPlano = {}
    comDias.forEach((p) => {
      if (p.status === 'interessada' && p.planoId) usoPlano[p.planoId] = (usoPlano[p.planoId] || 0) + 1
    })
    return {
      uid,
      pessoas: comDias,
      planos,
      planoPorId,
      contagem,
      usoPlano,
      carregando: !prontos.pessoas || !prontos.planos,
    }
  }, [pessoas, planos, prontos, agora, uid])

  return <DataCtx.Provider value={valor}>{children}</DataCtx.Provider>
}

export function useDados() {
  return useContext(DataCtx)
}
