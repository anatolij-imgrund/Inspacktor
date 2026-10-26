import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { DATENBANK_NAME, initialisiere } from '@/db/datenbank';
import { FARBEN } from '@/theme/farben';

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName={DATENBANK_NAME} onInit={initialisiere}>
      {/* SQLiteProvider ist memo – alles Theme-Abhängige muss darunter in eigener Komponente leben. */}
      <Navigation />
    </SQLiteProvider>
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
        <Stack.Screen name="etiketten" options={{ title: 'Etiketten drucken' }} />
      </Stack>
    </ThemeProvider>
  );
}
