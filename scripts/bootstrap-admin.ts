/**
 * Local administrator bootstrap.
 *
 * Creates the first administrator with a GENERATED password that is printed once and never
 * written to a file or committed. Refuses to run against a non-development NODE_ENV, and
 * refuses to run if an administrator already exists.
 *
 * Usage: npm run bootstrap:admin -- you@example.com "Your Name"
 */
import 'dotenv/config'

import { randomBytes } from 'node:crypto'

import { getPayload } from 'payload'

import config from '../src/payload.config'

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to bootstrap an administrator in production. Use a controlled provisioning process.')
    process.exit(1)
  }

  const email = process.argv[2] ?? 'admin@localhost.dev'
  const name = process.argv[3] ?? 'Local Administrator'

  const payload = await getPayload({ config })

  const existing = await payload.find({
    collection: 'users',
    where: { roles: { contains: 'administrator' } },
    limit: 1,
    pagination: false,
    overrideAccess: true,
  })

  if (existing.docs.length > 0) {
    console.log('An administrator already exists. Nothing to do.')
    console.log(`Existing administrator: ${existing.docs[0].email}`)
    process.exit(0)
  }

  // 24 random bytes -> 32 base64url characters. Printed once, stored only as a hash.
  const password = randomBytes(24).toString('base64url')

  await payload.create({
    collection: 'users',
    data: { email, name, roles: ['administrator'], password },
    overrideAccess: true,
  })

  console.log('')
  console.log('Local administrator created.')
  console.log(`  email:    ${email}`)
  console.log(`  password: ${password}`)
  console.log('')
  console.log('This password is shown once and is not stored anywhere in the repository.')
  console.log('Sign in at http://localhost:3000/admin and change it.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
