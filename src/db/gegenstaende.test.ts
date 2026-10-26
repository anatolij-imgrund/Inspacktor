import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { migriere } from './datenbank';
import {
  aktualisiereGegenstand,
  gegenstaendeDerKiste,
  gegenstandNachId,
  legeGegenstandAn,
  loescheGegenstand,
  verschiebeGegenstand,
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
    await legeGegenstandAn(db, kiste.id, { name: 'Winterjacke', beschreibung: 'Gr. 116', menge: 1, foto: 'j.jpg' });
    await legeGegenstandAn(db, kiste.id, { name: 'Mütze', beschreibung: '', menge: 1, foto: null });
    const liste = await gegenstaendeDerKiste(db, kiste.id);
    assert.deepEqual(liste.map((g) => g.name), ['Winterjacke', 'Mütze']);
    assert.equal(liste[0]?.beschreibung, 'Gr. 116');
    assert.equal(liste[0]?.foto, 'j.jpg');
    assert.equal(liste[0]?.kisteId, kiste.id);
  });

  it('lehnt Gegenstände für eine unbekannte Kiste ab', async () => {
    await assert.rejects(legeGegenstandAn(db, 9999, { name: 'x', beschreibung: '', menge: 1, foto: null }), /Kiste nicht gefunden/);
  });

  it('bearbeitet einen Gegenstand', async () => {
    const g = await legeGegenstandAn(db, kiste.id, { name: 'Jacke', beschreibung: '', menge: 1, foto: null });
    await aktualisiereGegenstand(db, g.id, { name: 'Winterjacke', beschreibung: 'Gr. 122', menge: 1, foto: 'neu.jpg' });
    const neu = await gegenstandNachId(db, g.id);
    assert.equal(neu?.name, 'Winterjacke');
    assert.equal(neu?.beschreibung, 'Gr. 122');
    assert.equal(neu?.foto, 'neu.jpg');
  });

  it('meldet beim Bearbeiten einen unbekannten Gegenstand', async () => {
    await assert.rejects(aktualisiereGegenstand(db, 9999, { name: 'x', beschreibung: '', menge: 1, foto: null }), /nicht gefunden/);
  });

  it('löscht einen Gegenstand und gibt sein Foto zurück', async () => {
    const g = await legeGegenstandAn(db, kiste.id, { name: 'Jacke', beschreibung: '', menge: 1, foto: 'j.jpg' });
    assert.equal(await loescheGegenstand(db, g.id), 'j.jpg');
    assert.equal(await gegenstandNachId(db, g.id), null);
    assert.equal(await loescheGegenstand(db, g.id), null);
  });

  it('setzt bei jeder Inhaltsänderung die Änderungszeit der Kiste', async () => {
    const g = await legeGegenstandAn(
      db,
      kiste.id,
      { name: 'Jacke', beschreibung: '', menge: 1, foto: null },
      zeit('2026-02-01T00:00:00Z'),
    );
    assert.equal((await kisteNachCode(db, 'ABC234'))?.geaendertAm, '2026-02-01T00:00:00.000Z');
    await aktualisiereGegenstand(db, g.id, { name: 'Jacke 2', beschreibung: '', menge: 1, foto: null }, zeit('2026-03-01T00:00:00Z'));
    assert.equal((await kisteNachCode(db, 'ABC234'))?.geaendertAm, '2026-03-01T00:00:00.000Z');
    await loescheGegenstand(db, g.id, zeit('2026-04-01T00:00:00Z'));
    assert.equal((await kisteNachCode(db, 'ABC234'))?.geaendertAm, '2026-04-01T00:00:00.000Z');
  });

  it('speichert und ändert die Menge', async () => {
    const g = await legeGegenstandAn(db, kiste.id, { name: 'Socken', beschreibung: '', menge: 3, foto: null });
    assert.equal(g.menge, 3);
    await aktualisiereGegenstand(db, g.id, { name: 'Socken', beschreibung: '', menge: 5, foto: null });
    assert.equal((await gegenstandNachId(db, g.id))?.menge, 5);
  });

  it('verschiebt einen Gegenstand in eine andere Kiste', async () => {
    const ziel = await legeKisteAn(db, { titel: 'Neue Kiste', standort: '', beschreibung: '', foto: null }, () => 'XYZ789');
    const g = await legeGegenstandAn(db, kiste.id, { name: 'Jacke', beschreibung: '', menge: 1, foto: 'j.jpg' });
    await verschiebeGegenstand(db, g.id, ziel.id, zeit('2026-05-01T00:00:00Z'));
    assert.deepEqual(await gegenstaendeDerKiste(db, kiste.id), []);
    const drin = await gegenstaendeDerKiste(db, ziel.id);
    assert.deepEqual(drin.map((x) => [x.name, x.foto]), [['Jacke', 'j.jpg']]);
    // Beide Kisten rutschen in der Übersicht nach oben.
    assert.equal((await kisteNachCode(db, 'ABC234'))?.geaendertAm, '2026-05-01T00:00:00.000Z');
    assert.equal((await kisteNachCode(db, 'XYZ789'))?.geaendertAm, '2026-05-01T00:00:00.000Z');
  });

  it('verweigert das Verschieben in eine unbekannte Kiste', async () => {
    const g = await legeGegenstandAn(db, kiste.id, { name: 'Jacke', beschreibung: '', menge: 1, foto: null });
    await assert.rejects(verschiebeGegenstand(db, g.id, 9999), /Zielkiste nicht gefunden/);
    await assert.rejects(verschiebeGegenstand(db, 9999, kiste.id), /Gegenstand nicht gefunden/);
    assert.equal((await gegenstaendeDerKiste(db, kiste.id)).length, 1);
  });

  it('gibt Gegenständen aus Version 2 die Menge 1', async () => {
    const alt = testDb();
    await alt.execAsync(`CREATE TABLE kisten (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE,
      titel TEXT NOT NULL, standort TEXT NOT NULL DEFAULT '', beschreibung TEXT NOT NULL DEFAULT '', foto TEXT,
      erstellt_am TEXT NOT NULL, geaendert_am TEXT NOT NULL);
      CREATE TABLE gegenstaende (id INTEGER PRIMARY KEY AUTOINCREMENT,
      kiste_id INTEGER NOT NULL REFERENCES kisten(id) ON DELETE CASCADE, name TEXT NOT NULL,
      beschreibung TEXT NOT NULL DEFAULT '', foto TEXT, erstellt_am TEXT NOT NULL, geaendert_am TEXT NOT NULL);
      INSERT INTO kisten (code, titel, erstellt_am, geaendert_am) VALUES ('ALT234', 'Alt', 'x', 'x');
      INSERT INTO gegenstaende (kiste_id, name, erstellt_am, geaendert_am) VALUES (1, 'Mütze', 'x', 'x');
      PRAGMA user_version = 2;`);
    await migriere(alt);
    assert.equal((await gegenstaendeDerKiste(alt, 1))[0]?.menge, 1);
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
    await legeGegenstandAn(alt, k.id, { name: 'Neu', beschreibung: '', menge: 1, foto: null });
    assert.equal((await gegenstaendeDerKiste(alt, k.id)).length, 1);
  });
});
