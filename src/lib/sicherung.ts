import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate';
import { z } from 'zod';

import type { Db } from '@/db/datenbank';
import { CODE_LAENGE, CODE_ZEICHEN } from '@/lib/kisten-code';

/**
 * Sicherungsdatei: ein ZIP mit
 *   daten.json – alle Kisten mit ihren Gegenständen
 *   fotos/…    – die Fotos, auf die daten.json verweist
 * Bewusst einfach gehalten, damit man die Datei auch am PC öffnen und lesen kann.
 */
export const SICHERUNG_FORMAT = 'vorratsliste-sicherung';
export const SICHERUNG_VERSION = 1;
const DATEN_DATEI = 'daten.json';
const FOTO_ORDNER = 'fotos/';

/** Nur einfache Dateinamen – verhindert, dass eine präparierte Sicherung Pfade wie „../“ unterschiebt. */
const fotoName = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/, 'Ungültiger Fotoname');
const zeitpunkt = z.string().min(1).max(40);

const gegenstandSchema = z.object({
  name: z.string().min(1).max(80),
  beschreibung: z.string().max(1000),
  menge: z.number().int().min(1).max(999),
  foto: fotoName.nullable(),
  erstelltAm: zeitpunkt,
  geaendertAm: zeitpunkt,
});

const kisteSchema = z.object({
  code: z
    .string()
    .length(CODE_LAENGE)
    .refine((c) => [...c].every((zeichen) => CODE_ZEICHEN.includes(zeichen)), 'Ungültiger Kisten-Code'),
  titel: z.string().min(1).max(80),
  standort: z.string().max(60),
  beschreibung: z.string().max(2000),
  foto: fotoName.nullable(),
  erstelltAm: zeitpunkt,
  geaendertAm: zeitpunkt,
  gegenstaende: z.array(gegenstandSchema),
});

export const sicherungSchema = z.object({
  format: z.literal(SICHERUNG_FORMAT),
  version: z.literal(SICHERUNG_VERSION),
  erstelltAm: zeitpunkt,
  appVersion: z.string().max(40),
  kisten: z.array(kisteSchema).refine(
    (kisten) => new Set(kisten.map((k) => k.code)).size === kisten.length,
    'Ein Kisten-Code kommt doppelt vor',
  ),
});

export type SicherungDaten = z.infer<typeof sicherungSchema>;
export type SicherungKiste = z.infer<typeof kisteSchema>;

/** Alle Fotonamen, auf die die Sicherung verweist (ohne Doppelte). */
export function fotosDerSicherung(daten: SicherungDaten): string[] {
  const namen = new Set<string>();
  for (const k of daten.kisten) {
    if (k.foto) namen.add(k.foto);
    for (const g of k.gegenstaende) if (g.foto) namen.add(g.foto);
  }
  return [...namen];
}

export async function leseSicherungsdaten(
  db: Db,
  appVersion: string,
  jetzt: () => Date = () => new Date(),
): Promise<SicherungDaten> {
  const kisten = await db.getAllAsync<{
    id: number;
    code: string;
    titel: string;
    standort: string;
    beschreibung: string;
    foto: string | null;
    erstellt_am: string;
    geaendert_am: string;
  }>('SELECT id, code, titel, standort, beschreibung, foto, erstellt_am, geaendert_am FROM kisten ORDER BY id');
  const gegenstaende = await db.getAllAsync<{
    kiste_id: number;
    name: string;
    beschreibung: string;
    menge: number;
    foto: string | null;
    erstellt_am: string;
    geaendert_am: string;
  }>('SELECT kiste_id, name, beschreibung, menge, foto, erstellt_am, geaendert_am FROM gegenstaende ORDER BY id');

  return {
    format: SICHERUNG_FORMAT,
    version: SICHERUNG_VERSION,
    erstelltAm: jetzt().toISOString(),
    appVersion,
    kisten: kisten.map((k) => ({
      code: k.code,
      titel: k.titel,
      standort: k.standort,
      beschreibung: k.beschreibung,
      foto: k.foto,
      erstelltAm: k.erstellt_am,
      geaendertAm: k.geaendert_am,
      gegenstaende: gegenstaende
        .filter((g) => g.kiste_id === k.id)
        .map((g) => ({
          name: g.name,
          beschreibung: g.beschreibung,
          menge: g.menge,
          foto: g.foto,
          erstelltAm: g.erstellt_am,
          geaendertAm: g.geaendert_am,
        })),
    })),
  };
}

/** Baut die ZIP-Datei. Fotos werden nur abgelegt, nicht nochmals komprimiert – JPEG ist schon gepackt. */
export function packeSicherung(daten: SicherungDaten, fotos: Map<string, Uint8Array>): Uint8Array {
  const inhalt: Zippable = {
    [DATEN_DATEI]: [strToU8(JSON.stringify(daten, null, 2)), { level: 6 }],
  };
  for (const [name, bytes] of fotos) inhalt[FOTO_ORDNER + name] = [bytes, { level: 0 }];
  return zipSync(inhalt);
}

export class SicherungFehler extends Error {}

/**
 * Liest eine Sicherungsdatei und prüft sie gründlich. Fehlt ein Foto in der Datei,
 * wird der Verweis entfernt statt abzubrechen – die Daten sind wichtiger als ein Bild.
 */
