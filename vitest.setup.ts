import 'dotenv/config'

/**
 * Integration tests run against a dedicated MongoDB database so they never touch
 * development data. TEST_DATABASE_URI can override the local default in CI.
 */
process.env.DATABASE_URI =
  process.env.TEST_DATABASE_URI ?? 'mongodb://127.0.0.1:27017/tel_ganesan_test';
// Never inherit a development/production value from .env while running the test suite.
// NODE_ENV is typed read-only under Next's ambient types; assign through the index signature.
(process.env as Record<string, string>).NODE_ENV = 'test'
