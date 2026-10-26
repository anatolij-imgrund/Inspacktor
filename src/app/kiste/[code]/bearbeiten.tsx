import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { KistenFormular } from '@/components/kisten-formular';
import { aktualisiereKiste, kisteNachCode, standorte, type Kiste } from '@/db/kisten';
import { fotoFuerSpeichern, raeumeAltesFotoAuf } from '@/lib/foto-speichern';
import { loescheFoto } from '@/lib/fotos';
import { useFarben } from '@/theme/farben';

export default function KisteBearbeiten() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const db = useSQLiteContext();
  const f = useFarben();
  const [kiste, setKiste] = useState<Kiste | null | undefined>(undefined);
  const [vorschlaege, setVorschlaege] = useState<string[]>([]);

  useEffect(() => {
    void kisteNachCode(db, code).then(setKiste);
    void standorte(db).then(setVorschlaege);
  }, [db, code]);

  if (kiste === undefined) {
    return (
      <View style={styles.mitte}>
        <ActivityIndicator color={f.akzent} />
      </View>
    );
  }
  if (kiste === null) {
    return (
      <View style={styles.mitte}>
        <Text style={{ color: f.text }}>Diese Kiste gibt es nicht mehr.</Text>
      </View>
    );
  }

  return (
    <KistenFormular
      anfang={{ titel: kiste.titel, standort: kiste.standort, beschreibung: kiste.beschreibung }}
      anfangsFoto={kiste.foto}
      standortVorschlaege={vorschlaege}
      speichernText="Änderungen speichern"
      onSpeichern={async (werte, auswahl) => {
        const foto = await fotoFuerSpeichern(auswahl);
        try {
          await aktualisiereKiste(db, kiste.code, { ...werte, foto });
        } catch (fehler) {
          if (foto !== kiste.foto) loescheFoto(foto);
          throw fehler;
        }
        raeumeAltesFotoAuf(kiste.foto, foto);
        router.back();
      }}
    />
  );
}

const styles = StyleSheet.create({
  mitte: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
