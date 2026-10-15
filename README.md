# Website veröffentlichen – Schritt für Schritt

Die fertige Website braucht keinen Build. Dateien hochladen genügt, sobald du die gemeinsame Datenbank und das Admin-Konto eingerichtet hast. Loginname: **totalhs**. Das von dir gewählte feste Passwort setzt du direkt in Supabase Auth; es ist absichtlich nicht in den öffentlichen Dateien enthalten.

## 1. Supabase-Projekt erstellen

1. https://supabase.com/ öffnen und anmelden.
2. **New project** wählen, Projektname eingeben und ein Datenbank-Passwort festlegen. Dieses Datenbank-Passwort ist NICHT dein Website-Admin-Passwort.
3. Warten, bis das Projekt bereit ist.

Falls du schon ein Projekt eingerichtet hast, dieses weiterverwenden.

## 2. Tabellen und Berechtigungen einrichten

1. In Supabase links **SQL Editor** öffnen.
2. **New query** wählen.
3. Die Datei **setup.sql** mit einem Texteditor öffnen, alles kopieren und in den SQL Editor einfügen.
4. **Run** klicken. Es darf keine Fehlermeldung erscheinen.

Das Skript kann erneut ausgeführt werden. Bestehende Daten bleiben erhalten. `migration-v2.sql` enthält dasselbe Skript und muss nicht zusätzlich ausgeführt werden.

## 3. Admin-Zugang anlegen

1. **Authentication → Users → Add user → Create new user** öffnen.
2. Als E-Mail exakt **admin@chunk-atlas.invalid** eintragen. Sie dient als interne Kennung; die Website fragt später nur nach dem Namen `totalhs`.
3. Im Passwortfeld **das von dir im Chat gewünschte feste Admin-Passwort** eintragen.
4. **Auto Confirm User** aktivieren und das Konto erstellen.
5. Zurück in **SQL Editor → New query** den Inhalt von **admin-setup.sql** einfügen und **Run** drücken.

Erst Schritt 5 verleiht dem Konto Admin-Rechte. Falls dieses Konto bereits existiert, kein zweites anlegen: sein Passwort im Auth-Dashboard auf das gewünschte Passwort setzen und das Admin-Skript ausführen. Kein Passwort in `config.js` oder eine andere Datei schreiben.

## 4. Website mit Supabase verbinden

1. In Supabase die **Project URL** und unter **API Keys** den **Publishable Key** (alternativ den bisherigen `anon`-Key) kopieren.
2. **config.js** im entpackten Website-Ordner öffnen.
3. Nur die beiden leeren Werte einfügen:

```js
export const config = {
  supabaseUrl: 'https://DEIN-PROJEKT.supabase.co',
  supabaseKey: 'DEIN-PUBLISHABLE-KEY',
  worldId: 'main',
  adminUsername: 'totalhs',
  adminEmail: 'admin@chunk-atlas.invalid',
};
```

Die öffentlichen API-Werte dürfen auf GitHub stehen. **Keinen Secret-/service_role-Key verwenden.** Das Passwort bleibt ausschliesslich in Supabase Auth.

## 5. Deinen Seed einstellen

1. **Table Editor → worlds** öffnen.
2. Den Eintrag mit `id = main` bearbeiten.
3. `seed`: deinen Minecraft-Seed als Text eintragen.
4. `version`: **1.21.11** beibehalten.
5. `example`: **false** setzen. Speichern.

Der mitgelieferte Startwert ist `42`. Für eine spätere neue Welt eine neue Welt-ID verwenden und den Admin dafür freischalten, damit alte Plots nicht versehentlich auf einer anderen Welt liegen.

## 6. Auf GitHub veröffentlichen

1. Neues GitHub-Repository erstellen, mit GitHub Free üblicherweise öffentlich.
2. **Add file → Upload files** wählen.
3. Den **Inhalt** des entpackten Ordners hochladen – nicht die ZIP und nicht nur den übergeordneten Ordner. `index.html`, `config.js`, `app.js` und der Ordner `vendor/` müssen direkt im Repository liegen. `.nojekyll` mitnehmen.
4. **Commit changes** klicken.
5. **Settings → Pages** öffnen.
6. **Source: Deploy from a branch**, **Branch: main**, **Folder: / (root)** auswählen und speichern.
7. Warten, bis GitHub die Website-Adresse anzeigt. Diese Adresse öffnen.

## 7. Funktion prüfen

1. Ohne Anmeldung auf ein freies Kartenfeld klicken, Namen eingeben und reservieren.
2. **Admin-Login** öffnen. Name: **totalhs**. Passwort: das in Schritt 3 gesetzte Passwort.
3. Unter **Spieler → + Spieler** einen Namen mit Farbe anlegen.
4. Reservierten Plot anklicken, Spieler wählen und **Zuweisen & einfärben** drücken.
5. Die Website in einem privaten Browserfenster öffnen. Die Spielerliste und der gefärbte Plot müssen dort ebenfalls sichtbar sein. Aktualisierung innerhalb von acht Sekunden.

## Bedienung

- Ein Plot besteht aus **2 × 2 Chunks**, also 32 × 32 Blöcken.
- Reservieren erfolgt ausschliesslich per Klick auf ein freies Kartenfeld, ohne Benutzerkonto.
- Reservierungen sind neutral/gestrichelt. Erst der Admin weist einen Spieler und dessen Farbe zu.
- Öffentliche Besucher sehen Karte, Namen, Farben und alle Plots.
- Nur der Admin kann Spielerfarben ändern, Plots zuweisen oder freigeben.
- Reservierungsnamen sind frei eingetragen, nicht verifizierte Minecraft-Konten.
- Die Markierungen schützen nichts im Minecraft-Spiel.

## Lokal öffnen

Mit Node.js: `node serve.mjs`, danach http://localhost:4173 öffnen. Falls Node bei dir nicht im PATH liegt:

```powershell
& "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" serve.mjs
```

Terminal offen lassen. Ohne konfigurierte Datenbank kann die Karte angezeigt werden; Reservierung und Admin-Anmeldung sind dann nicht verfügbar. Es gibt keinen lokalen Schreibmodus und keinen Ersatz-Adminzugang.

## Generator und Bestandsschutz

Minecraft-Java-Biomkarte auf Y=64, keine Darstellung von Spielerbauten oder Höhenrelief. 1.21.11 verwendet den dokumentierten Community-Patch aus Cubiomes PR #162. Details und Lizenzen: **THIRD_PARTY.md**. Bedrock, Large Biomes und modifizierte Generatoren werden nicht unterstützt.

Die Datenbankregeln sind unverändert zur Plot-Version. Alte v1-Claims bleiben in der alten Tabelle erhalten; sie werden nicht automatisch in 4-Chunk-Plots umgerechnet. Passwörter und Datenbank-Geheimschlüssel sind nicht Bestandteil des Website-Pakets.

Tests: `npm install`, `npm test`, `npm run test:db`; bei laufendem Server zusätzlich `npm run test:browser` und `npm run test:online`. Nur Entwicklungstests benötigen die npm-Pakete. Siehe **VALIDATION.md**.
