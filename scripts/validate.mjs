// Szybka walidacja plików z data/: node scripts/validate.mjs
import fs from 'node:fs';
import path from 'node:path';

let errors = 0;
for (const kind of ['books', 'movies']) {
  const dir = path.join('data', kind);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8').replace(/^﻿/, ''));
      const entries = Array.isArray(raw) ? raw : raw.pozycje;
      if (!Array.isArray(entries)) throw new Error('brak tablicy pozycji');
      entries.forEach((e, i) => {
        for (const k of ['tytuł', 'gatunek', 'kategoria_wiekowa', 'opis'])
          if (!e[k]) { console.warn(`${kind}/${f} #${i + 1}: brak pola "${k}"`); errors++; }
        if (!(e.autor ?? e['reżyser'])) { console.warn(`${kind}/${f} #${i + 1}: brak "autor"/"reżyser"`); errors++; }
      });
      console.log(`OK ${kind}/${f}: ${entries.length} pozycji`);
    } catch (e) { console.error(`BŁĄD ${kind}/${f}: ${e.message}`); errors++; }
  }
}
process.exit(errors ? 1 : 0);
