export function clampPosition(value: number, count: number) {
  return Math.max(0, Math.min(Math.max(0, count - 1), value))
}

export function carouselLayout(viewport: number) {
  const mobile = viewport < 640
  const width = mobile ? Math.max(208, Math.min(320, viewport - 96)) : Math.max(270, Math.min(320, viewport * 0.175))
  return { width, gap: mobile ? 16 : 34, step: mobile ? 0.04 : 0.115 }
}

// All bottom midpoints share a circle; the card's bottom edge is its tangent.
// Animate offset, not x/y independently, so this remains true between stops.
export function arcPosition(offset: number, width: number, gap: number, step: number) {
  const radius = (width + gap) / Math.sin(step)
  const angle = offset * step
  return { x: radius * Math.sin(angle), y: radius * (1 - Math.cos(angle)), rotation: angle * 180 / Math.PI, radius }
}

export function swipeDestination(start: number, current: number, distance: number, count: number) {
  const next = Math.abs(distance) >= 40 && Math.abs(current - start) < 0.5
    ? Math.round(start) - Math.sign(distance)
    : Math.round(current)
  return clampPosition(next, count)
}
