import { data, type DataClient } from '../src/data/client'
import { connectDatabase } from '../src/db'

/** Connects to the test database (see vitest.setup.ts) and returns the data client. */
export async function testDb(): Promise<DataClient> {
  await connectDatabase()
  return data
}

/** Unique suffix so parallel or repeated runs never collide on unique fields. */
export function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
