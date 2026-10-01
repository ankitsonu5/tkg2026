// The prior initial migration was Postgres/Drizzle SQL and cannot run against MongoDB
// (adapter switch, 2026-09-09). MongoDB collections are created on first write; no
// baseline migration is required. Future data migrations belong here.
export const migrations: never[] = [];
