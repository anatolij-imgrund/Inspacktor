import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

import { KistenFormular } from '@/components/kisten-formular';
import { legeKisteAn, standorte } from '@/db/kisten';
import { fotoFuerSpeichern } from '@/lib/foto-speichern';
import { loescheFoto } from '@/lib/fotos';
import { LEERES_FORMULAR } from '@/lib/kisten-formular';

export default function NeueKiste() {
  const db = useSQLiteContext();
  const [vorschlaege, setVorschlaege] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      void standorte(db).then(setVorschlaege);
    }, [db]),
  );

  return (
    <KistenFormular
      anfang={LEERES_FORMULAR}
      anfangsFoto={null}
      standortVorschlaege={vorschlaege}
      speichernText="Kiste anlegen"
      onSpeichern={async (werte, auswahl) => {
        const foto = await fotoFuerSpeichern(auswahl);
        try {
          const kiste = await legeKisteAn(db, { ...werte, foto });
          router.replace({ pathname: '/kiste/[code]', params: { code: kiste.code } });
        } catch (fehler) {
          loescheFoto(foto);
          throw fehler;
        }
      }}
    />
  );
}
