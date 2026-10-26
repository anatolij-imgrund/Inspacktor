import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import type { ReactNode } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Knopf } from '@/components/knopf';
import { fotoUri } from '@/lib/fotos';
import { ABSTAND, RADIUS, useFarben, type Farben } from '@/theme/farben';

/** Was gerade als Foto angezeigt wird: schon gespeichert, frisch gewählt oder keins. */
export type FotoAuswahl = { quelle: 'gespeichert'; name: string } | { quelle: 'neu'; uri: string } | null;

const BILD_OPTIONEN: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.7,
  allowsEditing: true,
  aspect: [4, 3],
};

/** Fotovorschau mit „Foto aufnehmen“ / „Aus Galerie“ und Entfernen-Kreuz. */
export function FotoWaehler({ foto, onAendern }: { foto: FotoAuswahl; onAendern: (foto: FotoAuswahl) => void }) {
  const f = useFarben();

  async function aufnehmen() {
    const erlaubnis = await ImagePicker.requestCameraPermissionsAsync();
    if (!erlaubnis.granted) {
      Alert.alert('Keine Kamera-Erlaubnis', 'Du kannst die Erlaubnis in den Android-Einstellungen der App erteilen.');
      return;
    }
    const ergebnis = await ImagePicker.launchCameraAsync(BILD_OPTIONEN);
    if (!ergebnis.canceled && ergebnis.assets[0]) onAendern({ quelle: 'neu', uri: ergebnis.assets[0].uri });
  }

  async function auswaehlen() {
    const ergebnis = await ImagePicker.launchImageLibraryAsync(BILD_OPTIONEN);
    if (!ergebnis.canceled && ergebnis.assets[0]) onAendern({ quelle: 'neu', uri: ergebnis.assets[0].uri });
  }

  const bildUri = foto ? (foto.quelle === 'neu' ? foto.uri : fotoUri(foto.name)) : null;

  return (
    <>
      <View style={[styles.fotoRahmen, { backgroundColor: f.flaecheHervor }]}>
        {bildUri ? (
          <Image source={{ uri: bildUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <View style={styles.fotoLeer}>
            <MaterialCommunityIcons name="image-outline" size={40} color={f.textLeise} />
            <Text style={{ color: f.textLeise }}>Noch kein Foto</Text>
          </View>
        )}
        {bildUri ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Foto entfernen"
            onPress={() => onAendern(null)}
            style={[styles.fotoEntfernen, { backgroundColor: f.hintergrund }]}>
            <MaterialCommunityIcons name="close" size={20} color={f.text} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.reihe}>
        <View style={styles.halb}>
          <Knopf titel="Foto aufnehmen" icon="camera-outline" art="neben" onPress={aufnehmen} />
        </View>
        <View style={styles.halb}>
          <Knopf titel="Aus Galerie" icon="image-multiple-outline" art="neben" onPress={auswaehlen} />
        </View>
      </View>
    </>
  );
}

export function Feld({ titel, fehler, children }: { titel: string; fehler?: string; children: ReactNode }) {
  const f = useFarben();
  return (
    <View style={styles.feld}>
      <Text style={[styles.beschriftung, { color: f.textLeise }]}>{titel}</Text>
      {children}
      {fehler ? <Text style={{ color: f.gefahr }}>{fehler}</Text> : null}
    </View>
  );
}

export function eingabeStil(f: Farben, mehrzeilig = false) {
  return [
    styles.eingabe,
    mehrzeilig && styles.mehrzeilig,
    { backgroundColor: f.flaeche, color: f.text, borderColor: f.rand },
  ];
}

export const formularStile = StyleSheet.create({
  inhalt: { padding: ABSTAND.m, gap: ABSTAND.m },
});

const styles = StyleSheet.create({
  fotoRahmen: { aspectRatio: 4 / 3, borderRadius: RADIUS, overflow: 'hidden' },
  fotoLeer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  fotoEntfernen: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reihe: { flexDirection: 'row', gap: ABSTAND.s },
  halb: { flex: 1 },
  feld: { gap: 6 },
  beschriftung: { fontSize: 14, fontWeight: '600' },
  eingabe: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  mehrzeilig: { minHeight: 110 },
});
