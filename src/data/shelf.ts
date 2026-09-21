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
    creator: '萨拉·多萨',
    cover: '/shelf/fire-of-love-2.jpg',
    note: 'Understaning is just love\'s other name',
  },
  {
    id: 'music-harudorobou-live',
    category: 'music',
    title: '春泥棒（Live 2024「前世」）',
    creator: 'ヨルシカ · UP 主 清秋_Seisyuu',
    cover: '/shelf/harudorobou.jpg',
    videoUrl: 'https://www.bilibili.com/video/BV16k8bzGE31',
  },
  {
    id: 'music-soyeon-quit',
    category: 'music',
    title: '我要辞职了（首打歌舞台）',
    creator: '田小娟（(G)I-DLE）· UP 主 pcyxjy',
    cover: '/shelf/soyen-quit.jpg',
    videoUrl: 'https://www.bilibili.com/video/BV1EqYu6yEBS',
  },
  {
    id: 'music-muzai',
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
    musicUrl: 'https://open.spotify.com/album/6gApmv7Klo2uuyTxWkPzXb',
    note: '云层深处的黑暗啊 淹没心底的景观',
  },
  {
    id: 'movie-kaze',
    category: 'movie',
    title: '强风吹拂',
    creator: '三浦紫苑 · Production I.G',
    cover: '/shelf/kaze.jpg',
    note: '箱根の山は天下の険',
  },
  {
    id: 'book-woyuditan',
    category: 'book',
    title: '我与地坛',
    creator: '史铁生',
    cover: '/shelf/woyuditan.jpg',
    note: '死是一件不必急于求成的事，死是一个终将会到来的节日',
  },
  {
    id: 'music-gamble-live',
    category: 'music',
    title: '赌局 Gamble（2008 现场）',
    creator: '椎名林檎 · UP 主 胡谍ix',
    videoUrl: 'https://www.bilibili.com/video/BV1aq4y1Z7aE',
    cover: '/shelf/gamble.jpg',
  },
  {
    id: 'music-taozhe-hongloumeng',
    category: 'music',
    title: '讨厌红楼梦（Soul Power 2003 现场）',
    creator: '陶喆 · UP 主 The3heep',
    videoUrl: 'https://www.bilibili.com/video/BV1Bt4y1Y71r',
    cover: '/shelf/taozhe-hongloumeng.jpg',
  },
  {
    id: 'music-marunouchi-live',
    category: 'music',
    title: '丸ノ内サディスティック',
    creator: '椎名林檎 · 東京事変 · UP 主 龙舌兰煮面包_Agave',
    videoUrl: 'https://www.bilibili.com/video/BV1RztaeCE5H',
    cover: '/shelf/marunouchi.jpg',
  },
  {
    id: 'music-usotsuki-live',
    category: 'music',
    title: '嘘月（Live 2024「前世」）',
    creator: 'ヨルシカ · UP 主 清秋_Seisyuu',
    videoUrl: 'https://www.bilibili.com/video/BV1oiK6zrEsK',
    cover: '/shelf/usotsuki.jpg',
  },
  {
    id: 'music-gidle-fate',
    category: 'music',
    title: 'Fate（LIVE CLIP）',
    creator: '(G)I-DLE · 官方',
    videoUrl: 'https://www.bilibili.com/video/BV1Zx421k7AZ',
    cover: '/shelf/gidle-fate.jpg',
  },
  {
    id: 'music-hitsuji-golden',
    category: 'music',
    title: '金色（Fuji Rock Festival 2023）',
    creator: '羊文学 · UP 主 炒饭的蜘蛛侠',
    videoUrl: 'https://www.bilibili.com/video/BV1Yx4y1B7om',
    cover: '/shelf/hitsuji-golden.jpg',
  },
  {
    id: 'music-hitsuji-1999',
    category: 'music',
    title: '1999（官方 MV）',
    creator: '羊文学',
    videoUrl: 'https://www.bilibili.com/video/BV1kk4y1E7LW',
    cover: '/shelf/hitsuji-1999.jpg',
  },
]
