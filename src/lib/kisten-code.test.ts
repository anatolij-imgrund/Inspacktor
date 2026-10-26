import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CODE_LAENGE,
  CODE_ZEICHEN,
  codeAnzeige,
  codeAusQr,
  erzeugeKistenCode,
  normalisiereCode,
  qrInhalt,
} from './kisten-code';

describe('Kisten-Code', () => {
  it('erzeugt Codes mit fester Länge nur aus erlaubten Zeichen', () => {
    for (let i = 0; i < 500; i++) {
      const code = erzeugeKistenCode();
      assert.equal(code.length, CODE_LAENGE);
      for (const z of code) assert.ok(CODE_ZEICHEN.includes(z), `unerlaubtes Zeichen ${z}`);
    }
  });

  it('bleibt auch bei Zufallswert knapp unter 1 im Alphabet', () => {
    assert.equal(erzeugeKistenCode(() => 0.999999999), '999999');
    assert.equal(erzeugeKistenCode(() => 0), 'AAAAAA');
  });

  it('enthält keine verwechselbaren Zeichen', () => {
    for (const z of '01OIL') assert.ok(!CODE_ZEICHEN.includes(z));
  });

  it('normalisiert Eingaben mit Leerzeichen, Bindestrich und Kleinbuchstaben', () => {
    assert.equal(normalisiereCode(' k7q-f3m '), 'K7QF3M');
    assert.equal(normalisiereCode('K7Q F3M'), 'K7QF3M');
  });

  it('lehnt falsche Länge und verwechselbare Zeichen ab', () => {
    assert.equal(normalisiereCode('K7QF3'), null);
    assert.equal(normalisiereCode('K7QF3MM'), null);
    assert.equal(normalisiereCode('K0QF3M'), null);
    assert.equal(normalisiereCode('KOQF3M'), null);
  });

  it('liest unseren QR-Link und den nackten Code', () => {
    assert.equal(codeAusQr(qrInhalt('K7QF3M')), 'K7QF3M');
    assert.equal(codeAusQr('INSPACKTOR://kiste/k7qf3m'), 'K7QF3M');
    assert.equal(codeAusQr('inspacktor://kiste/K7QF3M?x=1'), 'K7QF3M');
  });

  it('erzeugt neue Etiketten mit inspacktor://', () => {
    assert.equal(qrInhalt('K7QF3M'), 'inspacktor://kiste/K7QF3M');
  });

  it('liest weiterhin Etiketten aus der Zeit als „Vorratsliste“', () => {
    assert.equal(codeAusQr('vorratsliste://kiste/K7QF3M'), 'K7QF3M');
    assert.equal(codeAusQr('VORRATSLISTE://kiste/k7qf3m'), 'K7QF3M');
    assert.equal(codeAusQr('K7QF3M'), 'K7QF3M');
  });

  it('ignoriert fremde QR-Codes', () => {
    assert.equal(codeAusQr('https://example.com/K7QF3M'), null);
    assert.equal(codeAusQr('WIFI:S:Heim;T:WPA;P:geheim;;'), null);
    assert.equal(codeAusQr(''), null);
  });

  it('zeigt den Code in zwei Dreiergruppen', () => {
    assert.equal(codeAnzeige('K7QF3M'), 'K7Q F3M');
  });
});
