/**
 * `.env` içerik kapısı — web üretim derlemesinden önce çalışır.
 *
 * NEDEN VAR: Vite, `.env` dosyasında `NODE_ENV` bulursa onu kendi
 * üretim/geliştirme kararına uygular. `.env`'de `NODE_ENV=development` varken
 * `vite build` çalıştırmak React'in GELİŞTİRME sürümünü üretim paketine koyar.
 * Derleme hatasız görünür; paket ölçülen değerlerle 228 kB'den 429 kB'ye çıkar
 * (%47) ve tarayıcıya dev uyarı makinesi gider. Sessiz bir kalite kaybı.
 *
 * NEDEN vite.config.ts'te DEĞİL: orada `loadEnv` sonucuna bakmak yanıltıyor —
 * Vite derleme sırasında `process.env.NODE_ENV`'i kendisi 'production' yapıyor
 * ve `loadEnv` bunu dosyadan gelmiş gibi birleştiriyor. İlk denemede kapı bu
 * yüzden temiz bir depoda da hata verdi. Doğru ölçüm, dosyanın kendisine
 * bakmak.
 *
 * Bootstrap betiği: logger yok, console yok (K8), doğrudan stderr.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Depo .env dosyalarında tanımlanması yasak değişkenler ve gerekçeleri. */
const FORBIDDEN = {
  NODE_ENV:
    'Vite bunu üretim/geliştirme kararına uygular; "development" kalırsa React\n' +
    '      geliştirme sürümü üretim paketine girer. Ortamı çalışma zamanı belirler\n' +
    '      (konteyner, süreç yöneticisi, CI); packages/shared/src/env.ts zaten\n' +
    '      "development" varsayılanı veriyor.',
};

const violations = [];

for (const file of ['.env', '.env.example']) {
  const path = join(root, file);
  if (!existsSync(path)) continue;

  const lines = readFileSync(path, 'utf8').split('\n');
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq < 0) return;
    const name = trimmed.slice(0, eq).trim();
    if (Object.hasOwn(FORBIDDEN, name)) {
      violations.push({ file, line: index + 1, name, reason: FORBIDDEN[name] });
    }
  });
}

if (violations.length > 0) {
  process.stderr.write('\n  ✖ .env dosyasında tanımlanmaması gereken değişken var:\n\n');
  for (const v of violations) {
    process.stderr.write(`    ${v.file}:${String(v.line)}  ${v.name}\n`);
    process.stderr.write(`      ${v.reason}\n\n`);
  }
  process.stderr.write(`    Çözüm: ilgili satırı silin.\n\n`);
  process.exit(1);
}
