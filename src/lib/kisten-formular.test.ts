import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { gegenstandFormularSchema, kistenFormularSchema } from './kisten-formular';

describe('Kisten-Formular', () => {
  it('schneidet Leerzeichen ab', () => {
    const r = kistenFormularSchema.parse({ titel: '  Deko ', standort: ' Dach ', beschreibung: ' Kugeln\n' });
    assert.deepEqual(r, { titel: 'Deko', standort: 'Dach', beschreibung: 'Kugeln' });
  });

  it('verlangt einen Titel, auch wenn nur Leerzeichen eingegeben sind', () => {
    const r = kistenFormularSchema.safeParse({ titel: '   ', standort: '', beschreibung: '' });
    assert.equal(r.success, false);
    assert.equal(r.error?.issues[0]?.message, 'Bitte gib der Kiste einen Titel.');
  });

  it('begrenzt die Länge', () => {
    const r = kistenFormularSchema.safeParse({ titel: 'x'.repeat(81), standort: '', beschreibung: '' });
    assert.equal(r.success, false);
  });
});

describe('Gegenstand-Formular', () => {
  it('verlangt einen Namen und schneidet Leerzeichen ab', () => {
    assert.deepEqual(gegenstandFormularSchema.parse({ name: ' Jacke ', beschreibung: ' Gr. 116 ', menge: 2 }), {
      name: 'Jacke',
      beschreibung: 'Gr. 116',
      menge: 2,
    });
    const r = gegenstandFormularSchema.safeParse({ name: ' ', beschreibung: '', menge: 1 });
    assert.equal(r.error?.issues[0]?.message, 'Bitte gib dem Gegenstand einen Namen.');
  });

  it('verlangt eine Menge von 1 bis 999', () => {
    const fehler = (menge: number) =>
      gegenstandFormularSchema.safeParse({ name: 'x', beschreibung: '', menge }).error?.issues[0]?.message;
    assert.equal(fehler(0), 'Die Menge muss mindestens 1 sein.');
    assert.equal(fehler(1000), 'Die Menge darf höchstens 999 sein.');
    assert.equal(fehler(1.5), 'Bitte eine ganze Zahl eingeben.');
    assert.equal(fehler(999), undefined);
  });
});
