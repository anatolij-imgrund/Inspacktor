import type { Db } from './datenbank';

export type Gegenstand = {
  id: number;
  kisteId: number;
  name: string;
  beschreibung: string;
  /** Dateiname im App-Ordner „fotos“ oder null. */
  foto: string | null;
  erstelltAm: string;
  geaendertAm: string;
};

export type GegenstandDaten = {
  name: string;
  beschreibung: string;
  foto: string | null;
};

type Zeile = {
  id: number;
  kiste_id: number;
  name: string;
  beschreibung: string;
  foto: string | null;
  erstellt_am: string;
  geaendert_am: string;
};

const SPALTEN = 'id, kiste_id, name, beschreibung, foto, erstellt_am, geaendert_am';

function alsGegenstand(z: Zeile): Gegenstand {
  return {
    id: z.id,
    kisteId: z.kiste_id,
    name: z.name,
    beschreibung: z.beschreibung,
    foto: z.foto,
    erstelltAm: z.erstellt_am,
    geaendertAm: z.geaendert_am,
  };
}

/** Eine Änderung am Inhalt zählt als Änderung der Kiste – so steht sie oben in der Übersicht. */
async function beruehreKiste(db: Db, kisteId: number, zeit: string): Promise<void> {
  await db.runAsync('UPDATE kisten SET geaendert_am = ? WHERE id = ?', zeit, kisteId);
}

/** In der Reihenfolge, in der sie eingepackt wurden. */
export async function gegenstaendeDerKiste(db: Db, kisteId: number): Promise<Gegenstand[]> {
  const zeilen = await db.getAllAsync<Zeile>(
    `SELECT ${SPALTEN} FROM gegenstaende WHERE kiste_id = ? ORDER BY id`,
    kisteId,
  );
  return zeilen.map(alsGegenstand);
}

export async function gegenstandNachId(db: Db, id: number): Promise<Gegenstand | null> {
  const z = await db.getFirstAsync<Zeile>(`SELECT ${SPALTEN} FROM gegenstaende WHERE id = ?`, id);
  return z ? alsGegenstand(z) : null;
}

export async function legeGegenstandAn(
  db: Db,
  kisteId: number,
  daten: GegenstandDaten,
  jetzt: () => Date = () => new Date(),
): Promise<Gegenstand> {
  const zeit = jetzt().toISOString();
  const kiste = await db.getFirstAsync<{ id: number }>('SELECT id FROM kisten WHERE id = ?', kisteId);
  if (!kiste) throw new Error('Kiste nicht gefunden.');
  const ergebnis = await db.runAsync(
    `INSERT INTO gegenstaende (kiste_id, name, beschreibung, foto, erstellt_am, geaendert_am)
     VALUES (?, ?, ?, ?, ?, ?)`,
    kisteId,
    daten.name,
    daten.beschreibung,
    daten.foto,
    zeit,
    zeit,
  );
  await beruehreKiste(db, kisteId, zeit);
  const neu = await gegenstandNachId(db, ergebnis.lastInsertRowId);
  if (!neu) throw new Error('Gegenstand wurde nicht gespeichert.');
  return neu;
}

export async function aktualisiereGegenstand(
  db: Db,
  id: number,
  daten: GegenstandDaten,
  jetzt: () => Date = () => new Date(),
): Promise<void> {
  const alt = await gegenstandNachId(db, id);
  if (!alt) throw new Error('Gegenstand nicht gefunden.');
  const zeit = jetzt().toISOString();
  await db.runAsync(
    'UPDATE gegenstaende SET name = ?, beschreibung = ?, foto = ?, geaendert_am = ? WHERE id = ?',
    daten.name,
    daten.beschreibung,
    daten.foto,
    zeit,
    id,
  );
  await beruehreKiste(db, alt.kisteId, zeit);
}

/** Löscht den Gegenstand und gibt sein Foto zurück, damit es aufgeräumt werden kann. */
export async function loescheGegenstand(
  db: Db,
  id: number,
  jetzt: () => Date = () => new Date(),
): Promise<string | null> {
  const alt = await gegenstandNachId(db, id);
  if (!alt) return null;
  await db.runAsync('DELETE FROM gegenstaende WHERE id = ?', id);
  await beruehreKiste(db, alt.kisteId, jetzt().toISOString());
  return alt.foto;
}
