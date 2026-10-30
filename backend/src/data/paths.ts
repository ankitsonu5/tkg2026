/**
 * Helpers for dotted field paths where `*` means "every item of this array".
 * Used for relationship population and default values.
 */

type Visitor = (container: Record<string, unknown>, key: string) => void | Promise<void>

/** Calls `visit(container, key)` for every location the path resolves to. */
export async function forEachAtPath(root: unknown, path: string, visit: Visitor): Promise<void> {
  const segments = path.split('.')

  async function walk(node: unknown, index: number): Promise<void> {
    if (node === null || node === undefined) return
    const segment = segments[index]
    const last = index === segments.length - 1

    if (segment === '*') {
      if (!Array.isArray(node)) return
      for (const item of node) await walk(item, index + 1)
      return
    }
    if (typeof node !== 'object' || Array.isArray(node)) return
    const container = node as Record<string, unknown>
    if (last) {
      await visit(container, segment)
      return
    }
    await walk(container[segment], index + 1)
  }

  await walk(root, 0)
}

/**
 * Fills in `value` wherever the path is undefined, creating intermediate group objects
 * (but never inventing array items), the way Payload's afterRead did.
 */
export function applyDefault(root: Record<string, unknown>, path: string, value: unknown): void {
  const segments = path.split('.')

  function walk(node: Record<string, unknown>, index: number): void {
    const segment = segments[index]
    const last = index === segments.length - 1
    if (last) {
      if (node[segment] === undefined) node[segment] = structuredClone(value)
      return
    }
    if (segments[index + 1] === '*') {
      const list = node[segment]
      if (!Array.isArray(list)) return
      for (const item of list) {
        if (item && typeof item === 'object') walk(item as Record<string, unknown>, index + 2)
      }
      return
    }
    if (node[segment] === undefined || node[segment] === null) node[segment] = {}
    const next = node[segment]
    if (next && typeof next === 'object' && !Array.isArray(next)) walk(next as Record<string, unknown>, index + 1)
  }

  walk(root, 0)
}
