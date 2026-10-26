import { useColorScheme } from 'react-native';

export type Farben = {
  hintergrund: string;
  flaeche: string;
  flaecheHervor: string;
  rand: string;
  text: string;
  textLeise: string;
  akzent: string;
  aufAkzent: string;
  gefahr: string;
};

/** Farbwelt „Kiste“: Karton-Ocker als Akzent, ruhige Grüntöne als Grund. */
export const FARBEN: Record<'hell' | 'dunkel', Farben> = {
  hell: {
    hintergrund: '#F6F3EC',
    flaeche: '#FFFFFF',
    flaecheHervor: '#EDE7DA',
    rand: '#D9D1C0',
    text: '#1F2A24',
    textLeise: '#5E6A62',
    akzent: '#A0661F',
    aufAkzent: '#FFFFFF',
    gefahr: '#B3261E',
  },
  dunkel: {
    hintergrund: '#121815',
    flaeche: '#1B231F',
    flaecheHervor: '#25302A',
    rand: '#33403A',
    text: '#ECEFEA',
    textLeise: '#A3AFA8',
    akzent: '#E0A458',
    aufAkzent: '#1F1408',
    gefahr: '#F2B8B5',
  },
};

export function useFarben(): Farben {
  return useColorScheme() === 'dark' ? FARBEN.dunkel : FARBEN.hell;
}

export const ABSTAND = { s: 8, m: 16, l: 24 } as const;
export const RADIUS = 14;
