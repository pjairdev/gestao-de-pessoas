// Testes das regras de segurança do Firestore.
// Rode com:  npm run test:regras   (precisa do firebase-tools e Java instalados)

import { readFileSync } from 'node:fs'
import { after, before, beforeEach, describe, it } from 'node:test'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  doc,
  getDoc,
  increment,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'

let env

const PESSOA = {
  nomeCompleto: 'Ana Paula Ribeiro',
  dataNascimento: '1995-04-10',
  whatsapp: '5575999998888',
  status: 'comunicada',
  planoId: null,
  observacoes: '',
  lembretes: 0,
  ultimoLembreteEm: null,
}

const PLANO = { nome: 'Completo', valor: 149.9, periodicidade: 'mensal', descricao: '', ativo: true }

const agora = () => ({ criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp() })

function db(uid, verificado = true) {
  return env.authenticatedContext(uid, { email: `${uid}@teste.com`, email_verified: verificado }).firestore()
}

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'inscritos-teste',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
})

after(async () => env?.cleanup())
beforeEach(async () => env.clearFirestore())

async function semear() {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const f = ctx.firestore()
    await setDoc(doc(f, 'usuarios/ana/planos/p1'), { ...PLANO, criadoEm: Timestamp.now(), atualizadoEm: Timestamp.now() })
    await setDoc(doc(f, 'usuarios/ana/pessoas/x1'), {
      ...PESSOA,
      criadoEm: Timestamp.fromMillis(Date.now() - 5 * 86400000),
      atualizadoEm: Timestamp.fromMillis(Date.now() - 5 * 86400000),
      statusAlteradoEm: Timestamp.fromMillis(Date.now() - 5 * 86400000),
    })
  })
}

describe('acesso', () => {
  it('visitante sem login não lê nada', async () => {
    await semear()
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'usuarios/ana/pessoas/x1')))
  })
  it('outra conta não lê os dados da Ana', async () => {
    await semear()
    await assertFails(getDoc(doc(db('bruno'), 'usuarios/ana/pessoas/x1')))
  })
  it('e-mail não verificado é bloqueado', async () => {
    await semear()
    await assertFails(getDoc(doc(db('ana', false), 'usuarios/ana/pessoas/x1')))
  })
  it('dona lê os próprios dados', async () => {
    await semear()
    await assertSucceeds(getDoc(doc(db('ana'), 'usuarios/ana/pessoas/x1')))
  })
})

describe('cadastro de pessoa', () => {
  const nova = (extra = {}) => ({ ...PESSOA, ...agora(), statusAlteradoEm: serverTimestamp(), ...extra })

  it('aceita cadastro válido', async () => {
    await assertSucceeds(setDoc(doc(db('ana'), 'usuarios/ana/pessoas/n1'), nova()))
  })
  it('recusa campo extra', async () => {
    await assertFails(setDoc(doc(db('ana'), 'usuarios/ana/pessoas/n1'), nova({ admin: true })))
  })
  it('recusa HTML no nome', async () => {
    await assertFails(setDoc(doc(db('ana'), 'usuarios/ana/pessoas/n1'), nova({ nomeCompleto: 'Ana <b>Paula</b>' })))
  })
  it('recusa HTML nas observações com quebra de linha', async () => {
    await assertFails(setDoc(doc(db('ana'), 'usuarios/ana/pessoas/n1'), nova({ observacoes: 'linha 1\n<script>' })))
  })
  it('aceita só o primeiro nome, sem data e sem WhatsApp', async () => {
    await assertSucceeds(setDoc(doc(db('ana'), 'usuarios/ana/pessoas/n1'), nova({ nomeCompleto: 'Ana', dataNascimento: '', whatsapp: '' })))
  })
  it('aceita WhatsApp de qualquer DDD e telefone fixo', async () => {
    await assertSucceeds(setDoc(doc(db('ana'), 'usuarios/ana/pessoas/n1'), nova({ whatsapp: '5511912345678' })))
    await assertSucceeds(setDoc(doc(db('ana'), 'usuarios/ana/pessoas/n2'), nova({ whatsapp: '557133334444' })))
  })
  it('recusa nome de uma letra', async () => {
    await assertFails(setDoc(doc(db('ana'), 'usuarios/ana/pessoas/n1'), nova({ nomeCompleto: 'A' })))
  })
  it('recusa WhatsApp fora do padrão', async () => {
    await assertFails(setDoc(doc(db('ana'), 'usuarios/ana/pessoas/n1'), nova({ whatsapp: '7599998888' })))
  })
  it('recusa data de status forjada', async () => {
    await assertFails(setDoc(doc(db('ana'), 'usuarios/ana/pessoas/n1'),
      nova({ statusAlteradoEm: Timestamp.fromMillis(Date.now() - 30 * 86400000) })))
  })
  it('interessada exige plano existente', async () => {
    await assertFails(setDoc(doc(db('ana'), 'usuarios/ana/pessoas/n1'), nova({ status: 'interessada', planoId: 'nao-existe' })))
    await semear()
    await assertSucceeds(setDoc(doc(db('ana'), 'usuarios/ana/pessoas/n2'), nova({ status: 'interessada', planoId: 'p1' })))
  })
  it('não grava na pasta de outra conta', async () => {
    await assertFails(setDoc(doc(db('bruno'), 'usuarios/ana/pessoas/n1'), nova()))
  })
})

describe('lembretes e status', () => {
  it('registra lembrete subindo de 1 em 1', async () => {
    await semear()
    await assertSucceeds(updateDoc(doc(db('ana'), 'usuarios/ana/pessoas/x1'), {
      lembretes: increment(1), ultimoLembreteEm: serverTimestamp(), atualizadoEm: serverTimestamp(),
    }))
  })
  it('recusa pular o contador de lembretes', async () => {
    await semear()
    await assertFails(updateDoc(doc(db('ana'), 'usuarios/ana/pessoas/x1'), {
      lembretes: 5, ultimoLembreteEm: serverTimestamp(), atualizadoEm: serverTimestamp(),
    }))
  })
  it('recusa zerar os dias sem trocar de status', async () => {
    await semear()
    await assertFails(updateDoc(doc(db('ana'), 'usuarios/ana/pessoas/x1'), {
      statusAlteradoEm: serverTimestamp(), atualizadoEm: serverTimestamp(),
    }))
  })
  it('trocar de status reinicia relógio e lembretes', async () => {
    await semear()
    await assertSucceeds(updateDoc(doc(db('ana'), 'usuarios/ana/pessoas/x1'), {
      status: 'sem_interesse', statusAlteradoEm: serverTimestamp(), lembretes: 0, ultimoLembreteEm: null, atualizadoEm: serverTimestamp(),
    }))
  })
})

describe('planos', () => {
  it('aceita plano válido', async () => {
    await assertSucceeds(setDoc(doc(db('ana'), 'usuarios/ana/planos/n1'), { ...PLANO, ...agora() }))
  })
  it('recusa valor negativo', async () => {
    await assertFails(setDoc(doc(db('ana'), 'usuarios/ana/planos/n1'), { ...PLANO, valor: -1, ...agora() }))
  })
  it('recusa periodicidade desconhecida', async () => {
    await assertFails(setDoc(doc(db('ana'), 'usuarios/ana/planos/n1'), { ...PLANO, periodicidade: 'semanal', ...agora() }))
  })
})
