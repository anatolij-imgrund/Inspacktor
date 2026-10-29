# Google Play: Eintrag und Antworten

Alles, was die Play Console für Inspacktor 1.0 fragt, zum Kopieren.
Bilder liegen in diesem Ordner: `play-icon-512.png` (App-Symbol),
`feature-grafik.png` (Feature-Grafik 1024 × 500) und `screenshots/`
(Smartphone-Screenshots 1080 × 1920).

## Store-Eintrag (Deutsch)

**App-Name** (max. 30 Zeichen, hier 28)

```
Inspacktor – Kisten & Inhalt
```

**Kurzbeschreibung** (max. 80 Zeichen, hier 80)

```
Kisten mit Foto und Inhalt erfassen, QR-Etikett drucken, später einfach scannen.
```

**Vollständige Beschreibung** (max. 4000 Zeichen)

```
Was war noch mal in welcher Kiste? Inspacktor hilft dir, das nie wieder suchen zu müssen. Beim Einpacken fotografierst du die Gegenstände und notierst kurz, was es ist. Die App druckt dazu ein QR-Etikett für die Kiste. Später reicht ein Scan, und du siehst sofort, was drin ist – auch auf dem dunklen Dachboden, dank Taschenlampe im Scanner.

KISTEN UND INHALT
• Kiste mit Foto, Titel, Standort und Beschreibung anlegen
• Darin beliebig viele Gegenstände, jeder mit Foto, Beschreibung und Menge
• „Speichern und nächsten“: Gegenstände beim Einpacken Stück für Stück erfassen
• Gegenstände in eine andere Kiste verschieben, wenn du umpackst
• Ideal für Saisonkleidung, Kinderkleidung nach Größen, Deko, Werkzeug, Erinnerungen

SUCHEN UND FINDEN
• Eine Suche über alle Kisten und alles, was darin liegt
• Mehrere Wörter grenzen ein: „dach jacke“ findet die Kiste auf dem Dachboden mit der Jacke
• Die Trefferliste zeigt, welcher Gegenstand gepasst hat

QR-ETIKETTEN
• Für jede Kiste ein Etikett mit QR-Code, Titel, Standort und kurzem Code
• Klein (10 pro A4-Seite) oder groß (2 pro Seite)
• Drucken, als PDF speichern oder teilen
• Mehrere Kisten auf einem Bogen drucken
• Ist ein Etikett beschädigt, tippst du den Code einfach ab

SCANNEN, AUCH IM DUNKELN
• Etikett in die Kamera halten, die Kiste öffnet sich sofort
• Taschenlampe direkt im Scanner ein- und ausschalten
• Mehrere Kisten nacheinander durchscannen

DEINE DATEN BLEIBEN BEI DIR
• Kein Konto, keine Werbung, kein Server des Entwicklers
• Alle Kisten, Gegenstände und Fotos liegen nur auf deinem Handy
• Datensicherung mit allen Fotos in einen Ordner auf dem Handy oder über Google Drive, E-Mail …
• Einzige Berechtigung ist die Kamera

Hell oder dunkel, passend zu deinem Handy.
```

**Kategorie:** Haus & Garten bzw. „House & Home“ (genaue Bezeichnung in der
Play Console prüfen; Alternative: Produktivität)
**Tags:** Organisation, Haushalt, Aufbewahrung (soweit angeboten)
**E-Mail für Nutzer:** anatolij.imgrund@gmail.com
**Website:** https://github.com/anatolij-imgrund/Inspacktor
**Datenschutzerklärung:** https://anatolij-imgrund.github.io/Inspacktor/datenschutz.html

**Versionshinweise 1.0.0** (max. 500 Zeichen)

```
Erste Version: Kisten und Gegenstände mit Fotos erfassen, QR-Etiketten drucken, mit Taschenlampe scannen und alles samt Fotos sichern.
```

## App-Inhalte (Richtlinien)

