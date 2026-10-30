/**
 * Sets (or resets) a staff account's password, creating the account if it does not exist.
 * Use it when nobody knows the admin password — there is no other way to recover one, since
 * only a hash is stored.
 *
 *   npm run set:admin-password -- you@example.com            # prompts for the password
 *   npm run set:admin-password -- someusername --create "Name" # username login (no email)
 *   npm run set:admin-password -- you@example.com --create "Your Name" --role administrator
 *
 * Writes to the database in backend/.env DATABASE_URI.
 */
import { createInterface } from 'node:readline'

import { hashPassword, passwordProblem } from '../src/admin/auth'
import { ROLES, type Role } from '../src/admin/permissions'
import { connectDatabase, disconnectDatabase } from '../src/db'
import { User } from '../src/models'

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer)
    }),
  )
}

async function main() {
  const login = process.argv[2]?.trim().toLowerCase()
  if (!login || login.startsWith('--')) throw new Error('Usage: npm run set:admin-password -- <email or username> [--create "Name"] [--role administrator]')
  const key = login.includes('@') ? { email: login } : { username: login }

  const password = process.env.NEW_PASSWORD ?? (await ask('New password (min 8 characters): '))
  const problem = passwordProblem(password)
  if (problem) throw new Error(problem)

  await connectDatabase()
  const existing = await User.findOne(key).lean().exec()
  const secret = await hashPassword(password)

  if (existing) {
    await User.updateOne({ _id: existing._id }, { $set: { ...secret, loginAttempts: 0, lockUntil: null } }).exec()
    console.log(`Password updated for ${login} (roles: ${(existing.roles as string[] | undefined)?.join(', ') || 'none'}).`)
  } else {
    const name = arg('create')
    if (!name) throw new Error(`No account for ${login}. Add --create "Full Name" to create one.`)
    const role = (arg('role') ?? 'administrator') as Role
    if (!ROLES.includes(role)) throw new Error(`Unknown role "${role}". Use one of: ${ROLES.join(', ')}`)
    await User.create({ ...key, name, roles: [role], assignedRoutes: [], ...secret })
    console.log(`Created ${role} account for ${login}.`)
  }
  await disconnectDatabase()
}

main().catch(async (error) => {
  console.error(`\nERROR: ${error instanceof Error ? error.message : error}\n`)
  await disconnectDatabase().catch(() => undefined)
  process.exit(1)
})
