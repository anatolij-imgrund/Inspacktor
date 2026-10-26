import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { eingabeStil, Feld, formularStile, FotoWaehler, type FotoAuswahl } from '@/components/formular-teile';
import { Knopf } from '@/components/knopf';
import {
  gegenstandFormularSchema,
  type GegenstandFormularEingabe,
  type GegenstandFormularWerte,
} from '@/lib/kisten-formular';
import { ABSTAND, RADIUS, useFarben } from '@/theme/farben';

type Props = {
  anfang: GegenstandFormularEingabe;
  anfangsFoto: string | null;
  speichernText: string;
  /** Zeigt zusätzlich „Speichern und nächsten“ – für das Erfassen beim Einpacken. */
  mitWeiter?: boolean;
  /** Bestätigung oben, z. B. „Winterjacke gespeichert“. */
  hinweis?: string | null;
  onSpeichern: (werte: GegenstandFormularWerte, foto: FotoAuswahl, weiter: boolean) => Promise<void>;
};

export function GegenstandFormular({ anfang, anfangsFoto, speichernText, mitWeiter, hinweis, onSpeichern }: Props) {
  const f = useFarben();
  const unten = useSafeAreaInsets().bottom;
  const [foto, setFoto] = useState<FotoAuswahl>(anfangsFoto ? { quelle: 'gespeichert', name: anfangsFoto } : null);
  const [speichert, setSpeichert] = useState<'normal' | 'weiter' | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<GegenstandFormularEingabe, unknown, GegenstandFormularWerte>({
    defaultValues: anfang,
    resolver: zodResolver(gegenstandFormularSchema),
  });

  function speichern(weiter: boolean) {
    return handleSubmit(async (werte) => {
      setSpeichert(weiter ? 'weiter' : 'normal');
      try {
        await onSpeichern(werte, foto, weiter);
      } catch (fehler) {
        Alert.alert('Speichern fehlgeschlagen', fehler instanceof Error ? fehler.message : String(fehler));
      } finally {
        setSpeichert(null);
      }
    });
  }

  return (
    <KeyboardAwareScrollView
      // Abstand zwischen aktivem Feld und Tastatur; scrollt das Feld automatisch nach oben.
      bottomOffset={ABSTAND.l}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[formularStile.inhalt, { paddingBottom: ABSTAND.l + unten }]}>
      {hinweis ? (
        <View style={[styles.hinweis, { backgroundColor: f.flaecheHervor }]} accessibilityLiveRegion="polite">
          <MaterialCommunityIcons name="check-circle" size={20} color={f.akzent} />
          <Text style={{ color: f.text, flex: 1 }}>{hinweis}</Text>
        </View>
      ) : null}

      <FotoWaehler foto={foto} onAendern={setFoto} />

      <Feld titel="Name" fehler={errors.name?.message}>
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <TextInput
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              placeholder="z. B. Winterjacke"
              placeholderTextColor={f.textLeise}
              style={eingabeStil(f)}
              maxLength={80}
            />
          )}
        />
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
              placeholder="z. B. Größe 116, blau, wasserdicht"
              placeholderTextColor={f.textLeise}
              style={eingabeStil(f, true)}
              multiline
              textAlignVertical="top"
              maxLength={1000}
            />
          )}
        />
      </Feld>

      {mitWeiter ? (
        <Knopf
          titel="Speichern und nächsten"
          icon="plus"
          onPress={speichern(true)}
          laedt={speichert === 'weiter'}
          deaktiviert={speichert === 'normal'}
        />
      ) : null}
      <Knopf
        titel={speichernText}
        icon="check"
        art={mitWeiter ? 'neben' : 'haupt'}
        onPress={speichern(false)}
        laedt={speichert === 'normal'}
        deaktiviert={speichert === 'weiter'}
      />
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  hinweis: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: RADIUS },
});
