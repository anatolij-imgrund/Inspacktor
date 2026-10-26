import erzeugeQr from 'qrcode-generator';

/** Ruhezone um den Code (in Modulen). Der Standard verlangt 4 – darunter scannen manche Kameras schlecht. */
export const RUHEZONE = 4;

export type QrMatrix = boolean[][];

/** Fehlerkorrektur „Q“ (~25 %): Etiketten auf Kisten werden geknickt, verschmutzt, angerissen. */
export function qrMatrix(text: string): QrMatrix {
  const qr = erzeugeQr(0, 'Q');
  qr.addData(text, 'Byte');
  qr.make();
  const n = qr.getModuleCount();
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => qr.isDark(r, c)));
}

/**
 * SVG-Pfad für alle dunklen Module, inklusive Ruhezone als Versatz.
 * Nebeneinanderliegende Module werden zu einem Rechteck zusammengefasst – kleinerer Pfad,
 * keine feinen Haarlinien zwischen den Modulen beim Drucken.
 */
export function qrPfad(matrix: QrMatrix, ruhezone = RUHEZONE): string {
  const teile: string[] = [];
  matrix.forEach((zeile, r) => {
    let c = 0;
    while (c < zeile.length) {
      if (!zeile[c]) {
        c++;
        continue;
      }
      const start = c;
      while (c < zeile.length && zeile[c]) c++;
      teile.push(`M${start + ruhezone} ${r + ruhezone}h${c - start}v1h-${c - start}z`);
    }
  });
  return teile.join('');
}

export function qrGroesse(matrix: QrMatrix, ruhezone = RUHEZONE): number {
  return matrix.length + 2 * ruhezone;
}

/** Fertiges SVG (schwarz auf weiß, unabhängig vom App-Design) für Etiketten. */
export function qrSvg(text: string): string {
  const m = qrMatrix(text);
  const g = qrGroesse(m);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g} ${g}" shape-rendering="crispEdges">` +
    `<rect width="${g}" height="${g}" fill="#fff"/><path d="${qrPfad(m)}" fill="#000"/></svg>`
  );
}
