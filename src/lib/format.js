const DIA = 86_400_000

export const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function formatarMoeda(v) {
  return moeda.format(Number(v) || 0)
}

/** Dias inteiros desde a data (0 = hoje). */
export function diasDesde(data, agora = Date.now()) {
  if (!data) return 0
  const t = data instanceof Date ? data.getTime() : new Date(data).getTime()
  return Math.max(0, Math.floor((agora - t) / DIA))
}

export function textoDias(n) {
  if (n === 0) return 'hoje'
  if (n === 1) return 'há 1 dia'
  return `há ${n} dias`
}

/** Quanto mais tempo sem retorno, mais "quente" a cor. */
export function calorDias(n) {
  if (n >= 7) return 'brasa'
  if (n >= 3) return 'ambar'
  return 'folha'
}

export function idade(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null
  const [a, m, d] = iso.split('-').map(Number)
  const hoje = new Date()
  let i = hoje.getFullYear() - a
  if (hoje.getMonth() + 1 < m || (hoje.getMonth() + 1 === m && hoje.getDate() < d)) i--
  return i
}

export function dataCurta(data) {
  if (!data) return ''
  return new Date(data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export function dataNascimentoBR(iso) {
  if (!iso) return ''
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

export const ROTULO_STATUS = {
  interessada: 'Interessada',
  comunicada: 'Comunicada',
  sem_interesse: 'Sem interesse',
}

export const ROTULO_PERIODO = {
  mensal: 'por mês',
  trimestral: 'por trimestre',
  semestral: 'por semestre',
  anual: 'por ano',
  unico: 'pagamento único',
}

export const NOME_PERIODO = {
  mensal: 'Mensal',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
  unico: 'Único',
}

export function primeiroNome(nome = '') {
  return nome.split(' ')[0] || ''
}

export function saudacao() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}
