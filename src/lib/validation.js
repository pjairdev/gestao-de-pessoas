import { z } from 'zod'

// ── Sanitização ──────────────────────────────────────────────────────────────
// Tudo que o usuário digita passa por aqui ANTES de ir para o banco.
// As mesmas regras são conferidas de novo no servidor (firestore.rules).

const CONTROLE = new RegExp('[\\u0000-\\u001F\\u007F-\\u009F\\u200B-\\u200F\\u2028-\\u202E\\u2066-\\u2069]', 'g')
const PERIGOSOS = /[<>{}]/g

/** Remove caracteres de controle/invisíveis e símbolos usados em injeção, normaliza espaços. */
export function limparTexto(valor, { multilinha = false } = {}) {
  if (typeof valor !== 'string') return ''
  let s = valor.normalize('NFC').replace(PERIGOSOS, '')
  if (multilinha) {
    s = s
      .split('\n')
      .map((linha) => linha.replace(CONTROLE, '').replace(/[ \t]+/g, ' ').trim())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
  } else {
    s = s.replace(CONTROLE, '').replace(/\s+/g, ' ')
  }
  return s.trim()
}

// DDDs válidos no Brasil (todos os estados).
export const DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69,
  71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
])

/**
 * Deixa só dígitos e converte para 55 + DDD + número.
 * Aceita colado de qualquer jeito: +55 (71) 98877-6655, 071 98877-6655, 7133334444...
 */
export function normalizarWhatsapp(valor) {
  let d = String(valor ?? '').replace(/\D/g, '')
  if (!d) return ''
  if (d.startsWith('00')) d = d.slice(2)                       // 00 55 ...
  if (d.startsWith('0') && (d.length === 11 || d.length === 12)) d = d.slice(1) // 0 + DDD + número
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) return d
  if (d.length === 10 || d.length === 11) return `55${d}`
  return d
}

/** Confere DDD e formato: celular (9 + 8 dígitos) ou fixo (8 dígitos). */
export function whatsappValido(e164) {
  const m = /^55(\d{2})(\d{8,9})$/.exec(e164)
  if (!m) return false
  const [, ddd, num] = m
  if (!DDDS.has(Number(ddd))) return false
  return num.length === 9 ? num.startsWith('9') : /^[2-8]/.test(num)
}

/** Máscara de digitação: (71) 98877-6655 ou (71) 3333-4444 */
export function mascararWhatsapp(valor) {
  let d = String(valor ?? '').replace(/\D/g, '')
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2)
  if (d.length > 11 && d.startsWith('0')) d = d.slice(1)
  d = d.slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export function formatarWhatsapp(e164) {
  if (!e164) return ''
  return mascararWhatsapp(String(e164).replace(/^55/, ''))
}

/** Observações prontas para quem está "Comunicada". */
export const OBSERVACOES_COMUNICADA = [
  'Ainda não foi devidamente comunicada.',
  'Mensagem enviada, aguardando resposta.',
  'Pediu para retornar em outro momento.',
]
export const OBS_NAO_COMUNICADA = OBSERVACOES_COMUNICADA[0]

// ── Schemas ──────────────────────────────────────────────────────────────────

export const STATUS = ['interessada', 'comunicada', 'sem_interesse']
export const PERIODICIDADES = ['mensal', 'trimestral', 'semestral', 'anual', 'unico']

const NOME = /^[\p{L}\p{M}][\p{L}\p{M}'’. -]*$/u

function dataValida(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
  const [a, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(a, m - 1, d))
  return dt.getUTCFullYear() === a && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

export const pessoaSchema = z
  .object({
    nomeCompleto: z
      .string()
      .transform((v) => limparTexto(v))
      .pipe(
        z
          .string()
          .min(2, 'Digite o nome da pessoa.')
          .max(120, 'Use no máximo 120 caracteres.')
          .regex(NOME, 'Use só letras, espaços, hífen ou apóstrofo.'),
      ),
    // Opcional: vazio é aceito; se preenchida, precisa ser uma data real.
    dataNascimento: z
      .string()
      .optional()
      .default('')
      .refine((v) => v === '' || dataValida(v), 'Data inválida.')
      .refine((v) => {
        if (v === '') return true
        const ano = Number(v.slice(0, 4))
        const hoje = new Date().toISOString().slice(0, 10)
        return ano >= 1900 && v <= hoje
      }, 'A data precisa estar entre 1900 e hoje.'),
    // Opcional: vazio é aceito; se preenchido, qualquer DDD do Brasil.
    whatsapp: z
      .string()
      .optional()
      .default('')
      .transform(normalizarWhatsapp)
      .refine((v) => v === '' || whatsappValido(v), 'Número inválido. Use DDD + número, ex.: (71) 98877-6655.'),
    status: z.enum(STATUS, { error: 'Escolha um status.' }),
    planoId: z.string().max(64).nullable(),
    observacoes: z
      .string()
      .optional()
      .default('')
      .transform((v) => limparTexto(v, { multilinha: true }))
      .pipe(z.string().max(500, 'Use no máximo 500 caracteres.')),
  })
  .superRefine((d, ctx) => {
    if (d.status === 'interessada' && !d.planoId) {
      ctx.addIssue({ code: 'custom', path: ['planoId'], message: 'Escolha o pacote desta pessoa.' })
    }
  })
  .transform((d) => ({ ...d, planoId: d.status === 'interessada' ? d.planoId : null }))

export const planoSchema = z.object({
  nome: z
    .string()
    .transform((v) => limparTexto(v))
    .pipe(z.string().min(2, 'Dê um nome ao plano.').max(60, 'Use no máximo 60 caracteres.')),
  valor: z.coerce
    .number({ error: 'Informe um valor.' })
    .min(0, 'O valor não pode ser negativo.')
    .max(1_000_000, 'Valor acima do limite.')
    .transform((v) => Math.round(v * 100) / 100),
  periodicidade: z.enum(PERIODICIDADES),
  descricao: z
    .string()
    .optional()
    .default('')
    .transform((v) => limparTexto(v))
    .pipe(z.string().max(300, 'Use no máximo 300 caracteres.')),
  ativo: z.boolean(),
})

export const credenciaisSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('E-mail inválido.')),
  senha: z
    .string()
    .min(8, 'A senha precisa de pelo menos 8 caracteres.')
    .max(128)
    .refine((s) => /[A-Za-z]/.test(s) && /\d/.test(s), 'Misture letras e números.'),
})

/** Converte o erro do zod em { campo: 'mensagem' } para mostrar no formulário. */
export function errosPorCampo(resultado) {
  if (resultado.success) return {}
  const erros = {}
  for (const issue of resultado.error.issues) {
    const campo = issue.path[0]
    if (campo && !erros[campo]) erros[campo] = issue.message
  }
  return erros
}
