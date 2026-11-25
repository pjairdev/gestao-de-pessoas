import * as Dialog from '@radix-ui/react-dialog'
import { AnimatePresence, motion, useDragControls } from 'motion/react'
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'

const mola = { type: 'spring', stiffness: 420, damping: 38, mass: 0.9 }

export function useTelaGrande() {
  const consulta = '(min-width: 768px)'
  const [grande, setGrande] = useState(() => typeof window !== 'undefined' && window.matchMedia(consulta).matches)
  useEffect(() => {
    const m = window.matchMedia(consulta)
    const fn = () => setGrande(m.matches)
    m.addEventListener('change', fn)
    return () => m.removeEventListener('change', fn)
  }, [])
  return grande
}

function Fundo() {
  return (
    <Dialog.Overlay asChild forceMount>
      <motion.div
        className="fixed inset-0 z-40 bg-tinta/35 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
      />
    </Dialog.Overlay>
  )
}

/** Painel lateral (desktop) que vira gaveta de baixo para cima no celular. */
export function Gaveta({ aberta, aoFechar, titulo, descricao, children, rodape }) {
  const grande = useTelaGrande()
  const arraste = useDragControls()
  const anim = grande
    ? { initial: { x: '100%' }, animate: { x: 0 }, exit: { x: '100%' } }
    : { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } }

  return (
    <Dialog.Root open={aberta} onOpenChange={(v) => !v && aoFechar()}>
      <AnimatePresence>
        {aberta && (
          <Dialog.Portal forceMount>
            <Fundo />
            <Dialog.Content asChild forceMount>
              <motion.div
                {...anim}
                transition={mola}
                drag={grande ? false : 'y'}
                dragControls={arraste}
                dragListener={false}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.6 }}
                onDragEnd={(_, info) => { if (info.offset.y > 120 || info.velocity.y > 600) aoFechar() }}
                className={
                  grande
                    ? 'fixed inset-y-0 right-0 z-50 flex w-full max-w-[480px] flex-col bg-papel shadow-[-24px_0_60px_-30px_rgba(27,36,51,.45)]'
                    : 'fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-[22px] bg-papel pb-[env(safe-area-inset-bottom)] shadow-[0_-20px_50px_-20px_rgba(27,36,51,.5)]'
                }
              >
                {!grande && (
                  <div className="flex shrink-0 cursor-grab touch-none justify-center pt-2.5" onPointerDown={(e) => arraste.start(e)} aria-hidden>
                    <div className="h-1.5 w-11 rounded-full bg-tinta/15" />
                  </div>
                )}
                <header
                  className="flex items-start justify-between gap-4 px-6 pb-4 pt-5 md:pt-7"
                  onPointerDown={(e) => { if (!grande && e.target === e.currentTarget) arraste.start(e) }}
                >
                  <div>
                    <Dialog.Title className="font-display text-2xl font-semibold">{titulo}</Dialog.Title>
                    {descricao ? (
                      <Dialog.Description className="mt-1 text-sm text-tinta-2">{descricao}</Dialog.Description>
                    ) : (
                      <Dialog.Description className="sr-only">{titulo}</Dialog.Description>
                    )}
                  </div>
                  <Dialog.Close className="btn-fantasma -mr-2 -mt-1 p-2" aria-label="Fechar">
                    <X size={20} />
                  </Dialog.Close>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6">{children}</div>
                {rodape && (
                  <footer className="flex items-center gap-2 border-t border-linha bg-papel/90 px-6 py-4 backdrop-blur">
                    {rodape}
                  </footer>
                )}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}

/** Janela central, para confirmações e envio de lembrete. */
export function Janela({ aberta, aoFechar, titulo, descricao, children, largura = 'max-w-md' }) {
  return (
    <Dialog.Root open={aberta} onOpenChange={(v) => !v && aoFechar()}>
      <AnimatePresence>
        {aberta && (
          <Dialog.Portal forceMount>
            <Fundo />
            <div className="fixed inset-0 z-50 grid place-items-end p-3 sm:place-items-center sm:p-6">
              <Dialog.Content asChild forceMount>
                <motion.div
                  initial={{ opacity: 0, y: 24, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.98 }}
                  transition={mola}
                  className={`w-full ${largura} rounded-2xl bg-papel p-6 shadow-[0_30px_80px_-30px_rgba(27,36,51,.6)]`}
                >
                  <Dialog.Title className="font-display text-xl font-semibold">{titulo}</Dialog.Title>
                  {descricao ? (
                    <Dialog.Description className="mt-1.5 text-[15px] text-tinta-2">{descricao}</Dialog.Description>
                  ) : (
                    <Dialog.Description className="sr-only">{titulo}</Dialog.Description>
                  )}
                  <div className="mt-5">{children}</div>
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}

export function Confirmar({ aberta, aoFechar, titulo, descricao, rotulo = 'Excluir', aoConfirmar, ocupado }) {
  return (
    <Janela aberta={aberta} aoFechar={aoFechar} titulo={titulo} descricao={descricao}>
      <div className="flex justify-end gap-2">
        <button className="btn-fantasma" onClick={aoFechar}>Cancelar</button>
        <button className="btn bg-brasa text-white hover:brightness-110" onClick={aoConfirmar} disabled={ocupado}>
          {rotulo}
        </button>
      </div>
    </Janela>
  )
}
