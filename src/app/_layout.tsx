import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { FARBEN } from '@/theme/farben';

export default function RootLayout() {
  return <Navigation />;
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
      </Stack>
    </ThemeProvider>
  );
}
