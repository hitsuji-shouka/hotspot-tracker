import { Routes, Route } from 'react-router'
import BlogHome from './pages/BlogHome'
import PostPage from './pages/PostPage'
import Home from './pages/Home'
import ShelfPage from './pages/ShelfPage'
import BlogPage from './pages/BlogPage'
import StudyPage from './pages/StudyPage'
import StudyPostPage from './pages/StudyPostPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<BlogHome />} />
      <Route path="/shelf" element={<ShelfPage />} />
      <Route path="/blog" element={<BlogPage />} />
      <Route path="/study" element={<StudyPage />} />
      <Route path="/study/:slug" element={<StudyPostPage />} />
      <Route path="/post/:slug" element={<PostPage />} />
      <Route path="/hotspot" element={<Home />} />
    </Routes>
  )
}
