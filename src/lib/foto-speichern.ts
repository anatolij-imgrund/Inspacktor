import type { FotoAuswahl } from '@/components/kisten-formular';

import { loescheFoto, uebernehmeFoto } from './fotos';

/** Macht aus der Auswahl im Formular den Dateinamen, der gespeichert wird. */
export async function fotoFuerSpeichern(auswahl: FotoAuswahl): Promise<string | null> {
  if (!auswahl) return null;
  if (auswahl.quelle === 'gespeichert') return auswahl.name;
  return uebernehmeFoto(auswahl.uri);
}

/** Räumt nach dem Speichern auf: altes Foto weg, wenn es ersetzt oder entfernt wurde. */
export function raeumeAltesFotoAuf(alt: string | null, neu: string | null): void {
  if (alt && alt !== neu) loescheFoto(alt);
}
