import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { strToU8, zipSync } from 'fflate';

import { migriere } from '@/db/datenbank';
import { gegenstaendeDerKiste, legeGegenstandAn } from '@/db/gegenstaende';
import { alleKisten, kisteNachCode, legeKisteAn } from '@/db/kisten';
import { testDb } from '@/db/test-db';

import {
  entpackeSicherung,
  fotosDerSicherung,
  leseSicherungsdaten,
  packeSicherung,
  sicherungDateiname,
  SicherungFehler,
  spieleSicherungEin,
  verwendeteFotos,
  type SicherungDaten,
} from './sicherung';

const jpg = (n: number) => new Uint8Array([0xff, 0xd8, n, n, 0xff, 0xd9]);
const zeit = (iso: string) => () => new Date(iso);

async function befuellteDb() {
  const db = testDb();
  await migriere(db);
  const winter = await legeKisteAn(
    db,
    { titel: 'Winterkleidung', standort: 'Dach', beschreibung: 'Kinder', foto: 'kiste1.jpg' },
    () => 'ABC234',
    zeit('2026-01-01T10:00:00Z'),
  );
  await legeGegenstandAn(db, winter.id, { name: 'Winterjacke', beschreibung: 'Gr. 116', menge: 1, foto: 'jacke.jpg' });
  await legeGegenstandAn(db, winter.id, { name: 'Socken', beschreibung: '', menge: 3, foto: null });
  await legeKisteAn(
    db,
    { titel: 'Werkzeug', standort: 'Keller', beschreibung: '', foto: null },
    () => 'XYZ789',
    zeit('2026-02-01T10:00:00Z'),
  );
  return db;
}

function alsZip(daten: unknown, extra: Record<string, Uint8Array> = {}) {
  return zipSync({ 'daten.json': strToU8(JSON.stringify(daten)), ...extra });
}

let quelle: Awaited<ReturnType<typeof befuellteDb>>;
let daten: SicherungDaten;

beforeEach(async () => {
  quelle = await befuellteDb();
  daten = await leseSicherungsdaten(quelle, '0.1.0', zeit('2026-10-26T12:00:00Z'));
});

describe('Sicherung erstellen', () => {
  it('enthält alle Kisten mit Gegenständen, Menge und Fotos', () => {
    assert.equal(daten.format, 'inspacktor-sicherung');
    assert.equal(daten.erstelltAm, '2026-10-26T12:00:00.000Z');
    assert.equal(daten.appVersion, '0.1.0');
    assert.deepEqual(daten.kisten.map((k) => k.code), ['ABC234', 'XYZ789']);
    assert.deepEqual(
      daten.kisten[0]?.gegenstaende.map((g) => [g.name, g.menge, g.foto]),
      [
        ['Winterjacke', 1, 'jacke.jpg'],
        ['Socken', 3, null],
      ],
    );
    assert.deepEqual(fotosDerSicherung(daten).sort(), ['jacke.jpg', 'kiste1.jpg']);
  });

  it('benennt die Datei mit Datum', () => {
    assert.equal(sicherungDateiname(new Date(2026, 9, 6)), 'Inspacktor-Sicherung-2026-10-06.zip');
  });
});

