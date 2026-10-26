import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { migriere } from './datenbank';
import {
  aktualisiereGegenstand,
  gegenstaendeDerKiste,
  gegenstandNachId,
  legeGegenstandAn,
  loescheGegenstand,
} from './gegenstaende';
import { kisteNachCode, legeKisteAn, type Kiste } from './kisten';
import { testDb } from './test-db';

let db: ReturnType<typeof testDb>;
let kiste: Kiste;
const zeit = (iso: string) => () => new Date(iso);

beforeEach(async () => {
  db = testDb();
  await migriere(db);
  kiste = await legeKisteAn(
    db,
    { titel: 'Winterkleidung', standort: 'Dach', beschreibung: 'Kinder', foto: null },
    () => 'ABC234',
    zeit('2026-01-01T00:00:00Z'),
  );
});

describe('Gegenstände', () => {
  it('legt Gegenstände an und listet sie in Einpack-Reihenfolge', async () => {
    await legeGegenstandAn(db, kiste.id, { name: 'Winterjacke', beschreibung: 'Gr. 116', foto: 'j.jpg' });
    await legeGegenstandAn(db, kiste.id, { name: 'Mütze', beschreibung: '', foto: null });
    const liste = await gegenstaendeDerKiste(db, kiste.id);
    assert.deepEqual(liste.map((g) => g.name), ['Winterjacke', 'Mütze']);
    assert.equal(liste[0]?.beschreibung, 'Gr. 116');
    assert.equal(liste[0]?.foto, 'j.jpg');
    assert.equal(liste[0]?.kisteId, kiste.id);
  });

  it('lehnt Gegenstände für eine unbekannte Kiste ab', async () => {
    await assert.rejects(legeGegenstandAn(db, 9999, { name: 'x', beschreibung: '', foto: null }), /Kiste nicht gefunden/);
  });

  it('bearbeitet einen Gegenstand', async () => {
    const g = await legeGegenstandAn(db, kiste.id, { name: 'Jacke', beschreibung: '', foto: null });
    await aktualisiereGegenstand(db, g.id, { name: 'Winterjacke', beschreibung: 'Gr. 122', foto: 'neu.jpg' });
    const neu = await gegenstandNachId(db, g.id);
    assert.equal(neu?.name, 'Winterjacke');
    assert.equal(neu?.beschreibung, 'Gr. 122');
    assert.equal(neu?.foto, 'neu.jpg');
  });

  it('meldet beim Bearbeiten einen unbekannten Gegenstand', async () => {
    await assert.rejects(aktualisiereGegenstand(db, 9999, { name: 'x', beschreibung: '', foto: null }), /nicht gefunden/);
  });

  it('löscht einen Gegenstand und gibt sein Foto zurück', async () => {
    const g = await legeGegenstandAn(db, kiste.id, { name: 'Jacke', beschreibung: '', foto: 'j.jpg' });
    assert.equal(await loescheGegenstand(db, g.id), 'j.jpg');
    assert.equal(await gegenstandNachId(db, g.id), null);
    assert.equal(await loescheGegenstand(db, g.id), null);
  });

  it('setzt bei jeder Inhaltsänderung die Änderungszeit der Kiste', async () => {
    const g = await legeGegenstandAn(
      db,
      kiste.id,
      { name: 'Jacke', beschreibung: '', foto: null },
      zeit('2026-02-01T00:00:00Z'),
    );
    assert.equal((await kisteNachCode(db, 'ABC234'))?.geaendertAm, '2026-02-01T00:00:00.000Z');
    await aktualisiereGegenstand(db, g.id, { name: 'Jacke 2', beschreibung: '', foto: null }, zeit('2026-03-01T00:00:00Z'));
    assert.equal((await kisteNachCode(db, 'ABC234'))?.geaendertAm, '2026-03-01T00:00:00.000Z');
    await loescheGegenstand(db, g.id, zeit('2026-04-01T00:00:00Z'));
    assert.equal((await kisteNachCode(db, 'ABC234'))?.geaendertAm, '2026-04-01T00:00:00.000Z');
  });

  it('übernimmt eine Datenbank aus Version 1 mit ihren Kisten', async () => {
    const alt = testDb();
    // Stand von Patch 0002: nur die Kisten-Tabelle, user_version 1.
    await alt.execAsync(`CREATE TABLE kisten (
      id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, titel TEXT NOT NULL,
      standort TEXT NOT NULL DEFAULT '', beschreibung TEXT NOT NULL DEFAULT '', foto TEXT,
      erstellt_am TEXT NOT NULL, geaendert_am TEXT NOT NULL);
      INSERT INTO kisten (code, titel, erstellt_am, geaendert_am) VALUES ('ALT234', 'Alte Kiste', 'x', 'x');
      PRAGMA user_version = 1;`);
    await migriere(alt);
    const k = await kisteNachCode(alt, 'ALT234');
    assert.ok(k);
    assert.equal(k.titel, 'Alte Kiste');
    await legeGegenstandAn(alt, k.id, { name: 'Neu', beschreibung: '', foto: null });
    assert.equal((await gegenstaendeDerKiste(alt, k.id)).length, 1);
  });
});