| Frage | Antwort |
| --- | --- |
| Datenschutzerklärung | URL oben |
| App-Zugriff | Alle Funktionen ohne Anmeldung oder Einschränkung verfügbar |
| Werbung | Nein, die App enthält keine Werbung |
| Einstufung des Inhalts | Fragebogen: Kategorie „Alle anderen App-Typen“ bzw. Dienstprogramm/Produktivität. Gewalt, Sex, Drogen, Glücksspiel: nein. Nutzer interagieren nicht miteinander, keine Inhalte werden zwischen Nutzern geteilt, kein Standort wird geteilt, keine Käufe. |
| Zielgruppe | 18 Jahre und älter. Die App richtet sich nicht an Kinder. |
| Nachrichten-App | Nein |
| Behörden-App | Nein |
| Finanzfunktionen | Keine |
| Gesundheit | Keine Gesundheitsfunktionen |
| COVID-19 / Kontaktverfolgung | Nein |

## Datensicherheit

Grundlage: [Angaben von Google zu ML Kit](https://developers.google.com/ml-kit/android-data-disclosure)
(Barcode-Scanning, gebündeltes Modell). Die App selbst sendet nichts; der
QR-Scanner (ML Kit) sendet technische Daten an Google. Die Antworten sind
dieselben wie bei Jobspur.

| Frage | Antwort |
| --- | --- |
| Erhebt oder teilt die App Nutzerdaten der genannten Typen? | **Ja** |
| Werden alle Daten bei der Übertragung verschlüsselt? | **Ja** |
| Können Nutzer die Löschung ihrer Daten beantragen? | **Nein** (die App hat keinen Server; Einträge löscht man direkt in der App) |

Erhobene Datentypen:

| Datentyp | Erhoben | Geteilt | Verarbeitung | Zweck |
| --- | --- | --- | --- | --- |
| App-Informationen und -Leistung → Diagnosedaten | Ja | Nein | Nicht flüchtig, erforderlich | Analysen |
| Geräte- oder andere IDs | Ja | Nein | Nicht flüchtig, erforderlich | Analysen |

Alles andere (Name, E-Mail, Fotos, Standort, Kontakte, Nachrichten, Dateien …):
**nicht erhoben.** Kisten, Gegenstände, Fotos und Sicherungen bleiben auf dem
Gerät und gelten bei Google Play nicht als „erhoben“.

> Einschätzung nach bestem Wissen, keine Rechtsberatung. Für die Angaben im
> Formular ist der Entwickler verantwortlich.

## Veröffentlichung Schritt für Schritt

1. **Repository umbenennen** (falls noch nicht geschehen): auf GitHub unter
   *Settings → General* in `Inspacktor`. Sonst stimmen die Links oben nicht.
2. **Datenschutzseite online stellen:** unter *Settings → Pages*
   „Deploy from a branch“ wählen, Branch `main`, Ordner `/docs`.
   Nach ein, zwei Minuten ist die Seite unter der URL oben erreichbar.
3. **App anlegen:** In der Play Console „App erstellen“: Name wie oben, Sprache
   Deutsch, App (nicht Spiel), kostenlos.
4. **App-Bundle bauen:**
   `npx eas-cli@latest build -p android --profile production`
   Ergebnis ist eine `.aab`-Datei. Das erste Bundle lädt man von Hand hoch.
5. **Geschlossener Test:** *Testen → Geschlossene Tests*: Track anlegen, Bundle
   hochladen, Tester per E-Mail-Liste eintragen (mindestens 12, mit
   Google-Konto), Versionshinweise wie oben. Die Tester-Liste von Jobspur lässt
   sich wiederverwenden.
6. **14 Tage durchhalten:** Mindestens 12 Tester müssen 14 Tage am Stück dabei
   sein. Danach kann man die Produktion beantragen.
7. **Store-Eintrag, App-Inhalte, Datensicherheit** mit den Texten in dieser
   Datei ausfüllen; Grafiken aus diesem Ordner hochladen.
