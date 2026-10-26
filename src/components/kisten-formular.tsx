import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Knopf } from '@/components/knopf';
import { fotoUri } from '@/lib/fotos';
import {
  kistenFormularSchema,
  type KistenFormularEingabe,
  type KistenFormularWerte,
} from '@/lib/kisten-formular';
import { ABSTAND, RADIUS, useFarben } from '@/theme/farben';

/** Was gerade als Foto angezeigt wird: schon gespeichert, frisch gewählt oder keins. */
export type FotoAuswahl = { quelle: 'gespeichert'; name: string } | { quelle: 'neu'; uri: string } | null;

type Props = {
  anfang: KistenFormularEingabe;
  anfangsFoto: string | null;
  standortVorschlaege: string[];
  speichernText: string;
  onSpeichern: (werte: KistenFormularWerte, foto: FotoAuswahl) => Promise<void>;
};

const BILD_OPTIONEN: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.7,
  allowsEditing: true,
  aspect: [4, 3],
};

export function KistenFormular({ anfang, anfangsFoto, standortVorschlaege, speichernText, onSpeichern }: Props) {
  const f = useFarben();
  const unten = useSafeAreaInsets().bottom;
  const [foto, setFoto] = useState<FotoAuswahl>(anfangsFoto ? { quelle: 'gespeichert', name: anfangsFoto } : null);
  const [speichert, setSpeichert] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<KistenFormularEingabe, unknown, KistenFormularWerte>({
    defaultValues: anfang,
    resolver: zodResolver(kistenFormularSchema),
  });
  const standort = useWatch({ control, name: 'standort' });

  async function fotoAufnehmen() {
    const erlaubnis = await ImagePicker.requestCameraPermissionsAsync();
    if (!erlaubnis.granted) {
      Alert.alert('Keine Kamera-Erlaubnis', 'Du kannst die Erlaubnis in den Android-Einstellungen der App erteilen.');
      return;
    }
    const ergebnis = await ImagePicker.launchCameraAsync(BILD_OPTIONEN);
    if (!ergebnis.canceled && ergebnis.assets[0]) setFoto({ quelle: 'neu', uri: ergebnis.assets[0].uri });
  }

  async function fotoAuswaehlen() {
    const ergebnis = await ImagePicker.launchImageLibraryAsync(BILD_OPTIONEN);
    if (!ergebnis.canceled && ergebnis.assets[0]) setFoto({ quelle: 'neu', uri: ergebnis.assets[0].uri });
  }

  const speichern = handleSubmit(async (werte) => {
    setSpeichert(true);
    try {
      await onSpeichern(werte, foto);
    } catch (fehler) {
      Alert.alert('Speichern fehlgeschlagen', fehler instanceof Error ? fehler.message : String(fehler));
    } finally {
      setSpeichert(false);
    }
  });

  const bildUri = foto ? (foto.quelle === 'neu' ? foto.uri : fotoUri(foto.name)) : null;
  const eingabeStil = [styles.eingabe, { backgroundColor: f.flaeche, color: f.text, borderColor: f.rand }];

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.inhalt, { paddingBottom: ABSTAND.l + unten }]}>
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
            onPress={() => setFoto(null)}
            style={[styles.fotoEntfernen, { backgroundColor: f.hintergrund }]}>
            <MaterialCommunityIcons name="close" size={20} color={f.text} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.reihe}>
        <View style={styles.halb}>
          <Knopf titel="Foto aufnehmen" icon="camera-outline" art="neben" onPress={fotoAufnehmen} />
        </View>
        <View style={styles.halb}>
          <Knopf titel="Aus Galerie" icon="image-multiple-outline" art="neben" onPress={fotoAuswaehlen} />
        </View>
      </View>

      <Feld titel="Titel" fehler={errors.titel?.message}>
        <Controller
          control={control}
          name="titel"
          render={({ field }) => (
            <TextInput
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              placeholder="z. B. Weihnachtsdeko"
              placeholderTextColor={f.textLeise}
              style={eingabeStil}
              maxLength={80}
            />
          )}
        />
      </Feld>

      <Feld titel="Standort" fehler={errors.standort?.message}>
        <Controller
          control={control}
          name="standort"
          render={({ field }) => (
            <TextInput
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              placeholder="z. B. Dach, Keller, Garage"
              placeholderTextColor={f.textLeise}
              style={eingabeStil}
              maxLength={60}
            />
          )}
        />
        {standortVorschlaege.length > 0 ? (
          <View style={styles.chips}>
            {standortVorschlaege.slice(0, 8).map((s) => {
              const aktiv = s === standort.trim();
              return (
                <Pressable
                  key={s}
                  accessibilityRole="button"
                  accessibilityState={{ selected: aktiv }}
                  onPress={() => setValue('standort', s, { shouldDirty: true })}
                  style={[styles.chip, { backgroundColor: aktiv ? f.akzent : f.flaecheHervor }]}>
                  <Text style={{ color: aktiv ? f.aufAkzent : f.text }}>{s}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </Feld>

      <Feld titel="Inhalt / Beschreibung" fehler={errors.beschreibung?.message}>
        <Controller
          control={control}
          name="beschreibung"
          render={({ field }) => (
            <TextInput
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              placeholder="Was ist in der Kiste?"
              placeholderTextColor={f.textLeise}
              style={[eingabeStil, styles.mehrzeilig]}
              multiline
              textAlignVertical="top"
              maxLength={2000}
            />
          )}
        />
      </Feld>

      <Knopf titel={speichernText} icon="check" onPress={speichern} laedt={speichert} />
    </ScrollView>
  );
}

function Feld({ titel, fehler, children }: { titel: string; fehler?: string; children: React.ReactNode }) {
  const f = useFarben();
  return (
    <View style={styles.feld}>
      <Text style={[styles.beschriftung, { color: f.textLeise }]}>{titel}</Text>
      {children}
      {fehler ? <Text style={{ color: f.gefahr }}>{fehler}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  inhalt: { padding: ABSTAND.m, gap: ABSTAND.m },
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
  mehrzeilig: { minHeight: 120 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
});
