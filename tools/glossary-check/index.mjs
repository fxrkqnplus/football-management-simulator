/**
 * `docs/glossary.md` AYRIŞTIRICISI — sözlüğün sayısı ve kapsamı buradan gelir.
 *
 * ⚠️ **BU BİR ÖLÇÜM ARACI, YANİ KENDİSİ DE ÖLÇÜLMESİ GEREKEN BİR ŞEY (D2).**
 * Karşı kontrolü `index.test.mjs`te: bilinen bir terim tablosu **okunmalı**,
 * terim OLMAYAN bir tablo **okunmamalı**. İkisi gösterilmeden bu aracın
 * ürettiği sayı bir iddia değil bir umuttur.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * NEDEN VAR — bir sayı prose'da yaşarsa bayatlar
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Kabul kriteri *"sözlükte en az 120 terim tanımlı"* diyor. O sayı belgeye
 * *"133 terim"* diye yazılsaydı, tablodan bir satır silindiğinde cümle sessizce
 * yalan söylemeye başlardı ve hiçbir kapı bunu göremezdi — ödenmiş bedel:
 * `docs/schema/world.md`nin programatik bloğu güncel kalırken **prose dört
 * ayrı yerde bayatladı** (4.11'de ölçüldü).
 *
 * ⚠️ **VE UZUNLUK TEK BAŞINA KÖR BİR KONTROLDÜR** (5.1'in dersi): 133 tane
 * `Roma | Roma` satırı da eşiği geçerdi. Bu yüzden test **kaynak bazında**
 * dağılımı ayrı ayrı sabitliyor ve çekirdeğin `CLAUDE.md` §14 ile **hem terim
 * hem karşılık** olarak eşleştiğini iddia ediyor.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * TERİM TABLOSU NASIL AYIRT EDİLİYOR
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Belgede terim taşımayan tablolar da var (isimlendirme standardı, sözlük ile
 * çeviri dosyasının karşılaştırması, kullanılmayacak terimler, henüz yazılmamış
 * kaynaklar). Ayraç **başlık satırı**: yalnızca
 * `| Kod (İngilizce) | Arayüz (Türkçe) |` başlıklı tablolar terim taşır.
 *
 * Bu bir tahmin değil bir **sözleşme**: yeni bir terim tablosu eklenirken aynı
 * başlık kullanılır, yoksa sayıya girmez ve test bunu söyler.
 */
import { readFileSync } from 'node:fs';

/** Terim tablolarının bağlayıcı başlığı. */
export const TERM_TABLE_HEADER = '| Kod (İngilizce) | Arayüz (Türkçe) |';

/** Ayrıştırılmış bir terim. */
/** @typedef {{en: string, tr: string, section: string, line: number}} Term */

const isSeparator = (line) => /^\|[\s:-]+\|[\s:-]+\|$/.test(line);

/**
 * Bir markdown metnindeki terim tablolarını okur. SAF — dosya sistemine
 * dokunmuyor, böylece karşı kontrol testleri onu doğrudan sınayabiliyor.
 *
 * @param {string} text
 * @returns {Term[]}
 */
export function parseTerms(text) {
  /** @type {Term[]} */
  const terms = [];
  let section = '(başlıksız)';
  let inTable = false;

  text.split('\n').forEach((raw, index) => {
    const line = raw.trim();

    if (line.startsWith('#')) {
      section = line.replace(/^#+\s*/, '');
      inTable = false;
      return;
    }

    if (line === TERM_TABLE_HEADER) {
      inTable = true;
      return;
    }

    if (!line.startsWith('|')) {
      inTable = false;
      return;
    }

    if (!inTable || isSeparator(line)) return;

    const cells = line.split('|').map((cell) => cell.trim());
    // `| a | b |` -> ['', 'a', 'b', '']
    if (cells.length !== 4) return;

    terms.push({ en: cells[1], tr: cells[2], section, line: index + 1 });
  });

  return terms;
}

/**
 * `CLAUDE.md` §14'ün çekirdek tablosunu okur.
 *
 * ⚠️ Bölüm sınırı **başlıklarla** çiziliyor, satır numarasıyla değil: anayasaya
 * bir bölüm eklendiğinde satır numarası kayar ama başlık kaymaz.
 */
export function parseSection14(text) {
  const start = text.indexOf('# 14. TERİM SÖZLÜĞÜ');
  if (start === -1) return [];
  const rest = text.slice(start);
  const end = rest.indexOf('\n# ', 1);
  return parseTerms(end === -1 ? rest : rest.slice(0, end));
}

/**
 * Bir TypeScript kaynağındaki dize dizisi/nesnesi sabitini okur.
 *
 * ⚠️ **NEDEN IMPORT DEĞİL, AYRIŞTIRMA.** `tools/` altındaki kapılar birer
 * `.mjs` ve derlenmemiş `.ts` modüllerini çağıramazlar; `@fms/db`yi `dist`
 * üzerinden almak ise bu testi bir **derleme sırasına** bağlardı. Emsal
 * `tools/i18n-check` (dinamik anahtar beyanını aynı şekilde okuyor) ve
 * `tools/arch-check` (şema dosyalarını ayrıştırıyor).
 *
 * ⚠️ **TİP KONUMLARI ATLANIYOR:** `as const satisfies Readonly<Record<...>>`
 * içindeki dize literalleri bir sabitin ÜYESİ değildir.
 */
export function parseStringConstant(ts, text, name) {
  const sf = ts.createSourceFile('c.ts', text, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
  /** @type {string[]} */
  const values = [];
  let found = false;

  const collect = (node) => {
    if (ts.isTypeNode(node)) return;
    if (ts.isStringLiteral(node)) values.push(node.text);
    ts.forEachChild(node, collect);
  };

  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === name &&
      node.initializer !== undefined
    ) {
      found = true;
      collect(node.initializer);
      return;
    }
    ts.forEachChild(node, visit);
  };

  visit(sf);
  return found ? values : null;
}

/** Bir dosyayı okuyup terimlerini döner. */
export function readTerms(file) {
  return parseTerms(readFileSync(file, 'utf8'));
}
