import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Knopf } from '@/components/knopf';
import { PRO_SEITE, type EtikettGroesse, type EtikettKiste } from '@/lib/etiketten';
import { etikettenAlsPdfSpeichern, etikettenDrucken, etikettenTeilen } from '@/lib/etiketten-ausgabe';
import { ABSTAND, useFarben } from '@/theme/farben';

type Aktion = 'drucken' | 'pdf' | 'teilen';

const GROESSEN: { wert: EtikettGroesse; titel: string; info: string }[] = [
  { wert: 'klein', titel: 'Klein', info: `9 × 5 cm, ${PRO_SEITE.klein} pro A4-Seite` },
  { wert: 'gross', titel: 'Groß', info: `19 × 13 cm, ${PRO_SEITE.gross} pro A4-Seite` },
];

export function EtikettAktionen({ kisten }: { kisten: EtikettKiste[] }) {
  const f = useFarben();
  const [groesse, setGroesse] = useState<EtikettGroesse>('klein');
  const [laeuft, setLaeuft] = useState<Aktion | null>(null);
  const keine = kisten.length === 0;

  async function ausfuehren(aktion: Aktion) {
    setLaeuft(aktion);
    try {
      if (aktion === 'drucken') await etikettenDrucken(kisten, groesse);
      if (aktion === 'teilen') await etikettenTeilen(kisten, groesse);
      if (aktion === 'pdf') {
        const name = await etikettenAlsPdfSpeichern(kisten, groesse);
        if (name) Alert.alert('PDF gespeichert', `„${name}“ liegt im gewählten Ordner.`);
      }
    } catch (fehler) {
      // Abbrechen im Druckdialog meldet Android teils als Fehler – das ist kein Problem für den Nutzer.
      const text = fehler instanceof Error ? fehler.message : String(fehler);
      if (!/cancel|abgebrochen/i.test(text)) Alert.alert('Das hat nicht geklappt', text);
    } finally {
      setLaeuft(null);
    }
  }

  return (
    <View style={styles.bereich}>
      <View style={[styles.umschalter, { backgroundColor: f.flaecheHervor }]} accessibilityRole="radiogroup">
        {GROESSEN.map((g) => {
          const aktiv = g.wert === groesse;
          return (
            <Pressable
              key={g.wert}
              accessibilityRole="radio"
              accessibilityState={{ checked: aktiv }}
              onPress={() => setGroesse(g.wert)}
              style={[styles.option, aktiv && { backgroundColor: f.flaeche }]}>
              <Text style={[styles.optionTitel, { color: aktiv ? f.text : f.textLeise }]}>{g.titel}</Text>
              <Text style={[styles.optionInfo, { color: f.textLeise }]}>{g.info}</Text>
            </Pressable>
          );
        })}
      </View>
      <Knopf
        titel="Drucken"
        icon="printer-outline"
        onPress={() => void ausfuehren('drucken')}
        laedt={laeuft === 'drucken'}
        deaktiviert={keine || (laeuft !== null && laeuft !== 'drucken')}
      />
      <View style={styles.reihe}>
        <View style={styles.halb}>
          <Knopf
            titel="Als PDF"
            icon="file-pdf-box"
            art="neben"
            onPress={() => void ausfuehren('pdf')}
            laedt={laeuft === 'pdf'}
            deaktiviert={keine || (laeuft !== null && laeuft !== 'pdf')}
          />
        </View>
        <View style={styles.halb}>
          <Knopf
            titel="Teilen"
            icon="share-variant-outline"
            art="neben"
            onPress={() => void ausfuehren('teilen')}
            laedt={laeuft === 'teilen'}
            deaktiviert={keine || (laeuft !== null && laeuft !== 'teilen')}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bereich: { gap: ABSTAND.s },
  umschalter: { flexDirection: 'row', borderRadius: 14, padding: 4, gap: 4 },
  option: { flex: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, alignItems: 'center' },
  optionTitel: { fontSize: 15, fontWeight: '600' },
  optionInfo: { fontSize: 12 },
  reihe: { flexDirection: 'row', gap: ABSTAND.s },
  halb: { flex: 1 },
});
