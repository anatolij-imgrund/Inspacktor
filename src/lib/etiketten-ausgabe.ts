import { Directory, File } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { A4, etikettenHtml, pdfDateiname, type EtikettGroesse, type EtikettKiste } from './etiketten';

export async function etikettenDrucken(kisten: EtikettKiste[], groesse: EtikettGroesse): Promise<void> {
  await Print.printAsync({ html: etikettenHtml(kisten, groesse), width: A4.breite, height: A4.hoehe });
}

async function erzeugePdf(kisten: EtikettKiste[], groesse: EtikettGroesse): Promise<File> {
  const { uri } = await Print.printToFileAsync({
    html: etikettenHtml(kisten, groesse),
    width: A4.breite,
    height: A4.hoehe,
  });
  return new File(uri);
}

/**
 * Lässt den Nutzer einen Ordner wählen (z. B. „Downloads“) und legt das PDF dort ab.
 * Gibt den Dateinamen zurück oder null, wenn der Nutzer abgebrochen hat.
 */
export async function etikettenAlsPdfSpeichern(
  kisten: EtikettKiste[],
  groesse: EtikettGroesse,
): Promise<string | null> {
  let ordner: Directory;
  try {
    ordner = await Directory.pickDirectoryAsync();
  } catch {
    return null; // Auswahl abgebrochen
  }
  const pdf = await erzeugePdf(kisten, groesse);
  try {
    const name = pdfDateiname(kisten);
    const ziel = ordner.createFile(name, 'application/pdf');
    await ziel.write(await pdf.bytes());
    return name;
  } finally {
    pdf.delete();
  }
}

/** Öffnet das Android-Teilen-Menü (Drive, E-Mail, WhatsApp, Druck-Apps …). */
export async function etikettenTeilen(kisten: EtikettKiste[], groesse: EtikettGroesse): Promise<void> {
  const pdf = await erzeugePdf(kisten, groesse);
  // Teilen braucht einen sprechenden Dateinamen, sonst heißt die Datei beim Empfänger „print-123.pdf“.
  const benannt = new File(pdf.parentDirectory, pdfDateiname(kisten));
  if (benannt.exists) benannt.delete();
  await pdf.move(benannt);
  await Sharing.shareAsync(benannt.uri, { mimeType: 'application/pdf', dialogTitle: 'Etikett teilen' });
}
