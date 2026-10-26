import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import jsQR from 'jsqr';

import { codeAusQr, erzeugeKistenCode, qrInhalt } from './kisten-code';
import { qrGroesse, qrMatrix, qrPfad, qrSvg, RUHEZONE, type QrMatrix } from './qr';

/** Malt den Pfad wie ein Drucker auf ein Pixelbild – so prüfen wir genau das, was später gedruckt wird. */
function pfadAlsBild(matrix: QrMatrix, skala = 4) {
  const g = qrGroesse(matrix);
  const breite = g * skala;
  const pixel = new Uint8ClampedArray(breite * breite * 4).fill(255);
  for (const [, x, y, w] of qrPfad(matrix).matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) {
    for (let dx = 0; dx < Number(w); dx++) {
      for (let py = 0; py < skala; py++) {
        for (let px = 0; px < skala; px++) {
          const i = (((Number(y) * skala + py) * breite) + (Number(x) + dx) * skala + px) * 4;
          pixel[i] = pixel[i + 1] = pixel[i + 2] = 0;
        }
      }
    }
  }
  return { pixel, breite };
}

describe('QR-Code', () => {
  it('ist quadratisch', () => {
    const m = qrMatrix(qrInhalt('K7QF3M'));
    assert.ok(m.length >= 21);
    for (const zeile of m) assert.equal(zeile.length, m.length);
  });

  it('bleibt klein genug für ein Etikett (Version ≤ 3, also ≤ 29 Module)', () => {
    assert.ok(qrMatrix(qrInhalt('K7QF3M')).length <= 29);
  });

  it('zeichnet genau die dunklen Module', () => {
    const m = qrMatrix(qrInhalt('ABC234'));
    const dunkel = m.flat().filter(Boolean).length;
    const flaeche = [...qrPfad(m).matchAll(/h(\d+)v1/g)].reduce((s, t) => s + Number(t[1]), 0);
    assert.equal(flaeche, dunkel);
  });

  it('lässt rundum die Ruhezone frei', () => {
    const m = qrMatrix(qrInhalt('ABC234'));
    for (const [, x, y] of qrPfad(m).matchAll(/M(\d+) (\d+)/g)) {
      assert.ok(Number(x) >= RUHEZONE && Number(y) >= RUHEZONE);
      assert.ok(Number(y) < m.length + RUHEZONE);
    }
  });

  it('lässt sich wieder einlesen und ergibt denselben Kisten-Code', () => {
    for (let i = 0; i < 25; i++) {
      const code = erzeugeKistenCode();
      const { pixel, breite } = pfadAlsBild(qrMatrix(qrInhalt(code)));
      const gelesen = jsQR(pixel, breite, breite);
      assert.ok(gelesen, `QR für ${code} nicht lesbar`);
      assert.equal(codeAusQr(gelesen.data), code);
    }
  });

  it('liefert ein vollständiges SVG mit weißem Hintergrund', () => {
    const svg = qrSvg(qrInhalt('ABC234'));
    assert.match(svg, /^<svg [^>]*viewBox="0 0 \d+ \d+"/);
    assert.match(svg, /<rect [^>]*fill="#fff"/);
    assert.match(svg, /<\/svg>$/);
  });
});
