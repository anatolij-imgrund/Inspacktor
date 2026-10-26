import Svg, { Path, Rect } from 'react-native-svg';

import { qrGroesse, qrMatrix, qrPfad } from '@/lib/qr';

/** QR-Code immer schwarz auf weiß – im dunklen Design invertierte Codes lesen viele Scanner nicht. */
export function QrCode({ inhalt, groesse }: { inhalt: string; groesse: number }) {
  const matrix = qrMatrix(inhalt);
  const g = qrGroesse(matrix);
  return (
    <Svg width={groesse} height={groesse} viewBox={`0 0 ${g} ${g}`}>
      <Rect width={g} height={g} fill="#fff" />
      <Path d={qrPfad(matrix)} fill="#000" />
    </Svg>
  );
}
