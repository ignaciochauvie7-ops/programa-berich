import { Navigate, Route, Routes } from 'react-router-dom'
import { FunnelRoute } from './FunnelRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/f/entrenamiento" replace />} />
      <Route path="/f/:slug" element={<FunnelRoute />} />
    </Routes>
  )
}
