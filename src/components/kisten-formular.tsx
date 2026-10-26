import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { eingabeStil, Feld, formularStile, FotoWaehler, type FotoAuswahl } from '@/components/formular-teile';
import { Knopf } from '@/components/knopf';
import {
  kistenFormularSchema,
  type KistenFormularEingabe,
  type KistenFormularWerte,
} from '@/lib/kisten-formular';
import { ABSTAND, useFarben } from '@/theme/farben';

export type { FotoAuswahl } from '@/components/formular-teile';

type Props = {
  anfang: KistenFormularEingabe;
  anfangsFoto: string | null;
  standortVorschlaege: string[];
  speichernText: string;
  onSpeichern: (werte: KistenFormularWerte, foto: FotoAuswahl) => Promise<void>;
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

  return (
    <KeyboardAwareScrollView
      // Abstand zwischen aktivem Feld und Tastatur; scrollt das Feld automatisch nach oben.
      bottomOffset={ABSTAND.l}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[formularStile.inhalt, { paddingBottom: ABSTAND.l + unten }]}>
      <FotoWaehler foto={foto} onAendern={setFoto} />

      <Feld titel="Titel" fehler={errors.titel?.message}>
        <Controller
          control={control}
          name="titel"
          render={({ field }) => (
            <TextInput
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              placeholder="z. B. Winterkleidung Kinder"
              placeholderTextColor={f.textLeise}
              style={eingabeStil(f)}
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
              style={eingabeStil(f)}
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

      <Feld titel="Beschreibung" fehler={errors.beschreibung?.message}>
        <Controller
          control={control}
          name="beschreibung"
          render={({ field }) => (
            <TextInput
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              placeholder="Allgemein, z. B. „Jacken und Hosen, Gr. 98–116“. Einzelne Gegenstände fügst du danach hinzu."
              placeholderTextColor={f.textLeise}
              style={eingabeStil(f, true)}
              multiline
              textAlignVertical="top"
              maxLength={2000}
            />
          )}
        />
      </Feld>

      <Knopf titel={speichernText} icon="check" onPress={speichern} laedt={speichert} />
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
});
