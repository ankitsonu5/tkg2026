import 'dotenv/config'

/**
 * Integration tests run against a dedicated database so they never touch development data.
 * Create it once with:
 *   createdb tel_ganesan_test
 *   DATABASE_URI=postgres://localhost:5432/tel_ganesan_test npm run db:migrate
 */
process.env.DATABASE_URI =
  process.env.TEST_DATABASE_URI ?? 'postgres://localhost:5432/tel_ganesan_test'
// NODE_ENV is typed read-only under Next's ambient types; assign through the index signature.
if (!process.env.NODE_ENV) (process.env as Record<string, string>).NODE_ENV = 'test'