export function entpackeSicherung(bytes: Uint8Array): { daten: SicherungDaten; fotos: Map<string, Uint8Array> } {
  let dateien: Record<string, Uint8Array>;
  try {
    dateien = unzipSync(bytes);
  } catch {
    throw new SicherungFehler('Die Datei ist keine gültige Sicherung (kein ZIP-Archiv).');
  }
  const json = dateien[DATEN_DATEI];
  if (!json) throw new SicherungFehler('In der Datei fehlt „daten.json“ – das ist keine Sicherung dieser App.');

  let roh: unknown;
  try {
    roh = JSON.parse(strFromU8(json));
  } catch {
    throw new SicherungFehler('„daten.json“ ist beschädigt.');
  }
  if (typeof roh === 'object' && roh !== null && 'format' in roh && roh.format === SICHERUNG_FORMAT) {
    const version = 'version' in roh ? roh.version : undefined;
    if (typeof version === 'number' && version > SICHERUNG_VERSION) {
      throw new SicherungFehler('Die Sicherung stammt aus einer neueren App-Version. Bitte zuerst die App aktualisieren.');
    }
  }
  const ergebnis = sicherungSchema.safeParse(roh);
  if (!ergebnis.success) {
    const stelle = ergebnis.error.issues[0];
    throw new SicherungFehler(
      `Die Sicherung ist ungültig${stelle ? ` (${stelle.path.join('.') || 'Datei'}: ${stelle.message})` : ''}.`,
    );
  }

  const fotos = new Map<string, Uint8Array>();
  for (const name of fotosDerSicherung(ergebnis.data)) {
    const datei = dateien[FOTO_ORDNER + name];
    if (datei) fotos.set(name, datei);
  }
  const ohneFehlende = (foto: string | null) => (foto && fotos.has(foto) ? foto : null);
  const daten: SicherungDaten = {
    ...ergebnis.data,
    kisten: ergebnis.data.kisten.map((k) => ({
      ...k,
      foto: ohneFehlende(k.foto),
      gegenstaende: k.gegenstaende.map((g) => ({ ...g, foto: ohneFehlende(g.foto) })),
    })),
  };
  return { daten, fotos };
}

export type EinspielModus = 'ersetzen' | 'ergaenzen';

export type EinspielErgebnis = {
  kisten: number;
  gegenstaende: number;
  /** Kisten, deren Code es schon gab (nur beim Ergänzen). */
  uebersprungen: number;
};

/**
 * Spielt die Sicherung in einer Transaktion ein – entweder alles oder nichts.
 * `fotoZuordnung` übersetzt Fotonamen aus der Sicherung in die Namen, unter denen
 * die Fotos auf dem Gerät abgelegt wurden.
 */
export async function spieleSicherungEin(
  db: Db,
  daten: SicherungDaten,
  modus: EinspielModus,
  fotoZuordnung: Map<string, string>,
): Promise<EinspielErgebnis> {
  const foto = (name: string | null) => (name ? (fotoZuordnung.get(name) ?? null) : null);
  const ergebnis: EinspielErgebnis = { kisten: 0, gegenstaende: 0, uebersprungen: 0 };

  await db.execAsync('BEGIN;');
  try {
    if (modus === 'ersetzen') {
      await db.execAsync('DELETE FROM gegenstaende; DELETE FROM kisten;');
    }
    for (const k of daten.kisten) {
      const vorhanden = await db.getFirstAsync<{ id: number }>('SELECT id FROM kisten WHERE code = ?', k.code);
      if (vorhanden) {
        ergebnis.uebersprungen++;
        continue;
      }
      const neu = await db.runAsync(
        `INSERT INTO kisten (code, titel, standort, beschreibung, foto, erstellt_am, geaendert_am)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        k.code,
        k.titel,
        k.standort,
        k.beschreibung,
        foto(k.foto),
        k.erstelltAm,
        k.geaendertAm,
      );
      ergebnis.kisten++;
      for (const g of k.gegenstaende) {
        await db.runAsync(
          `INSERT INTO gegenstaende (kiste_id, name, beschreibung, menge, foto, erstellt_am, geaendert_am)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          neu.lastInsertRowId,
          g.name,
          g.beschreibung,
          g.menge,
          foto(g.foto),
          g.erstelltAm,
          g.geaendertAm,
        );
        ergebnis.gegenstaende++;
      }
    }
    await db.execAsync('COMMIT;');
  } catch (fehler) {
    await db.execAsync('ROLLBACK;').catch(() => undefined);
    throw fehler;
  }
  return ergebnis;
}

/** Alle Fotonamen, auf die die Datenbank gerade verweist – zum Aufräumen verwaister Dateien. */
export async function verwendeteFotos(db: Db): Promise<Set<string>> {
  const zeilen = await db.getAllAsync<{ foto: string }>(
    `SELECT foto FROM kisten WHERE foto IS NOT NULL
     UNION SELECT foto FROM gegenstaende WHERE foto IS NOT NULL`,
  );
  return new Set(zeilen.map((z) => z.foto));
}

/** „Vorratsliste-Sicherung-2026-10-26.zip“ */
export function sicherungDateiname(datum: Date = new Date()): string {
  const d = (n: number) => String(n).padStart(2, '0');
  return `Vorratsliste-Sicherung-${datum.getFullYear()}-${d(datum.getMonth() + 1)}-${d(datum.getDate())}.zip`;
}
