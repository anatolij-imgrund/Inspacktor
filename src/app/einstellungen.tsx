import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Constants from 'expo-constants';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Knopf } from '@/components/knopf';
import { fotoOrdnerGroesse } from '@/lib/fotos';
import { SicherungFehler, type EinspielModus } from '@/lib/sicherung';
import {
  sicherungAuswaehlen,
  sicherungEinspielen,
  sicherungSpeichern,
  sicherungTeilen,
  type GeleseneSicherung,
} from '@/lib/sicherung-ausgabe';
import { ABSTAND, RADIUS, useFarben } from '@/theme/farben';

type Bestand = { kisten: number; gegenstaende: number; fotoBytes: number };
type Laeuft = 'speichern' | 'teilen' | 'wiederherstellen' | null;

function megabyte(bytes: number): string {
  return `${(bytes / 1024 / 1024).toLocaleString('de-DE', { maximumFractionDigits: 1 })} MB`;
}

function anzahl(n: number, eins: string, viele: string): string {
  return `${n} ${n === 1 ? eins : viele}`;
}

export default function Einstellungen() {
  const db = useSQLiteContext();
  const f = useFarben();
  const unten = useSafeAreaInsets().bottom;
  const [bestand, setBestand] = useState<Bestand | null>(null);
  const [laeuft, setLaeuft] = useState<Laeuft>(null);

  const ladeBestand = useCallback(async () => {
    const z = await db.getFirstAsync<{ kisten: number; gegenstaende: number }>(
      'SELECT (SELECT COUNT(*) FROM kisten) AS kisten, (SELECT COUNT(*) FROM gegenstaende) AS gegenstaende',
    );
    let fotoBytes = 0;
    try {
      fotoBytes = fotoOrdnerGroesse();
    } catch {
      // Größe ist nur ein Hinweis
    }
    setBestand({ kisten: z?.kisten ?? 0, gegenstaende: z?.gegenstaende ?? 0, fotoBytes });
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void ladeBestand();
    }, [ladeBestand]),
  );

  async function mitFehlerAnzeige(art: Exclude<Laeuft, null>, aufgabe: () => Promise<void>) {
    setLaeuft(art);
    try {
      await aufgabe();
    } catch (fehler) {
      const text = fehler instanceof Error ? fehler.message : String(fehler);
      if (!/cancel|abgebrochen/i.test(text)) Alert.alert('Das hat nicht geklappt', text);
    } finally {
      setLaeuft(null);
    }
  }

  function speichern() {
    void mitFehlerAnzeige('speichern', async () => {
      const ergebnis = await sicherungSpeichern(db);
      if (ergebnis) {
        Alert.alert(
          'Sicherung gespeichert',
          `„${ergebnis.name}“ mit ${anzahl(ergebnis.kisten, 'Kiste', 'Kisten')} liegt im gewählten Ordner.`,
        );
      }
    });
  }

  function teilen() {
    void mitFehlerAnzeige('teilen', () => sicherungTeilen(db));
  }

  function einspielen(sicherung: GeleseneSicherung, modus: EinspielModus) {
    void mitFehlerAnzeige('wiederherstellen', async () => {
      const e = await sicherungEinspielen(db, sicherung, modus);
      await ladeBestand();
      const teile = [
        `${anzahl(e.kisten, 'Kiste', 'Kisten')} und ${anzahl(e.gegenstaende, 'Gegenstand', 'Gegenstände')} übernommen.`,
      ];
      if (e.uebersprungen > 0) {
        teile.push(
          `${anzahl(e.uebersprungen, 'Kiste gab', 'Kisten gab')} es schon – ${e.uebersprungen === 1 ? 'sie wurde' : 'sie wurden'} nicht verändert.`,
        );
      }
      Alert.alert('Wiederhergestellt', teile.join('\n\n'));
    });
  }

  function wiederherstellen() {
    void mitFehlerAnzeige('wiederherstellen', async () => {
      let sicherung: GeleseneSicherung | null;
      try {
        sicherung = await sicherungAuswaehlen();
      } catch (fehler) {
        if (fehler instanceof SicherungFehler) {
          Alert.alert('Keine gültige Sicherung', fehler.message);
          return;
        }
        throw fehler;
      }
      if (!sicherung) return;

      const s = sicherung;
      const datum = new Date(s.daten.erstelltAm).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
      const gegenstaende = s.daten.kisten.reduce((n, k) => n + k.gegenstaende.length, 0);
      const inhalt = `Sicherung vom ${datum}:\n${anzahl(s.daten.kisten.length, 'Kiste', 'Kisten')}, ${anzahl(gegenstaende, 'Gegenstand', 'Gegenstände')}, ${anzahl(s.fotos.size, 'Foto', 'Fotos')}.`;

      if (!bestand || bestand.kisten === 0) {
        Alert.alert('Sicherung wiederherstellen?', inhalt, [
          { text: 'Abbrechen', style: 'cancel' },
          { text: 'Wiederherstellen', onPress: () => einspielen(s, 'ersetzen') },
        ]);
        return;
      }

      Alert.alert(
        'Wie wiederherstellen?',
        `${inhalt}\n\nErgänzen: nur Kisten übernehmen, die es hier noch nicht gibt.\n` +
          `Ersetzen: alle ${anzahl(bestand.kisten, 'Kiste', 'Kisten')} auf diesem Gerät löschen und durch die Sicherung ersetzen.`,
        [
          { text: 'Abbrechen', style: 'cancel' },
          { text: 'Ergänzen', onPress: () => einspielen(s, 'ergaenzen') },
          {
            text: 'Ersetzen',
            style: 'destructive',
            onPress: () =>
              Alert.alert(
                'Wirklich alles ersetzen?',
                `Alle ${anzahl(bestand.kisten, 'Kiste', 'Kisten')} auf diesem Gerät werden gelöscht. Das lässt sich nicht rückgängig machen.\n\nTipp: Vorher selbst eine Sicherung anlegen.`,
                [
                  { text: 'Abbrechen', style: 'cancel' },
                  { text: 'Ersetzen', style: 'destructive', onPress: () => einspielen(s, 'ersetzen') },
                ],
              ),
          },
        ],
      );
    });
  }

  const leer = !bestand || bestand.kisten === 0;
  const beschaeftigt = laeuft !== null;

  return (
    <ScrollView contentContainerStyle={[styles.inhalt, { paddingBottom: ABSTAND.l + unten }]}>
      <View style={[styles.karte, { backgroundColor: f.flaeche }]}>
        <View style={styles.kopf}>
          <MaterialCommunityIcons name="archive-arrow-down-outline" size={24} color={f.akzent} />
          <Text style={[styles.titel, { color: f.text }]}>Datensicherung</Text>
        </View>
        <Text style={[styles.text, { color: f.textLeise }]}>
          Deine Kisten sind nur auf diesem Handy gespeichert. Eine Sicherung packt alle Kisten, Gegenstände und Fotos
          in eine ZIP-Datei – leg sie z. B. in Google Drive ab oder schick sie dir per E-Mail.
        </Text>
        {bestand ? (
          <Text style={[styles.text, { color: f.text }]}>
            {anzahl(bestand.kisten, 'Kiste', 'Kisten')}, {anzahl(bestand.gegenstaende, 'Gegenstand', 'Gegenstände')}
            {bestand.fotoBytes > 0 ? ` · Fotos ca. ${megabyte(bestand.fotoBytes)}` : ''}
          </Text>
        ) : null}
        <Knopf
          titel="In Ordner speichern"
          icon="folder-download-outline"
          onPress={speichern}
          laedt={laeuft === 'speichern'}
          deaktiviert={leer || (beschaeftigt && laeuft !== 'speichern')}
        />
        <Knopf
          titel="Teilen (z. B. Google Drive)"
          icon="share-variant-outline"
          art="neben"
          onPress={teilen}
          laedt={laeuft === 'teilen'}
          deaktiviert={leer || (beschaeftigt && laeuft !== 'teilen')}
        />
      </View>

      <View style={[styles.karte, { backgroundColor: f.flaeche }]}>
        <View style={styles.kopf}>
          <MaterialCommunityIcons name="backup-restore" size={24} color={f.akzent} />
          <Text style={[styles.titel, { color: f.text }]}>Wiederherstellen</Text>
        </View>
        <Text style={[styles.text, { color: f.textLeise }]}>
          Neues Handy oder etwas versehentlich gelöscht? Wähle eine Sicherungsdatei aus. Vor dem Übernehmen siehst du,
          was darin steckt.
        </Text>
        <Knopf
          titel="Sicherung wiederherstellen"
          icon="file-restore-outline"
          art="neben"
          onPress={wiederherstellen}
          laedt={laeuft === 'wiederherstellen'}
          deaktiviert={beschaeftigt && laeuft !== 'wiederherstellen'}
        />
      </View>

      <View style={[styles.karte, { backgroundColor: f.flaeche }]}>
        <View style={styles.kopf}>
          <MaterialCommunityIcons name="information-outline" size={24} color={f.akzent} />
          <Text style={[styles.titel, { color: f.text }]}>Über die App</Text>
        </View>
        <Text style={[styles.text, { color: f.textLeise }]}>
          {Constants.expoConfig?.name ?? 'Vorratsliste'} · Version {Constants.expoConfig?.version ?? '?'}
        </Text>
        <Text style={[styles.text, { color: f.textLeise }]}>
          Alle Daten bleiben auf deinem Gerät. Es gibt kein Konto und keinen Server.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  inhalt: { padding: ABSTAND.m, gap: ABSTAND.m },
  karte: { borderRadius: RADIUS, padding: ABSTAND.m, gap: ABSTAND.s + 2 },
  kopf: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titel: { fontSize: 18, fontWeight: '700' },
  text: { fontSize: 15, lineHeight: 21 },
});
