// Run with Node 24+: node scripts/reading-check.mjs
import assert from 'node:assert/strict'
import { articleUrl, articleIdentity, articleSource, articleTagLabel, articleTags, articleTopics, normalizeArticles, INITIAL_READING, READING_TOPICS, isReadingList, previewImage, renameArticleTag, restoreArticle } from '../src/lib/reading.ts'

assert.equal(articleUrl('AI 写完的代码 https://xhslink.cn/o/1Imk7wI8ik6 复制一下，打开小红书。'), 'https://xhslink.cn/o/1Imk7wI8ik6')
assert.equal(articleUrl('[文章](https://example.com/a(b))'), 'https://example.com/a(b)')
assert.equal(articleUrl('https://example.com/article。'), 'https://example.com/article')
for (const bad of ['javascript:alert(1)', 'data:text/html,hello', 'ftp://example.com/a', 'https://user:secret@example.com', '不是链接']) assert.throws(() => articleUrl(bad))
assert.equal(articleIdentity('https://x.com/a/status/1?s=46&utm_source=share'), articleIdentity('http://www.x.com/a/status/1'))
assert.notEqual(articleIdentity('https://example.com/?s=one'), articleIdentity('https://example.com/?s=two'))
assert.match(articleIdentity('https://www.xiaohongshu.com/explore/note?xsec_token=keep'), /xsec_token=keep/)
assert.equal(articleSource('https://zhihu.com.evil.example/a'), 'zhihu.com.evil.example')
assert.equal(previewImage('javascript:alert(1)'), null)
assert.equal(previewImage('https://user:secret@example.com/a.jpg'), null)
assert.ok(isReadingList(INITIAL_READING))
assert.ok(isReadingList([]))
assert.ok(!isReadingList({}))
assert.ok(!isReadingList([{ ...INITIAL_READING[0], url: 'javascript:alert(1)' }]))
assert.ok(!isReadingList([{ ...INITIAL_READING[0], tags: [123] }]))
const deleted = INITIAL_READING[0]
const readded = { ...deleted, id: 'readded', url: `${deleted.url}?s=46`, tags: ['记忆机制', 'Runtime'] }
assert.deepEqual(restoreArticle([readded], deleted), [readded])
assert.deepEqual(restoreArticle([], deleted), [deleted])
console.log('Reading checks passed: share parsing, safe URLs, duplicate identity, platform detection and stored data validation.')

const legacy = [{ ...deleted, tags: ['Agent', '大模型'], read: true, note: '旧数据' }]
assert.ok(isReadingList(legacy))
assert.deepEqual(normalizeArticles(legacy)[0].tags, ['记忆机制'])
assert.deepEqual(normalizeArticles([{ ...deleted, tags: ['Agent', '大模型'] }])[0].tags, ['Agent', '大模型'])
assert.deepEqual(normalizeArticles([readded]), [readded])
const custom = { ...deleted, tags: ['Agent', '自定义主题'] }
assert.deepEqual(normalizeArticles([custom]), [custom])
assert.deepEqual(articleTags(' Runtime、runtime，缓存, 缓存\n消息队列 ,, '), ['Runtime', '缓存', '消息队列'])
assert.deepEqual(articleTags(' ,、 '), [])
assert.deepEqual(articleTags('评测、Agent评测、代码质量、AI 编程'), ['Agent评测', 'AI 编程'])
assert.deepEqual(normalizeArticles([{ ...deleted, tags: ['评测', '代码质量', 'AI 编程'] }])[0].tags, ['Agent评测', 'AI 编程'])
assert.deepEqual(articleTopics([{ ...deleted, tags: ['缓存', '缓存', 'Runtime'] }, { ...readded, tags: ['缓存'] }]), [{ tag: '缓存', count: 2 }, { tag: 'Runtime', count: 1 }])
assert.deepEqual(articleTopics([{ ...deleted, tags: [] }]), [])
assert.deepEqual(articleTopics([{ ...deleted, tags: ['Runtime', 'runtime'] }, { ...readded, tags: ['runtime'] }]), [{ tag: 'Runtime', count: 2 }])
for (const tag of READING_TOPICS) assert.notEqual(articleTagLabel(tag), tag)
assert.equal(articleTagLabel('runtime'), '⚙️ runtime')
assert.equal(articleTagLabel('🔒 安全'), '🔒 安全')
assert.equal(articleTagLabel('🧠 记忆机制'), '🧠 记忆机制')
assert.deepEqual(articleTags('🔒 安全、🔒 安全、🧰 工具链'), ['🔒 安全', '🧰 工具链'])
console.log('Article favorites checks passed: legacy data, custom tags, deduplication and topic frequency.')

const tagged = [{ ...deleted, tags: ['Runtime', '缓存'] }, { ...readded, tags: ['runtime'] }, { ...custom, tags: [] }]
const renamed = renameArticleTag(tagged, 'Runtime', '⚙️ 执行环境')
assert.deepEqual(renamed.map(a => a.tags), [['⚙️ 执行环境', '缓存'], ['⚙️ 执行环境'], []])
assert.deepEqual(renameArticleTag(tagged, 'Runtime', '缓存').map(a => a.tags), [['缓存'], ['缓存'], []])
assert.deepEqual(renameArticleTag(tagged, 'runtime', 'RUNTIME').map(a => a.tags), [['RUNTIME', '缓存'], ['RUNTIME'], []])
assert.deepEqual(renamed.map(({ tags, ...article }) => article), tagged.map(({ tags, ...article }) => article))
assert.deepEqual(tagged[0].tags, ['Runtime', '缓存'])
for (const invalid of ['', ' ', '缓存、数据库', '缓存,缓存']) assert.throws(() => renameArticleTag(tagged, 'Runtime', invalid))
console.log('Tag editing checks passed: bulk rename, icons, merge, case-insensitive matching, input validation and unchanged article content.')
