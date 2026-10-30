import mongoose from 'mongoose'

import { config } from './config'

// The collections and their indexes already exist (they were created by Payload); never let
// Mongoose create or sync them.
mongoose.set('autoIndex', false)
mongoose.set('autoCreate', false)
mongoose.set('strictQuery', false)

export async function connectDatabase(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) return mongoose
  return mongoose.connect(config.databaseUri, { serverSelectionTimeoutMS: 10_000 })
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect()
}
