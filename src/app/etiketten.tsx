import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EtikettAktionen } from '@/components/etikett-aktionen';
import { alleKisten, type Kiste } from '@/db/kisten';
import { codeAnzeige } from '@/lib/kisten-code';
import { ABSTAND, RADIUS, useFarben } from '@/theme/farben';

export default function EtikettenBogen() {
  const db = useSQLiteContext();
  const f = useFarben();
  const unten = useSafeAreaInsets().bottom;
  const [kisten, setKisten] = useState<Kiste[]>([]);
  const [gewaehlt, setGewaehlt] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      void alleKisten(db).then((liste) => {
        setKisten(liste);
        setGewaehlt(new Set(liste.map((k) => k.code)));
      });
    }, [db]),
  );

  function umschalten(code: string) {
    setGewaehlt((alt) => {
      const neu = new Set(alt);
      if (neu.has(code)) neu.delete(code);
      else neu.add(code);
      return neu;
    });
  }

  const alleGewaehlt = kisten.length > 0 && gewaehlt.size === kisten.length;
  const auswahl = kisten.filter((k) => gewaehlt.has(k.code));

  return (
    <View style={styles.seite}>
      <View style={styles.kopf}>
        <Text style={{ color: f.textLeise }}>
          {auswahl.length} von {kisten.length} ausgewählt
        </Text>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => setGewaehlt(alleGewaehlt ? new Set() : new Set(kisten.map((k) => k.code)))}>
          <Text style={[styles.alle, { color: f.akzent }]}>{alleGewaehlt ? 'Keine' : 'Alle'}</Text>
        </Pressable>
      </View>

      <FlatList
        data={kisten}
        keyExtractor={(k) => k.code}
        contentContainerStyle={styles.liste}
        renderItem={({ item }) => {
          const an = gewaehlt.has(item.code);
          return (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: an }}
              onPress={() => umschalten(item.code)}
              style={[styles.zeile, { backgroundColor: f.flaeche }]}>
              <MaterialCommunityIcons
                name={an ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={24}
                color={an ? f.akzent : f.textLeise}
              />
              <View style={styles.text}>
                <Text style={[styles.titel, { color: f.text }]} numberOfLines={1}>
                  {item.titel}
                </Text>
                <Text style={{ color: f.textLeise }} numberOfLines={1}>
                  {[item.standort, codeAnzeige(item.code)].filter(Boolean).join(' · ')}
                </Text>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Text style={[styles.leer, { color: f.textLeise }]}>Lege zuerst Kisten an.</Text>
        }
      />

      <View style={[styles.fuss, { backgroundColor: f.hintergrund, borderColor: f.rand, paddingBottom: ABSTAND.m + unten }]}>
        <EtikettAktionen kisten={auswahl} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  seite: { flex: 1 },
  kopf: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: ABSTAND.m,
    paddingTop: ABSTAND.s,
  },
  alle: { fontSize: 16, fontWeight: '600' },
  liste: { padding: ABSTAND.m, gap: 8 },
  zeile: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: RADIUS },
  text: { flex: 1 },
  titel: { fontSize: 16, fontWeight: '600' },
  leer: { textAlign: 'center', marginTop: ABSTAND.l },
  fuss: { paddingHorizontal: ABSTAND.m, paddingTop: ABSTAND.m, borderTopWidth: StyleSheet.hairlineWidth },
});
