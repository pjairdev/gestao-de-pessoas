import { useEffect, useState } from 'react'
import { MessageCircle, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Janela } from './Camadas'
import { useDados } from '../context/DataContext'
import { mensagemErro, registrarLembrete } from '../lib/repo'
import { formatarWhatsapp, limparTexto } from '../lib/validation'
import { primeiroNome, textoDias } from '../lib/format'

const CHAVE = 'inscritos-modelo-lembrete'
const PADRAO =
  'Oi, {nome}! Tudo bem? Passando para saber se você ainda tem interesse no que conversamos. Se quiser, te explico os pacotes de novo e tiro qualquer dúvida. 😊'

function lerModelo() {
  try { return localStorage.getItem(CHAVE) || PADRAO } catch { return PADRAO }
}

export function montarMensagem(modelo, pessoa) {
  // Troca as variáveis primeiro (a limpeza remove chaves { }) e depois sanitiza.
  const texto = String(modelo)
    .replaceAll('{nome}', primeiroNome(pessoa.nomeCompleto))
    .replaceAll('{dias}', String(pessoa.dias ?? 0))
  return limparTexto(texto, { multilinha: true }).slice(0, 1000)
}

/** Monta o link oficial do WhatsApp (HTTPS). O texto vai codificado na URL. */
export function linkWhatsapp(numero, texto) {
  const n = String(numero).replace(/\D/g, '')
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`
}

export function Lembrete({ pessoa: atual, aoFechar }) {
  const { uid } = useDados()
  const [modelo, setModelo] = useState(lerModelo)
  // Mantém o conteúdo visível durante a animação de saída.
  const [ultima, setUltima] = useState(null)
  useEffect(() => {
    if (atual) { setUltima(atual); setModelo(lerModelo()) }
  }, [atual])
  const pessoa = atual ?? ultima
  const texto = pessoa ? montarMensagem(modelo, pessoa) : ''

  async function enviar() {
    // Abre o WhatsApp no mesmo clique (navegadores bloqueiam janelas abertas depois de await).
    window.open(linkWhatsapp(pessoa.whatsapp, texto), '_blank', 'noopener,noreferrer')
    try { localStorage.setItem(CHAVE, modelo) } catch { /* ignora */ }
    try {
      await registrarLembrete(uid, pessoa)
      toast.success(`Lembrete registrado para ${primeiroNome(pessoa.nomeCompleto)}.`)
      aoFechar()
    } catch (e) {
      toast.error(mensagemErro(e))
    }
  }

  return (
    <Janela
      aberta={!!atual}
      aoFechar={aoFechar}
      titulo="Enviar lembrete"
      descricao={pessoa ? `${pessoa.nomeCompleto}${pessoa.whatsapp ? `, ${formatarWhatsapp(pessoa.whatsapp)}` : ''}. Comunicada ${textoDias(pessoa.dias)}.` : ''}
      largura="max-w-lg"
    >
      {pessoa && (
        <div className="space-y-4">
          <div className="rounded-xl bg-[#e7ded3] p-4">
            <div className="ml-auto max-w-[88%] whitespace-pre-wrap break-words rounded-xl rounded-tr-sm bg-[#d9fdd3] px-3.5 py-2.5 text-[15px] leading-snug text-[#111b21] shadow-sm">
              {texto || <span className="opacity-50">Mensagem vazia</span>}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="modelo" className="text-sm font-semibold">Mensagem</label>
              <button
                type="button"
                className="btn-fantasma px-2 py-1 text-[13px]"
                onClick={() => setModelo(PADRAO)}
              >
                <RotateCcw size={14} /> Restaurar padrão
              </button>
            </div>
            <textarea
              id="modelo"
              rows={4}
              maxLength={1000}
              className="campo resize-none leading-snug"
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
            />
            <p className="text-[13px] text-tinta-2">
              Use <code className="rounded bg-tinta/[0.07] px-1">{'{nome}'}</code> para o primeiro nome e{' '}
              <code className="rounded bg-tinta/[0.07] px-1">{'{dias}'}</code> para os dias desde o contato. O texto fica salvo para os próximos.
            </p>
          </div>

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button className="btn-fantasma" onClick={aoFechar}>Cancelar</button>
            <button className="btn-zap" onClick={enviar} disabled={!texto || !pessoa.whatsapp}>
              <MessageCircle size={18} /> Abrir no WhatsApp
            </button>
          </div>
          {pessoa.lembretes > 0 && (
            <p className="text-center text-[13px] text-tinta-2">
              {pessoa.lembretes === 1 ? '1 lembrete já enviado' : `${pessoa.lembretes} lembretes já enviados`} desde que foi comunicada.
            </p>
          )}
        </div>
      )}
    </Janela>
  )
}
