import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/**
 * Fotos liegen im privaten App-Ordner „fotos“. In der Datenbank steht nur
 * der Dateiname, weil sich der absolute Pfad bei Updates ändern kann.
 */
function fotoOrdner(): Directory {
  const ordner = new Directory(Paths.document, 'fotos');
  ordner.create({ idempotent: true, intermediates: true });
  return ordner;
}

/** Längste Seite in Pixeln. Reicht für scharfe Ansicht auf dem Handy und hält Sicherungen klein. */
export const FOTO_MAX_PX = 1600;

function neuerFotoName(): string {
  return `foto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
}

/**
 * Übernimmt ein Bild aus Kamera oder Galerie in den App-Ordner und liefert den Dateinamen.
 * Große Handyfotos (oft 3–5 MB) werden auf FOTO_MAX_PX verkleinert – meist auf 200–400 KB.
 */
export async function uebernehmeFoto(quelleUri: string): Promise<string> {
  const name = neuerFotoName();
  const ziel = new File(fotoOrdner(), name);
  try {
    let bild = await ImageManipulator.manipulate(quelleUri).renderAsync();
    if (Math.max(bild.width, bild.height) > FOTO_MAX_PX) {
      const kontext = ImageManipulator.manipulate(bild);
      kontext.resize(bild.width >= bild.height ? { width: FOTO_MAX_PX } : { height: FOTO_MAX_PX });
      bild = await kontext.renderAsync();
    }
    const ergebnis = await bild.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
    await new File(ergebnis.uri).move(ziel);
  } catch {
    // Klappt das Verkleinern nicht, lieber das Original nehmen als gar kein Foto.
    if (ziel.exists) ziel.delete();
    await new File(quelleUri).copy(ziel);
  }
  return name;
}

export function fotoUri(name: string): string {
  return new File(fotoOrdner(), name).uri;
}

export function loescheFoto(name: string | null): void {
  if (!name) return;
  try {
    const datei = new File(fotoOrdner(), name);
    if (datei.exists) datei.delete();
  } catch {
    // Ein übrig gebliebenes Foto ist kein Grund, das Speichern scheitern zu lassen.
  }
}

/** Inhalt eines Fotos für die Sicherung, oder null, wenn die Datei fehlt. */
export async function fotoBytes(name: string): Promise<Uint8Array | null> {
  const datei = new File(fotoOrdner(), name);
  if (!datei.exists) return null;
  return datei.bytes();
}

/** Legt ein Foto aus einer Sicherung unter neuem Namen ab und liefert den Namen. */
export async function speichereFotoBytes(bytes: Uint8Array): Promise<string> {
  const name = neuerFotoName();
  const datei = new File(fotoOrdner(), name);
  datei.create();
  await datei.write(bytes);
  return name;
}

/** Löscht Fotodateien, auf die nichts mehr verweist (z. B. nach „Ersetzen“ beim Wiederherstellen). */
export function raeumeVerwaisteFotosAuf(verwendet: Set<string>): number {
  let geloescht = 0;
  for (const eintrag of fotoOrdner().list()) {
    if (eintrag instanceof File && !verwendet.has(eintrag.name)) {
      try {
        eintrag.delete();
        geloescht++;
      } catch {
        // nächste Datei
      }
    }
  }
  return geloescht;
}

/** Gesamtgröße aller Fotos in Byte – für den Hinweis vor dem Sichern. */
export function fotoOrdnerGroesse(): number {
  let summe = 0;
  for (const eintrag of fotoOrdner().list()) if (eintrag instanceof File) summe += eintrag.size;
  return summe;
}
