import { Routes, Route } from 'react-router'
import BlogHome from './pages/BlogHome'
import PostPage from './pages/PostPage'
import Home from './pages/Home'
import ShelfPage from './pages/ShelfPage'
import BlogPage from './pages/BlogPage'
import TechPage from './pages/TechPage'
import TechPostPage from './pages/TechPostPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<BlogHome />} />
      <Route path="/shelf" element={<ShelfPage />} />
      <Route path="/blog" element={<BlogPage />} />
      <Route path="/tech" element={<TechPage />} />
      <Route path="/tech/:slug" element={<TechPostPage />} />
      <Route path="/post/:slug" element={<PostPage />} />
      <Route path="/hotspot" element={<Home />} />
    </Routes>
  )
}
