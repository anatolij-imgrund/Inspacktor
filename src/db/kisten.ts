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

/** Kurzform eines Gegenstands für Übersicht und Suche. */
export type GegenstandKurz = { name: string; beschreibung: string };

/** Kiste für die Übersicht – mit ihren Gegenständen, damit die Suche auch den Inhalt findet. */
export type KisteUebersicht = Kiste & { gegenstaende: GegenstandKurz[] };

export async function alleKisten(db: Db): Promise<KisteUebersicht[]> {
  const zeilen = await db.getAllAsync<Zeile>(
    `SELECT ${SPALTEN} FROM kisten ORDER BY geaendert_am DESC, id DESC`,
  );
  const inhalte = await db.getAllAsync<{ kiste_id: number; name: string; beschreibung: string }>(
    'SELECT kiste_id, name, beschreibung FROM gegenstaende ORDER BY id',
  );
  const nachKiste = new Map<number, GegenstandKurz[]>();
  for (const g of inhalte) {
    const liste = nachKiste.get(g.kiste_id) ?? [];
    liste.push({ name: g.name, beschreibung: g.beschreibung });
    nachKiste.set(g.kiste_id, liste);
  }
  return zeilen.map((z) => ({ ...alsKiste(z), gegenstaende: nachKiste.get(z.id) ?? [] }));
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

/** Löscht die Kiste mit allen Gegenständen und gibt alle Fotos zurück, damit sie aufgeräumt werden können. */
export async function loescheKiste(db: Db, code: string): Promise<string[]> {
  const kiste = await kisteNachCode(db, code);
  if (!kiste) return [];
  const fotos = await db.getAllAsync<{ foto: string }>(
    'SELECT foto FROM gegenstaende WHERE kiste_id = ? AND foto IS NOT NULL',
    kiste.id,
  );
  // Ausdrücklich löschen, auch wenn ON DELETE CASCADE greift – sicher, falls foreign_keys aus ist.
  await db.runAsync('DELETE FROM gegenstaende WHERE kiste_id = ?', kiste.id);
  await db.runAsync('DELETE FROM kisten WHERE id = ?', kiste.id);
  return [...(kiste.foto ? [kiste.foto] : []), ...fotos.map((f) => f.foto)];
}

function suchWoerter(suche: string): string[] {
  return suche.toLocaleLowerCase('de').split(/\s+/).filter(Boolean);
}

function kistenText(k: Kiste): string {
  return [k.titel, k.standort, k.beschreibung, k.code].join('\n').toLocaleLowerCase('de');
}

function gegenstandText(g: GegenstandKurz): string {
  return `${g.name}\n${g.beschreibung}`.toLocaleLowerCase('de');
}

/**
 * Suche über Titel, Beschreibung, Standort, Code und alle Gegenstände. Groß-/Kleinschreibung
 * und Umlaute werden in JS verglichen, weil SQLite-LIKE „Ä“ und „ä“ nicht gleich behandelt.
 * Mehrere Wörter müssen alle vorkommen – egal ob in der Kiste oder in einem Gegenstand
 * („dach jacke“ findet die Kiste auf dem Dach, in der eine Jacke liegt).
 */
export function filtereKisten<K extends KisteUebersicht>(kisten: K[], suche: string): K[] {
  const woerter = suchWoerter(suche);
  if (woerter.length === 0) return kisten;
  return kisten.filter((k) => {
    const text = [kistenText(k), ...k.gegenstaende.map(gegenstandText)].join('\n');
    return woerter.every((w) => text.includes(w));
  });
}

/**
 * Namen der Gegenstände, wegen denen die Kiste gefunden wurde – zur Anzeige in der Trefferliste.
 * Wörter, die schon in der Kiste selbst stehen (z. B. der Standort), zählen nicht.
 */
export function passendeGegenstaende(kiste: KisteUebersicht, suche: string): string[] {
  const eigen = kistenText(kiste);
  const woerter = suchWoerter(suche).filter((w) => !eigen.includes(w));
  if (woerter.length === 0) return [];
  return kiste.gegenstaende
    .filter((g) => woerter.some((w) => gegenstandText(g).includes(w)))
    .map((g) => g.name);
}
