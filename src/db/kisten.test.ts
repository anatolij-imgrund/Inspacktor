import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { migriere, SCHEMA_VERSION } from './datenbank';
import {
  aktualisiereKiste,
  alleKisten,
  filtereKisten,
  kisteNachCode,
  legeKisteAn,
  loescheKiste,
  standorte,
  type KistenDaten,
} from './kisten';
import { testDb } from './test-db';

const daten = (titel: string, standort = '', beschreibung = ''): KistenDaten => ({
  titel,
  standort,
  beschreibung,
  foto: null,
});

function folge(...codes: string[]) {
  let i = 0;
  return () => codes[i++] ?? 'ZZZZZZ';
}

let db: ReturnType<typeof testDb>;

beforeEach(async () => {
  db = testDb();
  await migriere(db);
});

describe('Migration', () => {
  it('setzt die Schema-Version und ist wiederholbar', async () => {
    await migriere(db);
    const z = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    assert.equal(z?.user_version, SCHEMA_VERSION);
  });

  it('verweigert eine Datenbank aus einer neueren App-Version', async () => {
    await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION + 1}`);
    await assert.rejects(migriere(db), /neuer/);
  });
});

describe('Kisten', () => {
  it('legt eine Kiste an und findet sie über den Code', async () => {
    const k = await legeKisteAn(db, daten('Weihnachtsdeko', 'Dach', 'Lichterketten, Kugeln'), folge('ABC234'));
    assert.equal(k.code, 'ABC234');
    assert.equal(k.titel, 'Weihnachtsdeko');
    assert.equal(k.foto, null);
    const gefunden = await kisteNachCode(db, 'ABC234');
    assert.deepEqual(gefunden, k);
  });

  it('würfelt bei einem schon vergebenen Code neu', async () => {
    await legeKisteAn(db, daten('Erste'), folge('ABC234'));
    const zweite = await legeKisteAn(db, daten('Zweite'), folge('ABC234', 'XYZ789'));
    assert.equal(zweite.code, 'XYZ789');
  });

  it('gibt auf, wenn nie ein freier Code kommt', async () => {
    await legeKisteAn(db, daten('Erste'), folge('ABC234'));
    await assert.rejects(legeKisteAn(db, daten('Zweite'), () => 'ABC234'), /freier/);
  });

  it('aktualisiert Inhalt und Änderungszeit', async () => {
    const k = await legeKisteAn(db, daten('Alt'), folge('ABC234'), () => new Date('2026-01-01T10:00:00Z'));
    await aktualisiereKiste(
      db,
      k.code,
      { ...daten('Neu', 'Keller', 'Werkzeug'), foto: 'f.jpg' },
      () => new Date('2026-02-01T10:00:00Z'),
    );
    const neu = await kisteNachCode(db, k.code);
    assert.equal(neu?.titel, 'Neu');
    assert.equal(neu?.standort, 'Keller');
    assert.equal(neu?.foto, 'f.jpg');
    assert.equal(neu?.erstelltAm, '2026-01-01T10:00:00.000Z');
    assert.equal(neu?.geaendertAm, '2026-02-01T10:00:00.000Z');
  });

  it('meldet beim Aktualisieren eine unbekannte Kiste', async () => {
    await assert.rejects(aktualisiereKiste(db, 'NICHTS', daten('x')), /nicht gefunden/);
  });

  it('löscht eine Kiste', async () => {
    await legeKisteAn(db, daten('Weg'), folge('ABC234'));
    await loescheKiste(db, 'ABC234');
    assert.equal(await kisteNachCode(db, 'ABC234'), null);
  });

  it('listet zuletzt geänderte Kisten zuerst', async () => {
    await legeKisteAn(db, daten('Alt'), folge('AAAAAA'), () => new Date('2026-01-01'));
    await legeKisteAn(db, daten('Neu'), folge('BBBBBB'), () => new Date('2026-03-01'));
    await legeKisteAn(db, daten('Mitte'), folge('CCCCCC'), () => new Date('2026-02-01'));
    assert.deepEqual(
      (await alleKisten(db)).map((k) => k.titel),
      ['Neu', 'Mitte', 'Alt'],
    );
  });

  it('liefert Standorte nach Häufigkeit ohne leere Einträge', async () => {
    await legeKisteAn(db, daten('a', 'Keller'), folge('AAAAAA'));
    await legeKisteAn(db, daten('b', 'Dach'), folge('BBBBBB'));
    await legeKisteAn(db, daten('c', 'Dach'), folge('CCCCCC'));
    await legeKisteAn(db, daten('d', ''), folge('DDDDDD'));
    assert.deepEqual(await standorte(db), ['Dach', 'Keller']);
  });
});

describe('Suche', () => {
  const kisten = [
    { titel: 'Winterkleidung', standort: 'Dach', beschreibung: 'Mützen, Schals', code: 'AAAAAA' },
    { titel: 'Werkzeug', standort: 'Keller', beschreibung: 'Bohrmaschine, Dübel', code: 'BBBBBB' },
    { titel: 'Äpfel-Gläser', standort: 'Speisekammer', beschreibung: '', code: 'CCCCCC' },
  ].map((k, i) => ({ ...k, id: i, foto: null, erstelltAm: '', geaendertAm: '' }));

  it('findet über Inhalt, Standort und Code', () => {
    assert.deepEqual(filtereKisten(kisten, 'dübel').map((k) => k.titel), ['Werkzeug']);
    assert.deepEqual(filtereKisten(kisten, 'DACH').map((k) => k.titel), ['Winterkleidung']);
    assert.deepEqual(filtereKisten(kisten, 'bbbbbb').map((k) => k.titel), ['Werkzeug']);
  });

  it('behandelt Umlaute unabhängig von Groß-/Kleinschreibung', () => {
    assert.deepEqual(filtereKisten(kisten, 'äpfel').map((k) => k.titel), ['Äpfel-Gläser']);
    assert.deepEqual(filtereKisten(kisten, 'MÜTZEN').map((k) => k.titel), ['Winterkleidung']);
  });

  it('verlangt bei mehreren Wörtern alle', () => {
    assert.deepEqual(filtereKisten(kisten, 'dach mützen').map((k) => k.titel), ['Winterkleidung']);
    assert.deepEqual(filtereKisten(kisten, 'dach dübel'), []);
  });

  it('gibt bei leerer Suche alles zurück', () => {
    assert.equal(filtereKisten(kisten, '   ').length, 3);
  });
});
