import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Gegenstand } from '@/db/gegenstaende';
import { fotoUri } from '@/lib/fotos';
import { useFarben } from '@/theme/farben';

export function GegenstandZeile({ gegenstand, onPress }: { gegenstand: Gegenstand; onPress: () => void }) {
  const f = useFarben();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${gegenstand.name}${gegenstand.beschreibung ? `, ${gegenstand.beschreibung}` : ''}`}
      onPress={onPress}
      style={({ pressed }) => [styles.zeile, { borderColor: f.rand, opacity: pressed ? 0.7 : 1 }]}>
      {gegenstand.foto ? (
        <Image source={{ uri: fotoUri(gegenstand.foto) }} style={styles.bild} contentFit="cover" />
      ) : (
        <View style={[styles.bild, styles.ohneBild, { backgroundColor: f.flaecheHervor }]}>
          <MaterialCommunityIcons name="tag-outline" size={22} color={f.textLeise} />
        </View>
      )}
      <View style={styles.text}>
        <Text style={[styles.name, { color: f.text }]} numberOfLines={1}>
          {gegenstand.name}
        </Text>
        {gegenstand.beschreibung ? (
          <Text style={{ color: f.textLeise }} numberOfLines={2}>
            {gegenstand.beschreibung}
          </Text>
        ) : null}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={f.textLeise} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  zeile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bild: { width: 56, height: 56, borderRadius: 8 },
  ohneBild: { alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '600' },
});
