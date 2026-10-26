import { codeAnzeige, qrInhalt } from './kisten-code';
import { qrSvg } from './qr';

export type EtikettKiste = { code: string; titel: string; standort: string };
export type EtikettGroesse = 'klein' | 'gross';

/** A4 in Punkt (72 ppi) – so erwartet es expo-print. */
export const A4 = { breite: 595, hoehe: 842 } as const;

export const PRO_SEITE: Record<EtikettGroesse, number> = { klein: 10, gross: 2 };

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function etikett(k: EtikettKiste): string {
  return `<div class="etikett">
  <div class="qr">${qrSvg(qrInhalt(k.code))}</div>
  <div class="text">
    <div class="titel">${escapeHtml(k.titel)}</div>
    ${k.standort ? `<div class="standort">${escapeHtml(k.standort)}</div>` : ''}
    <div class="code">${codeAnzeige(k.code)}</div>
  </div>
</div>`;
}

export function teileInSeiten<T>(liste: T[], proSeite: number): T[][] {
  const seiten: T[][] = [];
  for (let i = 0; i < liste.length; i += proSeite) seiten.push(liste.slice(i, i + proSeite));
  return seiten;
}

/**
 * Druckbogen A4 mit Schneidelinien.
 * klein: 2 × 5 Etiketten à 91 × 50 mm – für normale Kisten.
 * groß:  2 Etiketten à 190 × 130 mm – gut lesbar aus Entfernung oder im Halbdunkel.
 */
export function etikettenHtml(kisten: EtikettKiste[], groesse: EtikettGroesse): string {
  const seiten = teileInSeiten(kisten, PRO_SEITE[groesse])
    .map((s) => `<section class="seite ${groesse}">${s.map(etikett).join('')}</section>`)
    .join('');

  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><title>Kisten-Etiketten</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #fff; color: #000; font-family: Roboto, "Helvetica Neue", Arial, sans-serif; }
  .seite { width: 210mm; height: 297mm; padding: 12mm 10mm; display: grid; align-content: start;
           page-break-after: always; break-after: page; overflow: hidden; }
  .seite:last-child { page-break-after: auto; break-after: auto; }
  .klein { grid-template-columns: 91mm 91mm; grid-auto-rows: 50mm; gap: 4mm; }
  .gross { grid-template-columns: 190mm; grid-auto-rows: 130mm; gap: 8mm; }
  .etikett { border: 0.3mm dashed #888; border-radius: 3mm; display: flex; align-items: center;
             overflow: hidden; break-inside: avoid; }
  .qr svg { display: block; width: 100%; height: 100%; }
  .text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .titel { font-weight: 700; line-height: 1.15; overflow: hidden; display: -webkit-box;
           -webkit-box-orient: vertical; hyphens: auto; -webkit-hyphens: auto; overflow-wrap: break-word; }
  .standort { color: #333; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .code { font-family: "Roboto Mono", "DejaVu Sans Mono", monospace; font-weight: 700; letter-spacing: 0.08em; }

  .klein .etikett { padding: 3mm; gap: 3mm; }
  .klein .qr { width: 42mm; height: 42mm; flex: none; }
  .klein .text { gap: 1.5mm; }
  .klein .titel { font-size: 13pt; -webkit-line-clamp: 3; }
  .klein .standort { font-size: 10pt; }
  .klein .code { font-size: 12pt; }

  .gross .etikett { padding: 8mm; gap: 8mm; }
  .gross .qr { width: 95mm; height: 95mm; flex: none; }
  .gross .text { gap: 4mm; }
  .gross .titel { font-size: 26pt; -webkit-line-clamp: 4; }
  .gross .standort { font-size: 16pt; }
  .gross .code { font-size: 24pt; }
</style></head>
<body>${seiten}</body></html>`;
}

/** Dateiname ohne Sonderzeichen, z. B. „Etikett-Weihnachtsdeko-K7QF3M.pdf“. */
export function pdfDateiname(kisten: EtikettKiste[]): string {
  if (kisten.length === 1 && kisten[0]) {
    const k = kisten[0];
    const titel = k.titel
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
      .replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue').replace(/ß/g, 'ss')
      .replace(/[^A-Za-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
    return `Etikett-${titel ? `${titel}-` : ''}${k.code}.pdf`;
  }
  return `Etiketten-${kisten.length}-Kisten.pdf`;
}