describe('Sichern und Wiederherstellen', () => {
  it('ergibt auf einem leeren Gerät exakt dieselben Daten', async () => {
    const fotos = new Map([
      ['kiste1.jpg', jpg(1)],
      ['jacke.jpg', jpg(2)],
    ]);
    const gelesen = entpackeSicherung(packeSicherung(daten, fotos));
    assert.deepEqual(gelesen.fotos.get('jacke.jpg'), jpg(2));

    const ziel = testDb();
    await migriere(ziel);
    const zuordnung = new Map([...gelesen.fotos.keys()].map((n) => [n, `neu-${n}`]));
    const ergebnis = await spieleSicherungEin(ziel, gelesen.daten, 'ersetzen', zuordnung);
    assert.deepEqual(ergebnis, { kisten: 2, gegenstaende: 2, uebersprungen: 0 });

    const wieder = await leseSicherungsdaten(ziel, '0.1.0', zeit('2026-10-26T12:00:00Z'));
    // Nur die Fotonamen dürfen sich unterscheiden – sie werden beim Einspielen neu vergeben.
    const ohneFotos = (d: SicherungDaten) =>
      d.kisten.map((k) => ({ ...k, foto: !!k.foto, gegenstaende: k.gegenstaende.map((g) => ({ ...g, foto: !!g.foto })) }));
    assert.deepEqual(ohneFotos(wieder), ohneFotos(daten));
    assert.equal((await kisteNachCode(ziel, 'ABC234'))?.foto, 'neu-kiste1.jpg');
    assert.deepEqual(await verwendeteFotos(ziel), new Set(['neu-kiste1.jpg', 'neu-jacke.jpg']));
  });

  it('ersetzt beim Ersetzen alle vorhandenen Kisten', async () => {
    const ziel = testDb();
    await migriere(ziel);
    await legeKisteAn(ziel, { titel: 'Alt', standort: '', beschreibung: '', foto: null }, () => 'MNP234');
    await spieleSicherungEin(ziel, daten, 'ersetzen', new Map());
    assert.deepEqual((await alleKisten(ziel)).map((k) => k.code).sort(), ['ABC234', 'XYZ789']);
  });

  it('ergänzt nur Kisten mit neuem Code und lässt vorhandene unverändert', async () => {
    const ziel = testDb();
    await migriere(ziel);
    await legeKisteAn(ziel, { titel: 'Meine Version', standort: '', beschreibung: '', foto: null }, () => 'ABC234');
    const ergebnis = await spieleSicherungEin(ziel, daten, 'ergaenzen', new Map());
    assert.deepEqual(ergebnis, { kisten: 1, gegenstaende: 0, uebersprungen: 1 });
    assert.equal((await kisteNachCode(ziel, 'ABC234'))?.titel, 'Meine Version');
    assert.equal((await kisteNachCode(ziel, 'XYZ789'))?.titel, 'Werkzeug');
  });

  it('übernimmt nichts, wenn mittendrin ein Fehler passiert', async () => {
    const ziel = testDb();
    await migriere(ziel);
    await legeKisteAn(ziel, { titel: 'Bleibt', standort: '', beschreibung: '', foto: null }, () => 'MNP234');
    const kaputt = structuredClone(daten);
    // Ein Gegenstand ohne Namen verletzt NOT NULL erst in der Datenbank.
    (kaputt.kisten[1] as { gegenstaende: unknown[] }).gegenstaende.push({
      name: null,
      beschreibung: '',
      menge: 1,
      foto: null,
      erstelltAm: 'x',
      geaendertAm: 'x',
    });
    await assert.rejects(spieleSicherungEin(ziel, kaputt, 'ersetzen', new Map()));
    assert.deepEqual((await alleKisten(ziel)).map((k) => k.titel), ['Bleibt']);
  });

  it('entfernt Verweise auf Fotos, die in der Datei fehlen', () => {
    const gelesen = entpackeSicherung(packeSicherung(daten, new Map([['jacke.jpg', jpg(2)]])));
    assert.equal(gelesen.daten.kisten[0]?.foto, null);
    assert.equal(gelesen.daten.kisten[0]?.gegenstaende[0]?.foto, 'jacke.jpg');
  });
});

describe('Ungültige Sicherungen', () => {
  const meldung = (bytes: Uint8Array) => {
    try {
      entpackeSicherung(bytes);
    } catch (fehler) {
      assert.ok(fehler instanceof SicherungFehler, String(fehler));
      return fehler.message;
    }
    assert.fail('kein Fehler');
  };

  it('erkennt Dateien, die kein ZIP sind', () => {
    assert.match(meldung(strToU8('hallo')), /kein ZIP/);
  });

  it('erkennt ZIPs ohne daten.json', () => {
    assert.match(meldung(zipSync({ 'foto.jpg': jpg(1) })), /daten\.json/);
  });

  it('erkennt beschädigtes JSON', () => {
    assert.match(meldung(zipSync({ 'daten.json': strToU8('{kaputt') })), /beschädigt/);
  });

  it('liest Sicherungen aus der Zeit als „Vorratsliste“', () => {
    const alt = entpackeSicherung(alsZip({ ...daten, format: 'vorratsliste-sicherung' }));
    assert.equal(alt.daten.format, 'inspacktor-sicherung');
    assert.equal(alt.daten.kisten.length, 2);
  });

  it('meldet Sicherungen aus einer neueren App-Version verständlich', () => {
    assert.match(meldung(alsZip({ ...daten, version: 2 })), /neueren App-Version/);
  });

  it('lehnt fremde Formate und Fotonamen mit Pfadangaben ab', () => {
    assert.match(meldung(alsZip({ ...daten, format: 'etwas-anderes' })), /ungültig/);
    const boese = structuredClone(daten);
    boese.kisten[0]!.foto = '../../datenbank.db';
    assert.match(meldung(alsZip(boese)), /Fotoname/);
  });

  it('lehnt doppelte Kisten-Codes ab', () => {
    const doppelt = { ...daten, kisten: [daten.kisten[0], daten.kisten[0]] };
    assert.match(meldung(alsZip(doppelt)), /doppelt/);
  });
});

describe('Datenbank nach dem Einspielen', () => {
  it('ordnet Gegenstände der richtigen Kiste zu', async () => {
    const ziel = testDb();
    await migriere(ziel);
    await legeKisteAn(ziel, { titel: 'Erst', standort: '', beschreibung: '', foto: null }, () => 'MNP234');
    await spieleSicherungEin(ziel, daten, 'ergaenzen', new Map());
    const winter = await kisteNachCode(ziel, 'ABC234');
    assert.ok(winter);
    assert.deepEqual((await gegenstaendeDerKiste(ziel, winter.id)).map((g) => g.name), ['Winterjacke', 'Socken']);
  });
});
