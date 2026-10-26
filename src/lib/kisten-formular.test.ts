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
    assert.deepEqual(gegenstandFormularSchema.parse({ name: ' Jacke ', beschreibung: ' Gr. 116 ' }), {
      name: 'Jacke',
      beschreibung: 'Gr. 116',
    });
    const r = gegenstandFormularSchema.safeParse({ name: ' ', beschreibung: '' });
    assert.equal(r.error?.issues[0]?.message, 'Bitte gib dem Gegenstand einen Namen.');
  });
});
