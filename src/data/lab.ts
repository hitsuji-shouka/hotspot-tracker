export const LAB_CATEGORIES = [
  { id: 'all', label: '全部' },
  { id: 'develop', label: '研发' },
  { id: 'create', label: '创作' },
  { id: 'play', label: '游戏' },
  { id: 'learn', label: '学习' },
] as const

export type LabCategory = typeof LAB_CATEGORIES[number]['id']
export type Experiment = {
  id: string
  title: string
  description: string
  category: Exclude<LabCategory, 'all'>
  cover: 'room' | 'garden' | 'collage' | 'network' | 'sound' | 'central-perk'
  status: 'preparing' | 'concept' | 'ready'
  path?: string
}

export const EXPERIMENTS: Experiment[] = [{
  id: 'sheep-room', title: '羊的小屋',
  description: '看 AI 逛家具店，把喜欢的家具布置成家。',
  category: 'create', cover: 'room', status: 'preparing', path: '/lab/sheep-room',
}, {
  id: 'central-perk', title: 'Central Perk', description: 'AND I JUST WANT A MILLION DOLLARS',
  category: 'create', cover: 'central-perk', status: 'ready', path: '/lab/central-perk',
}]

// These are design fixtures, not published experiments. Only used by the dev preview.
export const CONCEPTS: Experiment[] = [
  { id: 'pixel-garden', title: '像素花园', description: '种下一点好奇，看看会发生什么。', category: 'play', cover: 'garden', status: 'concept' },
  { id: 'moodboard', title: '灵感拼贴', description: '把零散的灵感，拼成新的作品。', category: 'create', cover: 'collage', status: 'concept' },
  { id: 'algorithm', title: '算法漫游', description: '看见算法如何一步步工作。', category: 'develop', cover: 'network', status: 'concept' },
  { id: 'sound-canvas', title: '声音画布', description: '把声音变成可以看见的色彩。', category: 'create', cover: 'sound', status: 'concept' },
]

export function selectCategory(value: string | null): LabCategory {
  return LAB_CATEGORIES.find(category => category.id === value)?.id ?? 'all'
}

export function filterExperiments(items: Experiment[], category: LabCategory) {
  return category === 'all' ? items : items.filter(item => item.category === category)
}
