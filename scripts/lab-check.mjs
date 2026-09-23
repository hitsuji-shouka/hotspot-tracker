import assert from 'node:assert/strict'
import { arcPosition, carouselLayout, clampPosition, swipeDestination } from '../src/lib/lab-motion.ts'
import { EXPERIMENTS, CONCEPTS, filterExperiments, selectCategory } from '../src/data/lab.ts'

for (const viewport of [320, 390, 768, 1440, 1920]) {
  const { width, gap, step } = carouselLayout(viewport)
  for (let offset = -3; offset <= 3; offset += 0.05) {
    const p = arcPosition(offset, width, gap, step)
    assert.ok(Math.abs(p.x ** 2 + (p.y - p.radius) ** 2 - p.radius ** 2) < 1e-6, 'Every animation frame stays on the circle')
    assert.ok(Math.abs(p.rotation * Math.PI / 180 - offset * step) < 1e-9, 'Card bottom is tangent to circle')
  }
  const left = arcPosition(-1, width, gap, step)
  const right = arcPosition(1, width, gap, step)
  assert.equal(left.x, -right.x)
  assert.equal(left.y, right.y)
  assert.ok(right.x - width >= 15.9, 'Neighboring bottom midpoints leave a clear gap')
}
assert.equal(clampPosition(-10, 5), 0)
assert.equal(clampPosition(10, 5), 4)
assert.equal(clampPosition(2, 0), 0)
assert.equal(swipeDestination(2, 2.2, -60, 5), 3)
assert.equal(swipeDestination(2, 1.8, 60, 5), 1)
assert.equal(swipeDestination(2, 2.05, -10, 5), 2)
assert.equal(swipeDestination(0, 0, 80, 5), 0)
assert.equal(swipeDestination(4, 4, -80, 5), 4)
assert.equal(selectCategory('invalid'), 'all')
assert.equal(selectCategory(null), 'all')
assert.equal(selectCategory('develop'), 'develop')
assert.equal(filterExperiments(EXPERIMENTS, 'all').length, 1)
assert.equal(filterExperiments(EXPERIMENTS, 'develop').length, 0)
assert.equal(filterExperiments([...EXPERIMENTS, ...CONCEPTS], 'learn').length, 0)
assert.ok(EXPERIMENTS.every(item => item.status !== 'concept'), 'No design fixtures in published catalogue')
console.log('Lab checks passed: arc geometry, symmetry, swipe boundaries, categories, published catalogue.')
