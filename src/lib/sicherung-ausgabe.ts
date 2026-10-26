import Constants from 'expo-constants';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { Db } from '@/db/datenbank';

import { fotoBytes, loescheFoto, raeumeVerwaisteFotosAuf, speichereFotoBytes } from './fotos';
import {
  entpackeSicherung,
  fotosDerSicherung,
  leseSicherungsdaten,
  packeSicherung,
  sicherungDateiname,
  spieleSicherungEin,
  verwendeteFotos,
  type EinspielErgebnis,
  type EinspielModus,
  type SicherungDaten,
} from './sicherung';

const APP_VERSION = Constants.expoConfig?.version ?? 'unbekannt';

/** Baut die Sicherungsdatei im Zwischenspeicher der App. */
async function erstelleSicherungsdatei(db: Db): Promise<{ datei: File; kisten: number }> {
  const daten = await leseSicherungsdaten(db, APP_VERSION);
  const fotos = new Map<string, Uint8Array>();
  for (const name of fotosDerSicherung(daten)) {
    const bytes = await fotoBytes(name);
    if (bytes) fotos.set(name, bytes);
  }
  const datei = new File(Paths.cache, sicherungDateiname());
  if (datei.exists) datei.delete();
  datei.create();
  await datei.write(packeSicherung(daten, fotos));
  return { datei, kisten: daten.kisten.length };
}

/** Sicherung in einen frei wählbaren Ordner (z. B. „Downloads“). Null, wenn abgebrochen. */
export async function sicherungSpeichern(db: Db): Promise<{ name: string; kisten: number } | null> {
  let ordner: Directory;
  try {
    ordner = await Directory.pickDirectoryAsync();
  } catch {
    return null;
  }
  const { datei, kisten } = await erstelleSicherungsdatei(db);
  try {
    const ziel = ordner.createFile(datei.name, 'application/zip');
    await ziel.write(await datei.bytes());
    return { name: datei.name, kisten };
  } finally {
    datei.delete();
  }
}

/** Sicherung über das Teilen-Menü – z. B. nach Google Drive oder per E-Mail an sich selbst. */
export async function sicherungTeilen(db: Db): Promise<void> {
  const { datei } = await erstelleSicherungsdatei(db);
  await Sharing.shareAsync(datei.uri, { mimeType: 'application/zip', dialogTitle: 'Sicherung teilen' });
}

export type GeleseneSicherung = { daten: SicherungDaten; fotos: Map<string, Uint8Array> };

/** Lässt eine Sicherungsdatei auswählen und prüft sie. Null, wenn abgebrochen. Wirft SicherungFehler. */
export async function sicherungAuswaehlen(): Promise<GeleseneSicherung | null> {
  // Manche Dateimanager melden ZIPs als „octet-stream“ – deshalb mehrere Typen erlauben.
  const auswahl = await File.pickFileAsync({
    mimeTypes: ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'],
  });
  if (auswahl.canceled) return null;
  return entpackeSicherung(await auswahl.result.bytes());
}

/**
 * Spielt eine geprüfte Sicherung ein: erst Fotos ablegen, dann die Datenbank in einer
 * Transaktion füllen. Scheitert die Datenbank, werden die neuen Fotos wieder entfernt.
 * Zum Schluss werden Fotos gelöscht, auf die nichts mehr verweist.
 */
export async function sicherungEinspielen(
  db: Db,
  sicherung: GeleseneSicherung,
  modus: EinspielModus,
): Promise<EinspielErgebnis> {
  const zuordnung = new Map<string, string>();
  let ergebnis: EinspielErgebnis;
  try {
    for (const [alt, bytes] of sicherung.fotos) zuordnung.set(alt, await speichereFotoBytes(bytes));
    ergebnis = await spieleSicherungEin(db, sicherung.daten, modus, zuordnung);
  } catch (fehler) {
    for (const neu of zuordnung.values()) loescheFoto(neu);
    throw fehler;
  }
  // Erst nach erfolgreichem Einspielen aufräumen – ein Fehler hier kostet nur Speicherplatz.
  try {
    raeumeVerwaisteFotosAuf(await verwendeteFotos(db));
  } catch {
    // ignorieren
  }
  return ergebnis;
}
