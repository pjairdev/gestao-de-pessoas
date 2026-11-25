// Armazenamento local usado só no MODO DEMONSTRAÇÃO (sem Firebase configurado).
// Imita a API do repositório para que você possa testar a interface na hora.

const CHAVE = 'inscritos-demo-v1'
const DIA = 86_400_000
const ouvintes = { pessoas: new Set(), planos: new Set() }

function semente() {
  const agora = Date.now()
  const atras = (dias, horas = 0) => new Date(agora - dias * DIA - horas * 3_600_000).toISOString()
  const planos = [
    { id: 'p1', nome: 'Essencial', valor: 89.9, periodicidade: 'mensal', descricao: 'Acesso básico, 2 encontros por semana.', ativo: true },
    { id: 'p2', nome: 'Completo', valor: 149.9, periodicidade: 'mensal', descricao: 'Acesso livre e acompanhamento individual.', ativo: true },
    { id: 'p3', nome: 'Anual Completo', valor: 1490, periodicidade: 'anual', descricao: 'Plano Completo com 2 meses de desconto.', ativo: true },
  ].map((p) => ({ ...p, criadoEm: atras(30), atualizadoEm: atras(30) }))
  const pessoa = (id, nomeCompleto, dataNascimento, whatsapp, status, planoId, diasStatus, lembretes = 0, obs = '') => ({
    id, nomeCompleto, dataNascimento, whatsapp, status, planoId, observacoes: obs,
    criadoEm: atras(diasStatus + 2), atualizadoEm: atras(diasStatus), statusAlteradoEm: atras(diasStatus, 3),
    lembretes, ultimoLembreteEm: lembretes ? atras(Math.max(0, diasStatus - 2)) : null,
  })
  const pessoas = [
    pessoa('a1', 'Marina Souza Lima', '1994-03-12', '5575991234567', 'comunicada', null, 9, 2, 'Pediu para falar depois do dia 10.'),
    pessoa('a2', 'Carlos Henrique Batista', '1988-07-30', '5571988776655', 'comunicada', null, 4, 1),
    pessoa('a3', 'Joana Ribeiro', '2001-11-02', '5575999001122', 'comunicada', null, 1),
    pessoa('a4', 'Rafael Oliveira Santos', '1990-01-19', '5575988112233', 'interessada', 'p2', 3),
    pessoa('a5', 'Luciana Ferreira Matos', '1985-05-25', '5571999887766', 'interessada', 'p3', 6),
    pessoa('a6', 'Tiago Nascimento', '1998-09-08', '5575987654321', 'interessada', 'p1', 0),
    pessoa('a7', 'Beatriz Carvalho Pinto', '1979-12-14', '5571991112233', 'sem_interesse', null, 12, 0, 'Mudou de cidade.'),
  ]
  return { pessoas, planos }
}

function ler() {
  try {
    const bruto = localStorage.getItem(CHAVE)
    if (bruto) return JSON.parse(bruto)
  } catch { /* storage indisponível */ }
  const s = semente()
  gravar(s)
  return s
}

let estado = null
function obter() {
  if (!estado) estado = ler()
  return estado
}

function gravar(s) {
  try { localStorage.setItem(CHAVE, JSON.stringify(s)) } catch { /* ignora */ }
}

const hidratar = (r) => ({
  ...r,
  criadoEm: r.criadoEm ? new Date(r.criadoEm) : null,
  atualizadoEm: r.atualizadoEm ? new Date(r.atualizadoEm) : null,
  statusAlteradoEm: r.statusAlteradoEm ? new Date(r.statusAlteradoEm) : null,
  ultimoLembreteEm: r.ultimoLembreteEm ? new Date(r.ultimoLembreteEm) : null,
})

function emitir(col) {
  const s = obter()
  let lista = s[col].map(hidratar)
  lista = col === 'pessoas'
    ? lista.sort((a, b) => b.criadoEm - a.criadoEm)
    : lista.sort((a, b) => a.valor - b.valor)
  ouvintes[col].forEach((fn) => fn(lista))
}

function salvar(col) {
  gravar(obter())
  // pequena espera para imitar a rede
  setTimeout(() => emitir(col), 120)
}

export function ouvir(col, fn) {
  ouvintes[col].add(fn)
  setTimeout(() => emitir(col), 350)
  return () => ouvintes[col].delete(fn)
}

const novoId = () => (crypto.randomUUID?.() ?? String(Math.random()).slice(2)).replace(/-/g, '').slice(0, 20)
const agoraIso = () => new Date().toISOString()

export function criarPessoa(p) {
  const id = novoId()
  const t = agoraIso()
  obter().pessoas.push({ ...p, id, criadoEm: t, atualizadoEm: t, statusAlteradoEm: t, lembretes: 0, ultimoLembreteEm: null })
  salvar('pessoas')
  return id
}

export function atualizarPessoa(id, p, mudouStatus) {
  const s = obter()
  const i = s.pessoas.findIndex((x) => x.id === id)
  if (i < 0) throw new Error('Pessoa não encontrada.')
  const t = agoraIso()
  s.pessoas[i] = {
    ...s.pessoas[i],
    ...p,
    atualizadoEm: t,
    ...(mudouStatus ? { statusAlteradoEm: t, lembretes: 0, ultimoLembreteEm: null } : {}),
  }
  salvar('pessoas')
}

export function registrarLembrete(id) {
  const s = obter()
  const x = s.pessoas.find((p) => p.id === id)
  if (!x) return
  x.lembretes = (x.lembretes || 0) + 1
  x.ultimoLembreteEm = agoraIso()
  x.atualizadoEm = agoraIso()
  salvar('pessoas')
}

export function criarPlano(p) {
  const id = novoId()
  const t = agoraIso()
  obter().planos.push({ ...p, id, criadoEm: t, atualizadoEm: t })
  salvar('planos')
  return id
}

export function atualizarPlano(id, p) {
  const s = obter()
  const i = s.planos.findIndex((x) => x.id === id)
  if (i < 0) throw new Error('Plano não encontrado.')
  s.planos[i] = { ...s.planos[i], ...p, atualizadoEm: agoraIso() }
  salvar('planos')
}

export function excluir(col, id) {
  const s = obter()
  s[col] = s[col].filter((x) => x.id !== id)
  salvar(col)
}

export function reiniciarDemo() {
  estado = semente()
  gravar(estado)
  emitir('pessoas')
  emitir('planos')
}
