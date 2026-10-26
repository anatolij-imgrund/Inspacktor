import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Knopf } from '@/components/knopf';
import { kisteNachCode, loescheKiste, type Kiste } from '@/db/kisten';
import { fotoUri, loescheFoto } from '@/lib/fotos';
import { codeAnzeige, normalisiereCode } from '@/lib/kisten-code';
import { ABSTAND, RADIUS, useFarben } from '@/theme/farben';

export default function KisteAnsehen() {
  const params = useLocalSearchParams<{ code: string }>();
  // Auch Links mit kleingeschriebenem Code („vorratsliste://kiste/k7qf3m“) sollen funktionieren.
  const code = normalisiereCode(params.code ?? '') ?? params.code ?? '';
  const db = useSQLiteContext();
  const f = useFarben();
  const unten = useSafeAreaInsets().bottom;
  const [kiste, setKiste] = useState<Kiste | null | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      void kisteNachCode(db, code).then(setKiste);
    }, [db, code]),
  );

  if (kiste === undefined) {
    return (
      <View style={styles.mitte}>
        <ActivityIndicator color={f.akzent} />
      </View>
    );
  }

  if (kiste === null) {
    return (
      <View style={[styles.mitte, { gap: ABSTAND.m }]}>
        <Stack.Screen options={{ title: 'Unbekannte Kiste' }} />
        <MaterialCommunityIcons name="package-variant-remove" size={48} color={f.textLeise} />
        <Text style={[styles.leerText, { color: f.text }]}>
          Zum Code {codeAnzeige(code)} gibt es keine Kiste – vielleicht wurde sie gelöscht.
        </Text>
        <Knopf titel="Zur Übersicht" art="neben" onPress={() => router.replace('/')} />
      </View>
    );
  }

  function loeschen(k: Kiste) {
    Alert.alert('Kiste löschen?', `„${k.titel}“ wird mit Foto gelöscht. Das Etikett passt danach zu keiner Kiste mehr.`, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: () => {
          void loescheKiste(db, k.code).then(() => {
            loescheFoto(k.foto);
            router.back();
          });
        },
      },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={[styles.inhalt, { paddingBottom: ABSTAND.l + unten }]}>
      <Stack.Screen options={{ title: kiste.titel }} />
      {kiste.foto ? (
        <Image
          source={{ uri: fotoUri(kiste.foto) }}
          style={[styles.foto, { backgroundColor: f.flaecheHervor }]}
          contentFit="cover"
          accessibilityLabel={`Foto von ${kiste.titel}`}
        />
      ) : null}

      <View style={styles.kopf}>
        <Text style={[styles.titel, { color: f.text }]}>{kiste.titel}</Text>
        <View style={styles.zeile}>
          {kiste.standort ? (
            <View style={[styles.marke, { backgroundColor: f.flaecheHervor }]}>
              <MaterialCommunityIcons name="map-marker-outline" size={16} color={f.akzent} />
              <Text style={{ color: f.text }}>{kiste.standort}</Text>
            </View>
          ) : null}
          <View style={[styles.marke, { backgroundColor: f.flaecheHervor }]}>
            <MaterialCommunityIcons name="qrcode" size={16} color={f.textLeise} />
            <Text style={[styles.code, { color: f.text }]}>{codeAnzeige(kiste.code)}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.karte, { backgroundColor: f.flaeche }]}>
        <Text style={[styles.abschnitt, { color: f.textLeise }]}>Inhalt</Text>
        <Text style={[styles.beschreibung, { color: kiste.beschreibung ? f.text : f.textLeise }]}>
          {kiste.beschreibung || 'Noch keine Beschreibung.'}
        </Text>
      </View>

      <View style={styles.knoepfe}>
        <Knopf
          titel="Bearbeiten"
          icon="pencil-outline"
          art="neben"
          onPress={() => router.push({ pathname: '/kiste/[code]/bearbeiten', params: { code: kiste.code } })}
        />
        <Knopf titel="Löschen" icon="delete-outline" art="gefahr" onPress={() => loeschen(kiste)} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  mitte: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: ABSTAND.l },
  leerText: { fontSize: 16, textAlign: 'center' },
  inhalt: { padding: ABSTAND.m, gap: ABSTAND.m },
  foto: { width: '100%', aspectRatio: 4 / 3, borderRadius: RADIUS },
  kopf: { gap: ABSTAND.s },
  titel: { fontSize: 26, fontWeight: '700' },
  zeile: { flexDirection: 'row', flexWrap: 'wrap', gap: ABSTAND.s },
  marke: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  code: { fontFamily: 'monospace' },
  karte: { borderRadius: RADIUS, padding: ABSTAND.m, gap: 6 },
  abschnitt: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  beschreibung: { fontSize: 16, lineHeight: 23 },
  knoepfe: { gap: ABSTAND.s },
});
