import { Directory, File, Paths } from 'expo-file-system';

/**
 * Fotos liegen im privaten App-Ordner „fotos“. In der Datenbank steht nur
 * der Dateiname, weil sich der absolute Pfad bei Updates ändern kann.
 */
function fotoOrdner(): Directory {
  const ordner = new Directory(Paths.document, 'fotos');
  ordner.create({ idempotent: true, intermediates: true });
  return ordner;
}

/** Kopiert ein Bild (z. B. aus Kamera oder Galerie) in den App-Ordner und liefert den Dateinamen. */
export async function uebernehmeFoto(quelleUri: string): Promise<string> {
  const name = `foto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const ziel = new File(fotoOrdner(), name);
  await new File(quelleUri).copy(ziel);
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
