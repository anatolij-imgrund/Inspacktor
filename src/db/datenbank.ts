import type { SQLiteDatabase } from 'expo-sqlite';

/** Der Teil von expo-sqlite, den wir nutzen – so lässt sich in Tests node:sqlite unterschieben. */
export type Db = Pick<SQLiteDatabase, 'execAsync' | 'runAsync' | 'getFirstAsync' | 'getAllAsync'>;

export const DATENBANK_NAME = 'vorratsliste.db';

/** Jede Migration hebt PRAGMA user_version um genau eins. Nie nachträglich ändern, nur anhängen. */
const MIGRATIONEN: string[] = [
  `CREATE TABLE kisten (
     id            INTEGER PRIMARY KEY AUTOINCREMENT,
     code          TEXT NOT NULL UNIQUE,
     titel         TEXT NOT NULL,
     standort      TEXT NOT NULL DEFAULT '',
     beschreibung  TEXT NOT NULL DEFAULT '',
     foto          TEXT,
     erstellt_am   TEXT NOT NULL,
     geaendert_am  TEXT NOT NULL
   );`,
  `CREATE TABLE gegenstaende (
     id            INTEGER PRIMARY KEY AUTOINCREMENT,
     kiste_id      INTEGER NOT NULL REFERENCES kisten(id) ON DELETE CASCADE,
     name          TEXT NOT NULL,
     beschreibung  TEXT NOT NULL DEFAULT '',
     foto          TEXT,
     erstellt_am   TEXT NOT NULL,
     geaendert_am  TEXT NOT NULL
   );
   CREATE INDEX gegenstaende_kiste ON gegenstaende(kiste_id);`,
  `ALTER TABLE gegenstaende ADD COLUMN menge INTEGER NOT NULL DEFAULT 1;`,
];

export const SCHEMA_VERSION = MIGRATIONEN.length;

export async function migriere(db: Db): Promise<void> {
  const zeile = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = zeile?.user_version ?? 0;
  if (version > SCHEMA_VERSION) {
    throw new Error(`Datenbank ist neuer (v${version}) als die App (v${SCHEMA_VERSION}).`);
  }
  while (version < SCHEMA_VERSION) {
    try {
      await db.execAsync(`BEGIN; ${MIGRATIONEN[version]} PRAGMA user_version = ${version + 1}; COMMIT;`);
    } catch (fehler) {
      await db.execAsync('ROLLBACK;').catch(() => undefined);
      throw fehler;
    }
    version++;
  }
}

export async function initialisiere(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  await migriere(db);
}
