# Veröffentlichungsstand

- Export/Import, Welt-Dropdown, Footer, Farberklärung und zusätzlicher Reservierungsbutton entfernt.
- Kein lokaler Schreibmodus, kein Ersatz-Adminzugang. Ohne Datenbank können Reservierungen nicht als erfolgreich gespeichert werden.
- Admin-Anmeldung mit dem Namen totalhs und einem in Supabase Auth eingerichteten festen Passwort.
- Karte und Reservierung per Kartenklick, Spielerliste und Admin-Zuweisungen werden in Chrome geprüft.
- Unveränderte Datenbankregeln wurden mit PostgreSQL (PGlite) auf öffentliche Lese-/Reservierungsrechte, ausschliessliche Admin-Zuweisung, eindeutige Plotbelegung und Welt-Isolation geprüft.
- Online-Browsertests simulieren Supabase-Antworten. Ein echtes Supabase-Projekt, echte Admin-Zugangsdaten und die GitHub-Veröffentlichung müssen noch eingerichtet und live geprüft werden.
