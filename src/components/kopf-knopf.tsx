import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet } from 'react-native';

import type { IconName } from '@/components/knopf';
import { useFarben } from '@/theme/farben';

/** Symbol-Knopf für die Kopfzeile, mit großer Trefferfläche (48 dp). */
export function KopfKnopf({ icon, beschriftung, onPress }: { icon: IconName; beschriftung: string; onPress: () => void }) {
  const f = useFarben();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={beschriftung}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.knopf, pressed && { backgroundColor: f.flaecheHervor }]}>
      <MaterialCommunityIcons name={icon} size={26} color={f.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  knopf: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
