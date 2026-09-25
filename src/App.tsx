import { Routes, Route, Navigate, useParams } from 'react-router'
import BlogHome from './pages/BlogHome'
import PostPage from './pages/PostPage'
import Home from './pages/Home'
import ShelfPage from './pages/ShelfPage'
import BlogPage from './pages/BlogPage'
import LabPage from './pages/LabPage'
import SheepRoomPage from './pages/SheepRoomPage'
import { AdminSession } from './components/AdminControl'
import { lazy, Suspense } from 'react'
const CentralPerkPage = lazy(() => import('./pages/CentralPerkPage'))

function OldStudyLink() {
  const { slug } = useParams()
  return <Navigate to={`/post/${slug ?? ''}`} replace />
}

export default function App() {
  return (
    <><AdminSession /><Routes>
      <Route path="/" element={<BlogHome />} />
      <Route path="/shelf" element={<ShelfPage />} />
      <Route path="/reading" element={<Navigate to="/hotspot?view=fav&tab=articles" replace />} />
      <Route path="/blog" element={<BlogPage />} />
      <Route path="/study" element={<Navigate to="/blog" replace />} />
      <Route path="/lab" element={<LabPage />} />
      <Route path="/lab/sheep-room" element={<SheepRoomPage />} />
      <Route path="/lab/central-perk" element={<Suspense fallback={<div style={{ padding: 40, background: '#eee3d0', minHeight: '100vh' }}>Opening Central Perk…</div>}><CentralPerkPage /></Suspense>} />
      <Route path="/study/:slug" element={<OldStudyLink />} />
      <Route path="/post/:slug" element={<PostPage />} />
      <Route path="/hotspot" element={<Home />} />
    </Routes></>
  )
}
