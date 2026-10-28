/**
 * Integration tests run against a dedicated local MongoDB database so they never touch
 * development or production data. These values are set before src/config.ts loads .env, and
 * dotenv never overrides a variable that is already set.
 */
process.env.DATABASE_URI = process.env.TEST_DATABASE_URI ?? 'mongodb://127.0.0.1:27017/tel_ganesan_test'
process.env.PUBLIC_SITE_URL = 'http://localhost:3000'
process.env.INTERNAL_API_KEY = ''
process.env.NODE_ENV = 'test'
