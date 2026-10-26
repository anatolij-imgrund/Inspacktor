import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import type { Db } from './datenbank';

/** Nur für Tests: bildet die genutzten expo-sqlite-Methoden mit node:sqlite nach. */
export function testDb(): Db & { schliessen(): void } {
  const db = new DatabaseSync(':memory:');
  const p = (params: unknown[]) => params as SQLInputValue[];
  const adapter = {
    execAsync: (sql: string) => {
      db.exec(sql);
      return Promise.resolve();
    },
    runAsync: (sql: string, ...params: unknown[]) => {
      const r = db.prepare(sql).run(...p(params));
      return Promise.resolve({ lastInsertRowId: Number(r.lastInsertRowid), changes: Number(r.changes) });
    },
    getFirstAsync: (sql: string, ...params: unknown[]) =>
      Promise.resolve(db.prepare(sql).get(...p(params)) ?? null),
    getAllAsync: (sql: string, ...params: unknown[]) => Promise.resolve(db.prepare(sql).all(...p(params))),
    schliessen: () => db.close(),
  };
  return adapter;
}
