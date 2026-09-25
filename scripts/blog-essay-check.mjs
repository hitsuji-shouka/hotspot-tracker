import assert from 'node:assert/strict'
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
try {
  const { parseFrontmatter, posts } = await server.ssrLoadModule('/src/lib/posts.ts')
  const { meta, body } = parseFrontmatter(`---
title: 一篇长文
date: 2026-09-25
updated: 2026-09-26
tags: [写作, 设计]
summary: 导语
layout: essay
audience: 想阅读长文的人。
---
第一段正文。`)
  assert.equal(meta.layout, 'essay')
  assert.equal(meta.updated, '2026-09-26')
  assert.equal(meta.audience, '想阅读长文的人。')
  assert.deepEqual(meta.tags, ['写作', '设计'])
  assert.equal(body, '第一段正文。')
  assert.ok(posts.length > 0)
  console.log('Blog essay frontmatter passed.')
} finally { await server.close() }
