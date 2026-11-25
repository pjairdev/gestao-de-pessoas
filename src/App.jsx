import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import { Layout } from './components/Layout'
import { ConfirmarEmail, Entrar } from './pages/Entrar'
import { Painel } from './pages/Painel'
import { Pessoas } from './pages/Pessoas'
import { Planos } from './pages/Planos'

function Carregando() {
  return (
    <div className="grid min-h-dvh place-items-center" aria-busy="true">
      <img src="/icone.svg" alt="Carregando" className="size-12 animate-pulse" />
    </div>
  )
}

export default function App() {
  const { usuario, carregando, precisaVerificar } = useAuth()
  if (carregando) return <Carregando />
  if (!usuario) {
    return (
      <Routes>
        <Route path="*" element={<Entrar />} />
      </Routes>
    )
  }
  if (precisaVerificar) return <ConfirmarEmail />
  return (
    <DataProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Painel />} />
          <Route path="pessoas" element={<Pessoas />} />
          <Route path="planos" element={<Planos />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </DataProvider>
  )
}
