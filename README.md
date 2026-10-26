# Vorratsliste

Android-App zum Verwalten von Kisten: Jede Kiste bekommt Foto, Titel,
Standort und Beschreibung sowie ein QR-Etikett. Scannt man das Etikett,
zeigt die App sofort, was in der Kiste ist – auch im Dunkeln, dank
zuschaltbarem Licht beim Scannen.

## Technik

- Expo SDK 58, React Native 0.88, React 19, React Compiler
- Expo Router (Dateien unter `src/app`), TypeScript strict
- expo-sqlite (Daten bleiben lokal auf dem Gerät)
- expo-camera (QR-Scanner mit Taschenlampe), expo-print (PDF/Druck)

## Entwicklung

```powershell
npm install
npx expo start
```

Prüfungen:

```powershell
npm run typecheck
npm run lint
npm test
```

Builds über EAS:

```powershell
npx eas-cli@latest build -p android --profile preview
```

## Lizenz

Alle Rechte vorbehalten – siehe [LICENSE](LICENSE).
