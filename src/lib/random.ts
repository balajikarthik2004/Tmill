/**
 * Deterministic pseudo-random generator (mulberry32) so mock data is stable
 * across reloads instead of reshuffling on every render.
 */
export function mulberry32(seed: number) {
  let a = seed
  return function random() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function makeRng(seed = 42) {
  const rand = mulberry32(seed)
  return {
    next: () => rand(),
    int: (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min,
    float: (min: number, max: number, decimals = 2) => {
      const value = rand() * (max - min) + min
      const factor = 10 ** decimals
      return Math.round(value * factor) / factor
    },
    pick: <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)],
    bool: (probabilityTrue = 0.5) => rand() < probabilityTrue,
    shuffle: <T>(arr: readonly T[]): T[] => {
      const copy = [...arr]
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1))
        ;[copy[i], copy[j]] = [copy[j], copy[i]]
      }
      return copy
    },
  }
}
