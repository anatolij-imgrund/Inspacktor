import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KisteKarte } from '@/components/kiste-karte';
import { alleKisten, filtereKisten, type Kiste } from '@/db/kisten';
import { ABSTAND, useFarben } from '@/theme/farben';

export default function KistenListe() {
  const db = useSQLiteContext();
  const f = useFarben();
  const unten = useSafeAreaInsets().bottom;
  const [kisten, setKisten] = useState<Kiste[] | null>(null);
  const [suche, setSuche] = useState('');

  useFocusEffect(
    useCallback(() => {
      void alleKisten(db).then(setKisten);
    }, [db]),
  );

  const sichtbar = kisten ? filtereKisten(kisten, suche) : [];

  return (
    <View style={styles.seite}>
      {kisten && kisten.length > 0 ? (
        <View style={[styles.suche, { backgroundColor: f.flaeche, borderColor: f.rand }]}>
          <MaterialCommunityIcons name="magnify" size={22} color={f.textLeise} />
          <TextInput
            value={suche}
            onChangeText={setSuche}
            placeholder="Suchen: Inhalt, Standort, Code …"
            placeholderTextColor={f.textLeise}
            style={[styles.sucheEingabe, { color: f.text }]}
            returnKeyType="search"
            autoCorrect={false}
          />
          {suche ? (
            <Pressable accessibilityLabel="Suche leeren" hitSlop={10} onPress={() => setSuche('')}>
              <MaterialCommunityIcons name="close-circle" size={20} color={f.textLeise} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <FlatList
        data={sichtbar}
        keyExtractor={(k) => k.code}
        renderItem={({ item }) => (
          <KisteKarte
            kiste={item}
            onPress={() => router.push({ pathname: '/kiste/[code]', params: { code: item.code } })}
          />
        )}
        contentContainerStyle={[styles.liste, { paddingBottom: 96 + unten }]}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          kisten === null ? undefined : kisten.length === 0 ? (
            <View style={styles.leer}>
              <MaterialCommunityIcons name="package-variant" size={56} color={f.textLeise} />
              <Text style={[styles.leerTitel, { color: f.text }]}>Noch keine Kisten</Text>
              <Text style={[styles.leerText, { color: f.textLeise }]}>
                Lege deine erste Kiste an: Foto vom Inhalt machen, kurz beschreiben, Etikett drucken.
              </Text>
            </View>
          ) : (
            <View style={styles.leer}>
              <Text style={[styles.leerText, { color: f.textLeise }]}>Keine Kiste passt zu „{suche.trim()}“.</Text>
            </View>
          )
        }
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Neue Kiste anlegen"
        onPress={() => router.push('/neue-kiste')}
        style={({ pressed }) => [
          styles.neu,
          { backgroundColor: f.akzent, bottom: ABSTAND.l + unten, opacity: pressed ? 0.85 : 1 },
        ]}>
        <MaterialCommunityIcons name="plus" size={24} color={f.aufAkzent} />
        <Text style={[styles.neuText, { color: f.aufAkzent }]}>Neue Kiste</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  seite: { flex: 1 },
  suche: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: ABSTAND.m,
    marginTop: ABSTAND.s,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  sucheEingabe: { flex: 1, fontSize: 16, paddingVertical: 10 },
  liste: { padding: ABSTAND.m, gap: 10, flexGrow: 1 },
  leer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: ABSTAND.s, padding: ABSTAND.l },
  leerTitel: { fontSize: 20, fontWeight: '600' },
  leerText: { fontSize: 15, textAlign: 'center', lineHeight: 21 },
  neu: {
    position: 'absolute',
    right: ABSTAND.m,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    height: 56,
    borderRadius: 18,
    elevation: 4,
  },
  neuText: { fontSize: 16, fontWeight: '700' },
});
