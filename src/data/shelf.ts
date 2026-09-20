// 书架数据：想加作品就改这里。
// 封面图放到 public/shelf/ 目录（比如 public/shelf/qianshuiting.jpg），cover 写 '/shelf/qianshuiting.jpg'；
// 不填 cover 会自动生成一个渐变占位封面，也很好看。
//
// 视频：任何分类（影视 / 书籍 / 音乐）的作品都可以配 videoUrl，配上后卡片会带「▶ 视频」标签，
// 点击卡片在当前页弹窗播放——
//   · 直链视频（mp4/webm 等）：不填 cover 时会自动截取首帧当封面；
//   · B 站视频（https://www.bilibili.com/video/BV...）：内嵌 B 站播放器播放，
//     封面建议手动放一张图到 public/shelf/ 并配置 cover（B 站封面有跨域限制，无法自动抓）。
// 示例：
//   {
//     id: 'movie-xxx',
//     category: 'movie',
//     title: '某个很喜欢的视频',
//     creator: 'UP 主名字',
//     videoUrl: 'https://www.bilibili.com/video/BV1xx411c7mD',
//     cover: '/shelf/xxx.jpg',
//     note: '为什么喜欢它',
//     rating: 5,
//   },

export type ShelfCategory = 'movie' | 'book' | 'music'
export type ShelfFilter = ShelfCategory | 'all'

export interface ShelfItem {
  id: string
  category: ShelfCategory
  title: string
  creator: string
  cover?: string
  videoUrl?: string // 配上即为「视频」作品，卡片出现播放标签
  musicUrl?: string // Spotify 链接（track/album/playlist 均可）或网易云歌曲链接，配上后卡片出现「♪ 试听」标签，页面内播放
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
    note: '有时我甚至觉得我们星球上所发生的一切，其实只是另一个人对着尘埃的幻想罢了',
  },
  {
    id: 'movie-interstellar',
    category: 'movie',
    title: '星际穿越',
    creator: '克里斯托弗·诺兰',
    cover: '/shelf/interstellar.jpg',
    note: '爱是一种力量，让我们超越时空感知它的存在',
  },
  {
    id: 'movie-fire-of-love',
    category: 'movie',
    title: '【𝙁𝙞𝙧𝙚 𝙤𝙛 𝙇𝙤𝙫𝙚】火山挚恋',
    creator: 'SadAndBlue',
    cover: '/shelf/fire-of-love.jpg',
    videoUrl: 'https://www.bilibili.com/video/BV1Fr421A74L',
    note: 'UP 主剪辑版——两个把生命献给火山的人，和他们彼此的爱',
  },
  {
    id: 'music-maruzen',
    category: 'music',
    title: '無罪モラトリアム',
    creator: '椎名林檎',
    cover: '/shelf/benji.jpg',
    musicUrl: 'https://open.spotify.com/album/2GPMPtwaSjGKvQ5zZui7s2',
    note: 'そしたらベンジーが肺に映ってトリップ',
  },
  {
    id: 'music-wanqing',
    category: 'music',
    title: '万能青年旅店',
    creator: '万能青年旅店',
    cover: '/shelf/wanqing.jpg',
    note: '云层深处的黑暗啊 淹没心底的景观',
  },
]
