import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { DATENBANK_NAME, initialisiere } from '@/db/datenbank';
import { FARBEN } from '@/theme/farben';

/** Öffnet die Handy-Kamera einen Kisten-Link, liegt die Übersicht darunter – „Zurück“ landet dort. */
export const unstable_settings = { anchor: 'index' };

export default function RootLayout() {
  return (
    // KeyboardProvider meldet die Tastatur an die Formulare, damit Felder nicht verdeckt werden.
    // Die drei Schalter sagen ihm, dass die App „von Kante zu Kante“ zeichnet (Standard ab Android 15
    // und in Expo SDK 58). Ohne sie stellt er Android auf undurchsichtige System-Leisten um:
    // weiße Leisten im dunklen Design und doppelter Abstand unter der Statusleiste.
    <KeyboardProvider statusBarTranslucent navigationBarTranslucent preserveEdgeToEdge>
      <SQLiteProvider databaseName={DATENBANK_NAME} onInit={initialisiere}>
        {/* SQLiteProvider ist memo – alles Theme-Abhängige muss darunter in eigener Komponente leben. */}
        <Navigation />
      </SQLiteProvider>
    </KeyboardProvider>
  );
}

function Navigation() {
  const dunkel = useColorScheme() === 'dark';
  const f = dunkel ? FARBEN.dunkel : FARBEN.hell;
  const basis = dunkel ? DarkTheme : DefaultTheme;

  return (
    <ThemeProvider
      value={{
        ...basis,
        colors: {
          ...basis.colors,
          primary: f.akzent,
          background: f.hintergrund,
          card: f.hintergrund,
          text: f.text,
          border: f.rand,
        },
      }}>
      <StatusBar style={dunkel ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShadowVisible: false, contentStyle: { backgroundColor: f.hintergrund } }}>
        <Stack.Screen name="index" options={{ title: 'Meine Kisten' }} />
        <Stack.Screen name="neue-kiste" options={{ title: 'Neue Kiste' }} />
        <Stack.Screen name="kiste/[code]/index" options={{ title: '' }} />
        <Stack.Screen name="kiste/[code]/bearbeiten" options={{ title: 'Kiste bearbeiten' }} />
        <Stack.Screen name="kiste/[code]/gegenstand/neu" options={{ title: 'Neuer Gegenstand' }} />
        <Stack.Screen name="kiste/[code]/gegenstand/[id]/index" options={{ title: '' }} />
        <Stack.Screen name="kiste/[code]/gegenstand/[id]/bearbeiten" options={{ title: 'Gegenstand bearbeiten' }} />
        <Stack.Screen name="kiste/[code]/gegenstand/[id]/verschieben" options={{ title: 'Verschieben nach …' }} />
        <Stack.Screen name="etiketten" options={{ title: 'Etiketten drucken' }} />
        <Stack.Screen
          name="scannen"
          options={{
            title: 'Kiste scannen',
            headerStyle: { backgroundColor: '#000' },
            headerTintColor: '#fff',
            contentStyle: { backgroundColor: '#000' },
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
