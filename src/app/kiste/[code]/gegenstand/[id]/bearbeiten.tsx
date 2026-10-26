import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { GegenstandFormular } from '@/components/gegenstand-formular';
import { aktualisiereGegenstand, gegenstandNachId, type Gegenstand } from '@/db/gegenstaende';
import { fotoFuerSpeichern, raeumeAltesFotoAuf } from '@/lib/foto-speichern';
import { loescheFoto } from '@/lib/fotos';
import { useFarben } from '@/theme/farben';

export default function GegenstandBearbeiten() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const f = useFarben();
  const [gegenstand, setGegenstand] = useState<Gegenstand | null | undefined>(undefined);

  useEffect(() => {
    void gegenstandNachId(db, Number(id)).then(setGegenstand);
  }, [db, id]);

  if (gegenstand === undefined) {
    return (
      <View style={styles.mitte}>
        <ActivityIndicator color={f.akzent} />
      </View>
    );
  }
  if (gegenstand === null) {
    return (
      <View style={styles.mitte}>
        <Text style={{ color: f.text }}>Diesen Gegenstand gibt es nicht mehr.</Text>
      </View>
    );
  }

  return (
    <GegenstandFormular
      anfang={{ name: gegenstand.name, beschreibung: gegenstand.beschreibung }}
      anfangsFoto={gegenstand.foto}
      speichernText="Änderungen speichern"
      onSpeichern={async (werte, auswahl) => {
        const foto = await fotoFuerSpeichern(auswahl);
        try {
          await aktualisiereGegenstand(db, gegenstand.id, { ...werte, foto });
        } catch (fehler) {
          if (foto !== gegenstand.foto) loescheFoto(foto);
          throw fehler;
        }
        raeumeAltesFotoAuf(gegenstand.foto, foto);
        router.back();
      }}
    />
  );
}

const styles = StyleSheet.create({
  mitte: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
