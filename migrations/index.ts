import * as migration_20260908_065849_initial from './20260908_065849_initial';

export const migrations = [
  {
    up: migration_20260908_065849_initial.up,
    down: migration_20260908_065849_initial.down,
    name: '20260908_065849_initial'
  },
];
