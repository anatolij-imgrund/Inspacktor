import { erzeugeKistenCode } from '@/lib/kisten-code';

import type { Db } from './datenbank';

export type Kiste = {
  id: number;
  code: string;
  titel: string;
  standort: string;
  beschreibung: string;
  /** Dateiname im App-Ordner „fotos“ oder null. */
  foto: string | null;
  erstelltAm: string;
  geaendertAm: string;
};

export type KistenDaten = {
  titel: string;
  standort: string;
  beschreibung: string;
  foto: string | null;
};

type Zeile = {
  id: number;
  code: string;
  titel: string;
  standort: string;
  beschreibung: string;
  foto: string | null;
  erstellt_am: string;
  geaendert_am: string;
};

const SPALTEN = 'id, code, titel, standort, beschreibung, foto, erstellt_am, geaendert_am';

function alsKiste(z: Zeile): Kiste {
  return {
    id: z.id,
    code: z.code,
    titel: z.titel,
    standort: z.standort,
    beschreibung: z.beschreibung,
    foto: z.foto,
    erstelltAm: z.erstellt_am,
    geaendertAm: z.geaendert_am,
  };
}

export async function alleKisten(db: Db): Promise<Kiste[]> {
  const zeilen = await db.getAllAsync<Zeile>(
    `SELECT ${SPALTEN} FROM kisten ORDER BY geaendert_am DESC, id DESC`,
  );
  return zeilen.map(alsKiste);
}

export async function kisteNachCode(db: Db, code: string): Promise<Kiste | null> {
  const z = await db.getFirstAsync<Zeile>(`SELECT ${SPALTEN} FROM kisten WHERE code = ?`, code);
  return z ? alsKiste(z) : null;
}

/** Alle bisher benutzten Standorte, häufigste zuerst – als Schnellauswahl im Formular. */
export async function standorte(db: Db): Promise<string[]> {
  const zeilen = await db.getAllAsync<{ standort: string }>(
    `SELECT standort FROM kisten WHERE standort <> ''
     GROUP BY standort ORDER BY COUNT(*) DESC, standort`,
  );
  return zeilen.map((z) => z.standort);
}

function istCodeKollision(fehler: unknown): boolean {
  return fehler instanceof Error && /UNIQUE/i.test(fehler.message) && /code/i.test(fehler.message);
}

export async function legeKisteAn(
  db: Db,
  daten: KistenDaten,
  neuerCode: () => string = erzeugeKistenCode,
  jetzt: () => Date = () => new Date(),
): Promise<Kiste> {
  const zeit = jetzt().toISOString();
  for (let versuch = 0; versuch < 10; versuch++) {
    const code = neuerCode();
    try {
      await db.runAsync(
        `INSERT INTO kisten (code, titel, standort, beschreibung, foto, erstellt_am, geaendert_am)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        code,
        daten.titel,
        daten.standort,
        daten.beschreibung,
        daten.foto,
        zeit,
        zeit,
      );
      const kiste = await kisteNachCode(db, code);
      if (!kiste) throw new Error('Kiste wurde nicht gespeichert.');
      return kiste;
    } catch (fehler) {
      if (!istCodeKollision(fehler)) throw fehler;
    }
  }
  throw new Error('Kein freier Kisten-Code gefunden.');
}

export async function aktualisiereKiste(
  db: Db,
  code: string,
  daten: KistenDaten,
  jetzt: () => Date = () => new Date(),
): Promise<void> {
  const ergebnis = await db.runAsync(
    `UPDATE kisten SET titel = ?, standort = ?, beschreibung = ?, foto = ?, geaendert_am = ?
     WHERE code = ?`,
    daten.titel,
    daten.standort,
    daten.beschreibung,
    daten.foto,
    jetzt().toISOString(),
    code,
  );
  if (ergebnis.changes === 0) throw new Error('Kiste nicht gefunden.');
}

export async function loescheKiste(db: Db, code: string): Promise<void> {
  await db.runAsync('DELETE FROM kisten WHERE code = ?', code);
}

/**
 * Suche über Titel, Inhalt, Standort und Code. Groß-/Kleinschreibung und
 * Umlaute werden in JS verglichen, weil SQLite-LIKE „Ä“ und „ä“ nicht gleich behandelt.
 * Mehrere Wörter müssen alle vorkommen („dach winter“ findet die Winterkiste auf dem Dach).
 */
export function filtereKisten(kisten: Kiste[], suche: string): Kiste[] {
  const woerter = suche.toLocaleLowerCase('de').split(/\s+/).filter(Boolean);
  if (woerter.length === 0) return kisten;
  return kisten.filter((k) => {
    const text = [k.titel, k.standort, k.beschreibung, k.code].join('\n').toLocaleLowerCase('de');
    return woerter.every((w) => text.includes(w));
  });
}
