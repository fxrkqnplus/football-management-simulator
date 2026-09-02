/**
 * `sqlLiterals()` — BORÇ-008'İN ÖDEMESİNİN NÖBETÇİSİ (Faz 4.11).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * İKİ AYRI İDDİA — ve ikincisi olmadan borç sessizce geri açılır
 * ────────────────────────────────────────────────────────────────────────────
 *
 * ① **Fonksiyonun sözleşmesi.** Çıktı, dokuz dosyada duran eski ifadeyle
 *    **birebir aynı** metin olmak zorunda. Bir karakter farklı olsaydı CHECK
 *    kısıtlarının SQL'i değişir, yani **şema** değişirdi — ve `typecheck` bunu
 *    göremezdi. Bu yüzden ödeme ayrıca `drizzle-kit generate` ile de ölçüldü:
 *    yeni migration **çıkmadı**.
 *
 * ② **ONUNCU KOPYANIN YAZILAMAMASI.** BORÇ-008 bir kopyalama borcuydu ve
 *    kopyalama borçları *"artık tek yerde"* denerek kapanmaz — kapandığı gün
 *    doğru olan cümle, bir sonraki tablo eklendiğinde sessizce yanlışa döner
 *    (F1: elle yazılmış envanter, şema büyüyünce bayatlar). Borç 7'den 9'a tam
 *    olarak böyle çıkmıştı: 4.6 iki, 4.7 iki kopya daha ekledi ve hiçbir kapı
 *    ötmedi.
 *
 *    Bu yüzden nöbetçi **hatanın olacağı yerde** yaşıyor: `src/schema/`
 *    altındaki her `.ts` dosyası taranır ve ifadenin yeniden yazıldığı bir
 *    dosya bulunursa test kırılır.
 *
 * ⚠️ **TARAMA NEGATİF BİR İDDİA ve boş bir liste tek başına "yok" diye
 * okunmaz** — tarayıcının gerçekten baktığı, ① taranan dosya sayısının
 * iddia edilmesiyle ② deseni taşıdığı **bilinen** bir metnin yakalandığının
 * gösterilmesiyle ayrıca kanıtlanıyor. Kör bir tarayıcı da boş liste döndürür.
 *
 * ℹ️ **`kit-templates.ts` BU DESENE GİRMİYOR ve bu ölçülerek ayrıldı:**
 * `KIT_COLOR_SLOTS` bir **sayı** dizisi (`[2, 3]`), `.join(', ')` çıktısı
 * `2, 3` — tırnaksız. Buraya bağlanması üretilen SQL'i değiştirirdi. Bu test o
 * dosyayı yakalamamalı ve yakalamadığı ayrıca iddia ediliyor (karşı kontrol).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { sqlLiterals } from './sql-literals.js';

const SCHEMA_DIR = fileURLToPath(new URL('./', import.meta.url));

/**
 * BORÇ-008'in ifadesinin imzası: bir dizinin her elemanını **tek tırnağa**
 * saran ve virgülle birleştiren satır içi bir `map`. Bu modülün kendi gövdesi
 * dışında hiçbir yerde bulunmamalı.
 */
const INLINE_COPY = /\.map\(\([^)]*\)\s*=>\s*`'\$\{[^}]*\}'`\)/;

/** `sqlLiterals`ın kendi gövdesini taşıyan dosya — tarama onu bilerek atlar. */
const OWNER_FILE = 'sql-literals.ts';

function schemaSourceFiles(): string[] {
  return readdirSync(SCHEMA_DIR)
    .filter((name) => name.endsWith('.ts'))
    .filter((name) => !name.endsWith('.test.ts') && !name.endsWith('.test-d.ts'))
    .sort();
}

describe('sqlLiterals — kapalı kümeyi SQL literal listesine çevirir', () => {
  it('değerleri tek tırnağa sarar ve virgül+boşlukla birleştirir', () => {
    expect(sqlLiterals(['male', 'female'])).toBe("'male', 'female'");
  });

  it('tek elemanlı kümede ayraç ÜRETMEZ', () => {
    expect(sqlLiterals(['procedural'])).toBe("'procedural'");
  });

  it('boş kümede boş dize döner', () => {
    expect(sqlLiterals([])).toBe('');
  });

  it('KARŞI ÖRNEK — sayı gibi görünen değerler de TIRNAKLANIR', () => {
    // `kit_templates.colorSlots` tam olarak bunu istemediği için buraya
    // bağlanmadı: orada beklenen çıktı `2, 3`, burada üretilen `'2', '3'`.
    expect(sqlLiterals(['2', '3'])).toBe("'2', '3'");
  });

  it('girdi dizisini DEĞİŞTİRMEZ (saflık)', () => {
    const input = ['a', 'b'];
    sqlLiterals(input);
    expect(input).toEqual(['a', 'b']);
  });
});

describe('BORÇ-008 — ifade tek yerde yaşıyor, onuncu kopya yazılamaz', () => {
  it('`src/schema/` altında ifadenin YENİDEN YAZILDIĞI hiçbir dosya yok', () => {
    const offenders = schemaSourceFiles()
      .filter((name) => name !== OWNER_FILE)
      .filter((name) => INLINE_COPY.test(readFileSync(SCHEMA_DIR + name, 'utf8')));

    expect(offenders).toEqual([]);
  });

  it('KARŞI KONTROL — tarayıcı kör değil: sahibinin gövdesinde deseni BULUYOR', () => {
    const owner = readFileSync(SCHEMA_DIR + OWNER_FILE, 'utf8');

    expect(INLINE_COPY.test(owner)).toBe(true);
  });

  it('KARŞI KONTROL — tarama boş bir dosya kümesi üzerinde koşmuyor', () => {
    // Boş bir liste "ihlal yok" diye okunur; kaç dosyaya bakıldığı ayrıca
    // iddia edilmezse tarayıcı hiçbir şeye bakmadan da yeşil verir.
    expect(schemaSourceFiles().length).toBeGreaterThanOrEqual(20);
    expect(schemaSourceFiles()).toContain(OWNER_FILE);
  });

  it('ifadeyi kullanan her dosya modülü İTHAL EDİYOR (dokuz dosya)', () => {
    const importers = schemaSourceFiles().filter(
      (name) =>
        name !== OWNER_FILE && readFileSync(SCHEMA_DIR + name, 'utf8').includes('sqlLiterals('),
    );

    expect(importers).toEqual([
      'club-kits.ts',
      'competitions.ts',
      'countries.ts',
      'data-pack-columns.ts',
      'managers.ts',
      'people.ts',
      'player-positions.ts',
      'players.ts',
      'staff.ts',
    ]);
  });

  it('KARŞI KONTROL — `kit-templates.ts` bu listede DEĞİL ve olmamalı', () => {
    const source = readFileSync(SCHEMA_DIR + 'kit-templates.ts', 'utf8');

    expect(source).not.toContain('sqlLiterals(');
    expect(source).toContain("KIT_COLOR_SLOTS.join(', ')");
  });
});
