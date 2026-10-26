import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Kiste } from '@/db/kisten';
import { fotoUri } from '@/lib/fotos';
import { codeAnzeige } from '@/lib/kisten-code';
import { RADIUS, useFarben } from '@/theme/farben';

export function KisteKarte({ kiste, onPress }: { kiste: Kiste; onPress: () => void }) {
  const f = useFarben();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${kiste.titel}${kiste.standort ? `, ${kiste.standort}` : ''}`}
      onPress={onPress}
      style={({ pressed }) => [styles.karte, { backgroundColor: f.flaeche, opacity: pressed ? 0.85 : 1 }]}>
      {kiste.foto ? (
        <Image source={{ uri: fotoUri(kiste.foto) }} style={styles.bild} contentFit="cover" />
      ) : (
        <View style={[styles.bild, styles.ohneBild, { backgroundColor: f.flaecheHervor }]}>
          <MaterialCommunityIcons name="package-variant-closed" size={30} color={f.textLeise} />
        </View>
      )}
      <View style={styles.text}>
        <Text style={[styles.titel, { color: f.text }]} numberOfLines={1}>
          {kiste.titel}
        </Text>
        {kiste.beschreibung ? (
          <Text style={[styles.beschreibung, { color: f.textLeise }]} numberOfLines={2}>
            {kiste.beschreibung}
          </Text>
        ) : null}
        <View style={styles.zeile}>
          {kiste.standort ? (
            <View style={styles.standort}>
              <MaterialCommunityIcons name="map-marker-outline" size={14} color={f.akzent} />
              <Text style={[styles.klein, { color: f.akzent }]} numberOfLines={1}>
                {kiste.standort}
              </Text>
            </View>
          ) : null}
          <Text style={[styles.klein, styles.code, { color: f.textLeise }]}>{codeAnzeige(kiste.code)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  karte: { flexDirection: 'row', borderRadius: RADIUS, padding: 10, gap: 12, alignItems: 'center' },
  bild: { width: 72, height: 72, borderRadius: 10 },
  ohneBild: { alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  titel: { fontSize: 17, fontWeight: '600' },
  beschreibung: { fontSize: 14 },
  zeile: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  standort: { flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 1 },
  klein: { fontSize: 13 },
  code: { fontFamily: 'monospace', marginLeft: 'auto' },
});
