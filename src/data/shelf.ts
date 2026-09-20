// 书架数据：想加作品就改这里。
// 封面图放到 public/shelf/ 目录（比如 public/shelf/qianshuiting.jpg），cover 写 '/shelf/qianshuiting.jpg'；
// 不填 cover 会自动生成一个渐变占位封面，也很好看。

export type ShelfCategory = 'movie' | 'book' | 'music'
export type ShelfFilter = ShelfCategory | 'all'

export interface ShelfItem {
  id: string
  category: ShelfCategory
  title: string
  creator: string
  cover?: string
  note?: string
  rating?: number // 1-5
}

export const CATEGORY_META: Record<ShelfFilter, { label: string; emoji: string }> = {
  all: { label: '全部', emoji: '✨' },
  movie: { label: '影视', emoji: '🎬' },
  book: { label: '书籍', emoji: '📖' },
  music: { label: '音乐', emoji: '🎵' },
}

export const SHELF: ShelfItem[] = [
  {
    id: 'book-qianshuiting',
    category: 'book',
    title: '夜晚的潜水艇',
    creator: '陈春成',
    cover: '/shelf/qianshuiting.jpg',
  },
  {
    id: 'movie-interstellar',
    category: 'movie',
    title: '星际穿越',
    creator: '克里斯托弗·诺兰',
    cover: '/shelf/interstellar.jpg',
  },
  {
    id: 'music-wanqing',
    category: 'music',
    title: '万能青年旅店',
    creator: '万能青年旅店',
    cover: '/shelf/wanqing.jpg',
  },
]
