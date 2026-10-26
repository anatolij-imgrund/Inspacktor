import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { RADIUS, useFarben } from '@/theme/farben';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type Props = {
  titel: string;
  onPress: () => void;
  icon?: IconName;
  art?: 'haupt' | 'neben' | 'gefahr';
  laedt?: boolean;
  deaktiviert?: boolean;
};

export function Knopf({ titel, onPress, icon, art = 'haupt', laedt, deaktiviert }: Props) {
  const f = useFarben();
  const haupt = art === 'haupt';
  const farbeText = haupt ? f.aufAkzent : art === 'gefahr' ? f.gefahr : f.text;
  const aus = deaktiviert || laedt;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!aus, busy: !!laedt }}
      disabled={aus}
      onPress={onPress}
      style={({ pressed }) => [
        styles.knopf,
        {
          backgroundColor: haupt ? f.akzent : f.flaecheHervor,
          opacity: aus ? 0.5 : pressed ? 0.8 : 1,
        },
      ]}>
      {laedt ? (
        <ActivityIndicator color={farbeText} />
      ) : (
        icon && <MaterialCommunityIcons name={icon} size={20} color={farbeText} />
      )}
      <Text style={[styles.text, { color: farbeText }]}>{titel}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  knopf: {
    minHeight: 48,
    borderRadius: RADIUS,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: { fontSize: 16, fontWeight: '600' },
});
