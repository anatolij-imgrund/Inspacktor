import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KisteKarte } from '@/components/kiste-karte';
import { gegenstandNachId, verschiebeGegenstand, type Gegenstand } from '@/db/gegenstaende';
import { alleKisten, filtereKisten, type KisteUebersicht } from '@/db/kisten';
import { ABSTAND, useFarben } from '@/theme/farben';

export default function GegenstandVerschieben() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const f = useFarben();
  const unten = useSafeAreaInsets().bottom;
  const [gegenstand, setGegenstand] = useState<Gegenstand | null>(null);
  const [kisten, setKisten] = useState<KisteUebersicht[]>([]);
  const [suche, setSuche] = useState('');

  useEffect(() => {
    void (async () => {
      const g = await gegenstandNachId(db, Number(id));
      setGegenstand(g);
      // Die eigene Kiste ist kein sinnvolles Ziel.
      setKisten(g ? (await alleKisten(db)).filter((k) => k.id !== g.kisteId) : []);
    })();
  }, [db, id]);

  function waehlen(ziel: KisteUebersicht) {
    if (!gegenstand) return;
    Alert.alert('Verschieben?', `„${gegenstand.name}“ nach „${ziel.titel}“ verschieben?`, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Verschieben',
        onPress: () => {
          void verschiebeGegenstand(db, gegenstand.id, ziel.id)
            .then(() => {
              // Zurück zur bisherigen Kiste (Verschieben- und Gegenstand-Seite schließen) …
              router.dismiss(2);
              // … und anbieten, gleich in die Zielkiste zu wechseln.
              Alert.alert('Verschoben', `„${gegenstand.name}“ liegt jetzt in „${ziel.titel}“.`, [
                { text: 'OK', style: 'cancel' },
                {
                  text: 'Zur Kiste',
                  onPress: () => router.push({ pathname: '/kiste/[code]', params: { code: ziel.code } }),
                },
              ]);
            })
            .catch((fehler: unknown) =>
              Alert.alert('Verschieben fehlgeschlagen', fehler instanceof Error ? fehler.message : String(fehler)),
            );
        },
      },
    ]);
  }

  const sichtbar = filtereKisten(kisten, suche);

  return (
    <View style={styles.seite}>
      {gegenstand ? (
        <Text style={[styles.hinweis, { color: f.textLeise }]}>
          Wohin soll <Text style={{ color: f.text, fontWeight: '600' }}>{gegenstand.name}</Text>?
        </Text>
      ) : null}
      <View style={[styles.suche, { backgroundColor: f.flaeche, borderColor: f.rand }]}>
        <MaterialCommunityIcons name="magnify" size={22} color={f.textLeise} />
        <TextInput
          value={suche}
          onChangeText={setSuche}
          placeholder="Zielkiste suchen …"
          placeholderTextColor={f.textLeise}
          style={[styles.sucheEingabe, { color: f.text }]}
          autoCorrect={false}
        />
        {suche ? (
          <Pressable accessibilityLabel="Suche leeren" hitSlop={10} onPress={() => setSuche('')}>
            <MaterialCommunityIcons name="close-circle" size={20} color={f.textLeise} />
          </Pressable>
        ) : null}
      </View>
      <FlatList
        data={sichtbar}
        keyExtractor={(k) => k.code}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.liste, { paddingBottom: ABSTAND.l + unten }]}
        renderItem={({ item }) => <KisteKarte kiste={item} onPress={() => waehlen(item)} />}
        ListEmptyComponent={
          <Text style={[styles.leer, { color: f.textLeise }]}>
            {kisten.length === 0 ? 'Es gibt noch keine andere Kiste.' : `Keine Kiste passt zu „${suche.trim()}“.`}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  seite: { flex: 1 },
  hinweis: { fontSize: 15, marginHorizontal: ABSTAND.m, marginTop: ABSTAND.s },
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
  leer: { textAlign: 'center', marginTop: ABSTAND.l },
});
