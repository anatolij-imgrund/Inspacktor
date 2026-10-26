import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect, useIsFocused } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Knopf } from '@/components/knopf';
import { kisteNachCode } from '@/db/kisten';
import { codeAusQr, normalisiereCode } from '@/lib/kisten-code';
import { ABSTAND, useFarben } from '@/theme/farben';

/** Wie lange ein Hinweis („Kein Kisten-Etikett“) stehen bleibt. */
const HINWEIS_MS = 2500;

export default function Scannen() {
  const db = useSQLiteContext();
  const f = useFarben();
  const insets = useSafeAreaInsets();
  const fokussiert = useIsFocused();
  const [erlaubnis, erlaubnisAnfragen] = useCameraPermissions();
  const [licht, setLicht] = useState(false);
  const [hinweis, setHinweis] = useState<string | null>(null);
  const [eingabe, setEingabe] = useState('');
  // Die Kamera meldet denselben Code viele Male pro Sekunde – nur den ersten verarbeiten.
  const beschaeftigt = useRef(false);
  const letzterFremder = useRef<string | null>(null);
  const hinweisTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useFocusEffect(
    useCallback(() => {
      beschaeftigt.current = false;
      letzterFremder.current = null;
      return () => {
        if (hinweisTimer.current) clearTimeout(hinweisTimer.current);
      };
    }, []),
  );

  function zeigeHinweis(text: string) {
    setHinweis(text);
    if (hinweisTimer.current) clearTimeout(hinweisTimer.current);
    hinweisTimer.current = setTimeout(() => {
      setHinweis(null);
      letzterFremder.current = null;
    }, HINWEIS_MS);
  }

  async function oeffne(code: string) {
    beschaeftigt.current = true;
    const kiste = await kisteNachCode(db, code);
    if (!kiste) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      zeigeHinweis('Zu diesem Etikett gibt es keine Kiste (mehr).');
      // Kurz warten, sonst meldet sich derselbe Code sofort wieder.
      setTimeout(() => (beschaeftigt.current = false), HINWEIS_MS);
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // push statt replace: „Zurück“ führt wieder zum Scanner – praktisch, wenn man mehrere Kisten durchsucht.
    router.push({ pathname: '/kiste/[code]', params: { code: kiste.code } });
  }

  function gescannt({ data }: BarcodeScanningResult) {
    if (beschaeftigt.current) return;
    const code = codeAusQr(data);
    if (code) {
      void oeffne(code);
      return;
    }
    if (letzterFremder.current !== data) {
      letzterFremder.current = data;
      zeigeHinweis('Das ist kein Etikett aus dieser App.');
    }
  }

  function codeEingegeben() {
    const code = normalisiereCode(eingabe);
    if (!code) {
      zeigeHinweis('Der Code hat 6 Zeichen, z. B. K7Q F3M.');
      return;
    }
    setEingabe('');
    void oeffne(code);
  }

  if (!erlaubnis) return <View style={[styles.seite, { backgroundColor: '#000' }]} />;

  if (!erlaubnis.granted) {
    return (
      <View style={[styles.seite, styles.mitte, { backgroundColor: f.hintergrund }]}>
        <MaterialCommunityIcons name="camera-off-outline" size={56} color={f.textLeise} />
        <Text style={[styles.erklaerung, { color: f.text }]}>
          Zum Scannen der Etiketten braucht die App Zugriff auf die Kamera. Fotos werden dabei nicht gespeichert.
        </Text>
        {erlaubnis.canAskAgain ? (
          <Knopf titel="Kamera erlauben" icon="camera-outline" onPress={() => void erlaubnisAnfragen()} />
        ) : (
          <Knopf titel="Einstellungen öffnen" icon="cog-outline" onPress={() => void Linking.openSettings()} />
        )}
      </View>
    );
  }

  return (
    <View style={[styles.seite, { backgroundColor: '#000' }]}>
      {fokussiert ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={licht}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={gescannt}
        />
      ) : null}

      <View style={styles.rahmenBereich}>
        <View style={styles.rahmen} />
        <Text style={styles.anleitung}>Etikett in den Rahmen halten</Text>
        {hinweis ? (
          <View style={styles.hinweis}>
            <Text style={styles.hinweisText}>{hinweis}</Text>
          </View>
        ) : null}
      </View>

      {/* Wandert mit der Tastatur nach oben, damit „Code eintippen“ sichtbar bleibt. */}
      <KeyboardStickyView style={styles.unten} offset={{ closed: 0, opened: insets.bottom }}>
        <View style={[styles.untenInhalt, { paddingBottom: ABSTAND.m + insets.bottom }]}>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: licht }}
            accessibilityLabel="Taschenlampe"
            onPress={() => setLicht((an) => !an)}
            style={({ pressed }) => [
              styles.licht,
              { backgroundColor: licht ? '#FFD54F' : 'rgba(255,255,255,0.16)', opacity: pressed ? 0.8 : 1 },
            ]}>
            <MaterialCommunityIcons name={licht ? 'flashlight' : 'flashlight-off'} size={30} color={licht ? '#1F1408' : '#fff'} />
            <Text style={[styles.lichtText, { color: licht ? '#1F1408' : '#fff' }]}>{licht ? 'Licht aus' : 'Licht an'}</Text>
          </Pressable>

          <View style={styles.eingabeZeile}>
            <TextInput
              value={eingabe}
              onChangeText={setEingabe}
              onSubmitEditing={codeEingegeben}
              placeholder="Code eintippen (z. B. K7Q F3M)"
              placeholderTextColor="rgba(255,255,255,0.6)"
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="go"
              maxLength={9}
              style={styles.eingabe}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Kiste mit Code öffnen"
              onPress={codeEingegeben}
              style={[styles.los, { backgroundColor: f.akzent }]}>
              <MaterialCommunityIcons name="arrow-right" size={24} color={f.aufAkzent} />
            </Pressable>
          </View>
        </View>
      </KeyboardStickyView>
    </View>
  );
}

const styles = StyleSheet.create({
  seite: { flex: 1 },
  mitte: { alignItems: 'center', justifyContent: 'center', gap: ABSTAND.m, padding: ABSTAND.l },
  erklaerung: { fontSize: 16, textAlign: 'center', lineHeight: 22 },
  rahmenBereich: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    alignItems: 'center', justifyContent: 'center', gap: ABSTAND.m },
  rahmen: { width: 240, height: 240, borderRadius: 24, borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)' },
  anleitung: {
    color: '#fff',
    fontSize: 15,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  },
  hinweis: { backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, maxWidth: '85%' },
  hinweisText: { color: '#fff', fontSize: 15, textAlign: 'center' },
  unten: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  untenInhalt: {
    paddingHorizontal: ABSTAND.m,
    paddingTop: ABSTAND.m,
    gap: ABSTAND.m,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  licht: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 64,
    paddingHorizontal: 28,
    borderRadius: 32,
  },
  lichtText: { fontSize: 18, fontWeight: '700' },
  eingabeZeile: { flexDirection: 'row', gap: ABSTAND.s, alignSelf: 'stretch' },
  eingabe: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.14)',
    height: 48,
  },
  los: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
