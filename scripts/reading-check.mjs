// Run with Node 24+: node scripts/reading-check.mjs
import assert from 'node:assert/strict'
import { articleUrl, articleIdentity, articleSource, INITIAL_READING, isReadingList, previewImage, restoreArticle } from '../src/lib/reading.ts'

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
const readded = { ...deleted, id: 'readded', url: `${deleted.url}?s=46`, note: '重新收藏后的笔记' }
assert.deepEqual(restoreArticle([readded], deleted), [readded])
assert.deepEqual(restoreArticle([], deleted), [deleted])
console.log('Reading checks passed: share parsing, safe URLs, duplicate identity, platform detection and stored data validation.')
