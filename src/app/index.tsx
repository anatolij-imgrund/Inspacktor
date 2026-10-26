import { StyleSheet, Text, View } from 'react-native';

import { ABSTAND, useFarben } from '@/theme/farben';

export default function KistenListe() {
  const f = useFarben();
  return (
    <View style={styles.leer}>
      <Text style={[styles.titel, { color: f.text }]}>Noch keine Kisten</Text>
      <Text style={[styles.hinweis, { color: f.textLeise }]}>
        Hier erscheinen bald deine Kisten mit Foto, Inhalt und QR-Code.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  leer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: ABSTAND.l, gap: ABSTAND.s },
  titel: { fontSize: 20, fontWeight: '600' },
  hinweis: { fontSize: 15, textAlign: 'center' },
});
