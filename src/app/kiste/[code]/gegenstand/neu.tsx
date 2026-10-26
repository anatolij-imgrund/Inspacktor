import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { GegenstandFormular } from '@/components/gegenstand-formular';
import { legeGegenstandAn } from '@/db/gegenstaende';
import { kisteNachCode, type Kiste } from '@/db/kisten';
import { fotoFuerSpeichern } from '@/lib/foto-speichern';
import { loescheFoto } from '@/lib/fotos';
import { LEERER_GEGENSTAND } from '@/lib/kisten-formular';
import { useFarben } from '@/theme/farben';

export default function NeuerGegenstand() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const db = useSQLiteContext();
  const f = useFarben();
  const [kiste, setKiste] = useState<Kiste | null>(null);
  // Neuer Schlüssel = frisches, leeres Formular nach „Speichern und nächsten“.
  const [durchgang, setDurchgang] = useState(0);
  const [hinweis, setHinweis] = useState<string | null>(null);

  useEffect(() => {
    void kisteNachCode(db, code).then(setKiste);
  }, [db, code]);

  if (!kiste) {
    return (
      <View style={styles.mitte}>
        <ActivityIndicator color={f.akzent} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: `Neu in „${kiste.titel}“` }} />
      <GegenstandFormular
        key={durchgang}
        anfang={LEERER_GEGENSTAND}
        anfangsFoto={null}
        speichernText={durchgang > 0 ? 'Speichern und fertig' : 'Speichern'}
        mitWeiter
        hinweis={hinweis}
        onSpeichern={async (werte, auswahl, weiter) => {
          const foto = await fotoFuerSpeichern(auswahl);
          try {
            await legeGegenstandAn(db, kiste.id, { ...werte, foto });
          } catch (fehler) {
            loescheFoto(foto);
            throw fehler;
          }
          if (weiter) {
            setHinweis(`„${werte.name}“ gespeichert. Weiter mit dem nächsten Gegenstand.`);
            setDurchgang((d) => d + 1);
          } else {
            router.back();
          }
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  mitte: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
