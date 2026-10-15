# Drittanbieter und reproduzierbarer Kartengenerator

## Cubiomes – MIT

- Original: https://github.com/Cubitect/cubiomes
- Verwendeter Fork: https://github.com/Zes-MinKey-Young/cubiomes
- Commit: `ca9fcb4e2b4f29a88b15a19fe1f00a73bf503ec2`
- Änderung: https://github.com/Cubitect/cubiomes/pull/162
- Enthält `btree215.h`, den Biom-Baum für 1.21.5–1.21.11, statt die Version stillschweigend auf 1.21 WD abzubilden.
- Lokale Änderung in `native/cubiomes/util.c`: `mc2str` / `str2mc` erkennen `MC_1_21_5` als `1.21.11` (gleiche unterstützte Biom-Generation; `1.21.5` wird ebenfalls geparst).
- Lizenz: [vendor/LICENSE-cubiomes.txt](vendor/LICENSE-cubiomes.txt)

## Seed Map Engine – MIT

- https://github.com/afzalimdad9/mc-seed-map
- Commit: `8b7732e3b28f6c3a1ac8ce15b692c22711f314cc`
- C-ABI: `native/engine/src` und `native/engine/include`.
- Lizenz: [vendor/LICENSE-engine.txt](vendor/LICENSE-engine.txt)
- Die Browseroberfläche und Claim-Logik dieser Website sind eigenständig implementiert.

## Build

Der ausgelieferte Generator wurde mit **Emscripten 6.0.12** gebaut. Er nutzt keine WASM-Threads; GitHub Pages benötigt keine speziellen Cross-Origin-Isolation-Header. Für einen optionalen Neubau Emscripten aktivieren und ausführen:

```sh
node native/build.mjs
```

Alternativ `EMCC_PY` auf `emcc.py` und `PYTHON` auf die Python-Programmdatei setzen. Der Build enthält `-fwrapv` für die Integer-Arithmetik von Cubiomes. Es werden nur die benötigten Engine-Funktionen exportiert. Alle für diesen Build benötigten C-Quellen sind im Ordner `native/` enthalten.

Der zuerst untersuchte npm-Build `seedmaps-engine-wasm@0.1.0` wurde für die Auslieferung durch diesen aktualisierten Build ersetzt.
