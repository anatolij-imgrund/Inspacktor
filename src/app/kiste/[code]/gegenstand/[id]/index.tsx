import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Knopf } from '@/components/knopf';
import { gegenstandNachId, loescheGegenstand, type Gegenstand } from '@/db/gegenstaende';
import { fotoUri, loescheFoto } from '@/lib/fotos';
import { ABSTAND, RADIUS, useFarben } from '@/theme/farben';

export default function GegenstandAnsehen() {
  const { code, id } = useLocalSearchParams<{ code: string; id: string }>();
  const db = useSQLiteContext();
  const f = useFarben();
  const unten = useSafeAreaInsets().bottom;
  const [gegenstand, setGegenstand] = useState<Gegenstand | null | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      void gegenstandNachId(db, Number(id)).then(setGegenstand);
    }, [db, id]),
  );

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

  function loeschen(g: Gegenstand) {
    Alert.alert('Gegenstand löschen?', `„${g.name}“ wird mit Foto aus der Kiste entfernt.`, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: () => {
          void loescheGegenstand(db, g.id).then((foto) => {
            loescheFoto(foto);
            router.back();
          });
        },
      },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={[styles.inhalt, { paddingBottom: ABSTAND.l + unten }]}>
      <Stack.Screen options={{ title: gegenstand.name }} />
      {gegenstand.foto ? (
        <Image
          source={{ uri: fotoUri(gegenstand.foto) }}
          style={[styles.foto, { backgroundColor: f.flaecheHervor }]}
          contentFit="cover"
          accessibilityLabel={`Foto von ${gegenstand.name}`}
        />
      ) : (
        <View style={[styles.foto, styles.ohneFoto, { backgroundColor: f.flaecheHervor }]}>
          <MaterialCommunityIcons name="image-off-outline" size={40} color={f.textLeise} />
        </View>
      )}
      <Text style={[styles.name, { color: f.text }]}>
        {gegenstand.menge > 1 ? <Text style={{ color: f.akzent }}>{gegenstand.menge} × </Text> : null}
        {gegenstand.name}
      </Text>
      {gegenstand.beschreibung ? (
        <Text style={[styles.beschreibung, { color: f.text }]}>{gegenstand.beschreibung}</Text>
      ) : (
        <Text style={{ color: f.textLeise }}>Keine Beschreibung.</Text>
      )}
      <View style={styles.knoepfe}>
        <Knopf
          titel="Bearbeiten"
          icon="pencil-outline"
          art="neben"
          onPress={() =>
            router.push({
              pathname: '/kiste/[code]/gegenstand/[id]/bearbeiten',
              params: { code, id: String(gegenstand.id) },
            })
          }
        />
        <Knopf
          titel="In andere Kiste verschieben"
          icon="swap-horizontal"
          art="neben"
          onPress={() =>
            router.push({
              pathname: '/kiste/[code]/gegenstand/[id]/verschieben',
              params: { code, id: String(gegenstand.id) },
            })
          }
        />
        <Knopf titel="Löschen" icon="delete-outline" art="gefahr" onPress={() => loeschen(gegenstand)} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  mitte: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: ABSTAND.l },
  inhalt: { padding: ABSTAND.m, gap: ABSTAND.m },
  foto: { width: '100%', aspectRatio: 4 / 3, borderRadius: RADIUS },
  ohneFoto: { alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 24, fontWeight: '700' },
  beschreibung: { fontSize: 16, lineHeight: 23 },
  knoepfe: { gap: ABSTAND.s, marginTop: ABSTAND.s },
});
