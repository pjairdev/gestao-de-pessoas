import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db, modoDemo } from './firebase'
import { pessoaSchema, planoSchema } from './validation'
import * as demo from './demoStore'

// Toda escrita passa pelo schema aqui, mesmo que o formulário já tenha validado.
// Assim nenhum componente consegue mandar dado cru para o banco por engano.
function validar(schema, dados) {
  const r = schema.safeParse(dados)
  if (!r.success) {
    const err = new Error(r.error.issues[0]?.message || 'Dados inválidos.')
    err.code = 'validacao'
    throw err
  }
  return r.data
}

const paraData = (v) => (v && typeof v.toDate === 'function' ? v.toDate() : v ?? null)

function converter(snap) {
  const d = snap.data({ serverTimestamps: 'estimate' })
  return {
    id: snap.id,
    ...d,
    criadoEm: paraData(d.criadoEm),
    atualizadoEm: paraData(d.atualizadoEm),
    statusAlteradoEm: paraData(d.statusAlteradoEm),
    ultimoLembreteEm: paraData(d.ultimoLembreteEm),
    pendente: snap.metadata.hasPendingWrites,
  }
}

const colPessoas = (uid) => collection(db, 'usuarios', uid, 'pessoas')
const colPlanos = (uid) => collection(db, 'usuarios', uid, 'planos')

// ── Leitura em tempo real ────────────────────────────────────────────────────

export function ouvirPessoas(uid, aoMudar, aoErrar) {
  if (modoDemo) return demo.ouvir('pessoas', aoMudar)
  const q = query(colPessoas(uid), orderBy('criadoEm', 'desc'))
  return onSnapshot(q, { includeMetadataChanges: false }, (s) => aoMudar(s.docs.map(converter)), aoErrar)
}

export function ouvirPlanos(uid, aoMudar, aoErrar) {
  if (modoDemo) return demo.ouvir('planos', aoMudar)
  const q = query(colPlanos(uid), orderBy('valor', 'asc'))
  return onSnapshot(q, (s) => aoMudar(s.docs.map(converter)), aoErrar)
}

// ── Pessoas ──────────────────────────────────────────────────────────────────

export async function criarPessoa(uid, dados) {
  const p = validar(pessoaSchema, dados)
  if (modoDemo) return demo.criarPessoa(p)
  const agora = serverTimestamp()
  const ref = await addDoc(colPessoas(uid), {
    ...p,
    criadoEm: agora,
    atualizadoEm: agora,
    statusAlteradoEm: agora,
    lembretes: 0,
    ultimoLembreteEm: null,
  })
  return ref.id
}

export async function atualizarPessoa(uid, id, dados, anterior) {
  const p = validar(pessoaSchema, dados)
  const mudouStatus = p.status !== anterior.status
  if (modoDemo) return demo.atualizarPessoa(id, p, mudouStatus)
  await updateDoc(doc(colPessoas(uid), id), {
    ...p,
    atualizadoEm: serverTimestamp(),
    ...(mudouStatus
      ? { statusAlteradoEm: serverTimestamp(), lembretes: 0, ultimoLembreteEm: null }
      : {}),
  })
}

/** Troca só o status (usado nos atalhos da lista). */
export async function mudarStatus(uid, pessoa, status, planoId = null) {
  return atualizarPessoa(
    uid,
    pessoa.id,
    {
      nomeCompleto: pessoa.nomeCompleto,
      dataNascimento: pessoa.dataNascimento,
      whatsapp: pessoa.whatsapp,
      observacoes: pessoa.observacoes ?? '',
      status,
      planoId: status === 'interessada' ? planoId ?? pessoa.planoId : null,
    },
    pessoa,
  )
}

export async function registrarLembrete(uid, pessoa) {
  if (pessoa.status !== 'comunicada') throw new Error('Lembretes são só para pessoas comunicadas.')
  if (modoDemo) return demo.registrarLembrete(pessoa.id)
  await updateDoc(doc(colPessoas(uid), pessoa.id), {
    lembretes: increment(1),
    ultimoLembreteEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  })
}

export async function excluirPessoa(uid, id) {
  if (modoDemo) return demo.excluir('pessoas', id)
  await deleteDoc(doc(colPessoas(uid), id))
}

// ── Planos ───────────────────────────────────────────────────────────────────

export async function criarPlano(uid, dados) {
  const p = validar(planoSchema, dados)
  if (modoDemo) return demo.criarPlano(p)
  const agora = serverTimestamp()
  const ref = await addDoc(colPlanos(uid), { ...p, criadoEm: agora, atualizadoEm: agora })
  return ref.id
}

export async function atualizarPlano(uid, id, dados) {
  const p = validar(planoSchema, dados)
  if (modoDemo) return demo.atualizarPlano(id, p)
  await updateDoc(doc(colPlanos(uid), id), { ...p, atualizadoEm: serverTimestamp() })
}

export async function excluirPlano(uid, id) {
  if (modoDemo) return demo.excluir('planos', id)
  await deleteDoc(doc(colPlanos(uid), id))
}

/** Mensagens de erro do Firebase em português claro. */
export function mensagemErro(e) {
  if (e?.code === 'validacao') return e.message
  const mapa = {
    'permission-denied': 'O servidor recusou a gravação. Confira os dados e se sua sessão ainda está ativa.',
    unavailable: 'Sem conexão com o servidor. Verifique a internet e tente de novo.',
    'unauthenticated': 'Sua sessão expirou. Entre de novo.',
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/user-not-found': 'E-mail ou senha incorretos.',
    'auth/wrong-password': 'E-mail ou senha incorretos.',
    'auth/email-already-in-use': 'Este e-mail já tem conta. Use "Entrar".',
    'auth/too-many-requests': 'Muitas tentativas. Espere alguns minutos e tente de novo.',
    'auth/popup-closed-by-user': 'A janela do Google foi fechada antes de terminar.',
    'auth/network-request-failed': 'Sem conexão. Verifique a internet.',
    'auth/admin-restricted-operation': 'Novas contas estão bloqueadas neste sistema. Peça acesso ao administrador.',
    'auth/operation-not-allowed': 'Este tipo de login não está ativado no Firebase.',
  }
  return mapa[e?.code] || e?.message || 'Algo deu errado. Tente de novo.'
}
