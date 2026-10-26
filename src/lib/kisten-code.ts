/**
 * Kurzer, gut lesbarer Code für jede Kiste (z. B. „K7QF3M“).
 * Ohne leicht verwechselbare Zeichen wie 0/O, 1/I/L – wichtig, wenn man
 * den Code im Dunkeln auf dem Dach vom Etikett abliest und eintippt.
 */
export const CODE_ZEICHEN = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LAENGE = 6;

/** Präfix im QR-Code, damit auch die normale Handy-Kamera die App öffnen kann. */
export const QR_PRAEFIX = 'vorratsliste://kiste/';

export function erzeugeKistenCode(zufall: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < CODE_LAENGE; i++) {
    code += CODE_ZEICHEN[Math.floor(zufall() * CODE_ZEICHEN.length) % CODE_ZEICHEN.length];
  }
  return code;
}

/** Macht aus einer Eingabe wie „ k7q-f3m “ den gespeicherten Code „K7QF3M“; sonst null. */
export function normalisiereCode(eingabe: string): string | null {
  const code = eingabe.toUpperCase().replace(/[\s-]/g, '');
  if (code.length !== CODE_LAENGE) return null;
  for (const z of code) if (!CODE_ZEICHEN.includes(z)) return null;
  return code;
}

export function qrInhalt(code: string): string {
  return QR_PRAEFIX + code;
}

/**
 * Liest einen gescannten QR-Code. Akzeptiert unseren Link
 * („vorratsliste://kiste/K7QF3M“) und den nackten Code. Fremde QR-Codes → null.
 */
export function codeAusQr(daten: string): string | null {
  const text = daten.trim();
  if (text.toLowerCase().startsWith(QR_PRAEFIX)) {
    return normalisiereCode(text.slice(QR_PRAEFIX.length).split(/[/?#]/)[0] ?? '');
  }
  if (text.includes(':') || text.includes('/')) return null;
  return normalisiereCode(text);
}

/** Für die Anzeige: „K7Q F3M“ liest sich leichter als „K7QF3M“. */
export function codeAnzeige(code: string): string {
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}
