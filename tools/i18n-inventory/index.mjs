/**
 * İHLAL ENVANTERİ — JSX'te çıplak, kullanıcıya görünen metin.
 *
 * ⚠️ **BU BİR ÖLÇÜM ARACI, YANİ KENDİSİ DE ÖLÇÜLMESİ GEREKEN BİR ŞEY (D2).**
 * Karşı kontrolü `index.test.mjs`te: bilinen bir ihlal listede **çıkmalı**,
 * bilinen bir ihlal-olmayan listede **çıkmamalı**. İkisi gösterilmeden bu
 * aracın ürettiği sayı bir iddia değil bir umuttur.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * NEDEN AST, NEDEN KABA TARAMA DEĞİL — kanıtlandı
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Türkçe karakter araması **iki yönde birden** yanılıyor:
 *   • **Yanlış negatif:** `ErrorBoundary.tsx`'teki `Tekrar dene` gerçek bir K5
 *     ihlali ve hiçbir `çğışöü` taşımıyor → tarama **0** döndürüyor.
 *   • **Yanlış pozitif:** Türkçe yorum satırları ve `logger` mesajları
 *     eşleşiyor — oysa K5 **arayüz metnini** yasaklıyor, yorumu değil
 *     (SAPMA-010: `AppError.message` geliştirici mesajıdır, çevrilmez).
 *
 * TypeScript'in kendi ayrıştırıcısı bu ayrımı yapabiliyor: **JSX metin
 * düğümü** ile **yorum** ayrı şeyler, ve bir dize literalinin JSX
 * niteliğinde mi yoksa bir `logger.info()` argümanında mı durduğu görülebilir.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * KAPSAM — ROADMAP'in cümlesi: "JSX içinde çıplak Türkçe metin"
 * ────────────────────────────────────────────────────────────────────────────
 *
 *   ① `JsxText` düğümleri (boşluk olmayan içerik)
 *   ② Kullanıcıya görünen JSX **niteliklerindeki** dize literalleri
 *      (`USER_FACING_ATTRIBUTES`) — `title`, `aria-label`, `placeholder`, `alt`
 *   ③ JSX ifade kabındaki (`{...}`) düz dize literalleri — koşullu metin
 *      (`{ok ? 'Bitti' : 'Hata'}`) bu sınıfa giriyor ve kullanıcı onu görüyor
 *
 * **KAPSAM DIŞI ve bu bilinçli:** yorumlar · `logger.*()` argümanları ·
 * `AppError`/`new *Error({message})` · `data-testid` gibi teknik nitelikler ·
 * `import` belirteçleri · tip konumları. Hiçbiri kullanıcıya görünmüyor.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import ts from 'typescript';

/** Kullanıcıya görünen JSX nitelikleri. Teknik nitelikler (`data-*`) hariç. */
export const USER_FACING_ATTRIBUTES = ['title', 'aria-label', 'placeholder', 'alt', 'label'];

/** Taranan uzantılar. JSX yalnızca `.tsx` içinde olabilir. */
const SCANNED_EXTENSIONS = ['.tsx'];

/**
 * BİRİM TESTLER MUAF — ve gerekçe `no-hardcoded-path`in emsalinin birebir aynısı.
 *
 * `eslint.config.js`:141 o kural için şöyle diyor: *"Birim testler yolları VERİ
 * olarak kullanır… Kural burada açık kalsaydı her test dosyası
 * `eslint-disable` ile dolardı ve kural güvenilirliğini yitirirdi."*
 * Aynısı burada geçerli: bir testteki `title="başlık"` bir **fixture**, bir
 * arayüz metni değil; K5 *"arayüzde görünen"* metni koruyor ve test dosyası
 * hiçbir kullanıcıya gösterilmiyor.
 *
 * ⚠️ **UZANTI LİSTESİ TAM TUTULUR (SAPMA-007 sınıfı).** `eslint.config.js`'in
 * aynı yerdeki uyarısı: *"bir uzantı listesi yazarken «bugün hangi uzantılar
 * var» değil «bu kural hangi dosyalar için geçerli» sorusu sorulur."*
 * ⚠️ **Yalnızca `*.test.*` muaf.** Uçtan uca testler (`*.spec.tsx`, Faz 17+)
 * gerçek arayüzü sürer ve muaf **değildir**.
 */
export const EXEMPT_PATTERNS = ['.test.tsx', '.test.ts', '.test.mts', '.test.cts'];

export const isExempt = (fileName) => EXEMPT_PATTERNS.some((pattern) => fileName.endsWith(pattern));

const SKIP_DIRS = new Set(['node_modules', 'dist', '.turbo', 'coverage', '.git']);

/**
 * Bir dizede kullanıcıya gösterilmesi muhtemel metin var mı?
 *
 * Tek bir noktalama, bir sayı ya da bir CSS değeri metin değildir. Ayraç:
 * **en az iki harf içeren** bir dize. `'—'`, `'16'`, `'1.6'` elenir.
 */
export function looksLikeProse(value) {
  const letters = value.replace(/[^\p{L}]/gu, '');
  return letters.length >= 2;
}

/** Bulunan bir ihlal. */
/** @typedef {{file: string, line: number, kind: string, text: string}} Violation */

/**
 * Tek bir kaynak metnini tarar. SAF — dosya sistemine dokunmuyor, böylece
 * karşı kontrol testleri onu doğrudan sınayabiliyor.
 *
 * @param {string} fileName
 * @param {string} text
 * @returns {Violation[]}
 */
export function findBareText(fileName, text) {
  const sf = ts.createSourceFile(fileName, text, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TSX);
  /** @type {Violation[]} */
  const found = [];

  const lineOf = (node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;

  const push = (node, kind, value) => {
    const trimmed = value.trim();
    if (trimmed === '' || !looksLikeProse(trimmed)) return;
    found.push({ file: fileName, line: lineOf(node), kind, text: trimmed.replace(/\s+/g, ' ') });
  };

  const visit = (node) => {
    // ① JSX metin düğümü — `<p>Bu bölüm yüklenemedi.</p>`
    if (ts.isJsxText(node)) {
      push(node, 'jsxText', node.text);
    }

    // ② Kullanıcıya görünen JSX niteliği — `title="Bu ekran yüklenemedi"`
    if (ts.isJsxAttribute(node) && node.initializer !== undefined) {
      const name = node.name.getText(sf);
      if (USER_FACING_ATTRIBUTES.includes(name) && ts.isStringLiteral(node.initializer)) {
        push(node.initializer, 'jsxAttribute', node.initializer.text);
      }
    }

    // ③ JSX ifade kabındaki düz dize — `{ok ? 'Bitti' : 'Hata'}`
    if (ts.isJsxExpression(node) && node.expression !== undefined) {
      const collectStrings = (expr) => {
        if (ts.isStringLiteral(expr)) {
          push(expr, 'jsxExpression', expr.text);
          return;
        }
        if (ts.isConditionalExpression(expr)) {
          collectStrings(expr.whenTrue);
          collectStrings(expr.whenFalse);
          return;
        }
        if (ts.isBinaryExpression(expr)) {
          collectStrings(expr.left);
          collectStrings(expr.right);
        }
      };
      collectStrings(node.expression);
    }

    ts.forEachChild(node, visit);
  };

  visit(sf);
  return found;
}

/** Bir dizin ağacındaki `.tsx` dosyalarını tarar. */
export function scanDirectory(root) {
  /** @type {Violation[]} */
  const all = [];

  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      if (SKIP_DIRS.has(entry)) continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (!SCANNED_EXTENSIONS.some((ext) => entry.endsWith(ext))) continue;
      if (isExempt(entry)) continue;
      const rel = relative(root, full).split(sep).join('/');
      all.push(...findBareText(rel, readFileSync(full, 'utf8')));
    }
  };

  walk(root);
  return all;
}

/** CLI: `node tools/i18n-inventory/index.mjs <kök>` */
if (process.argv[1]?.endsWith('index.mjs') === true) {
  const root = process.argv[2] ?? 'apps/web/src';
  const violations = scanDirectory(root);
  const byFile = new Map();
  for (const v of violations) {
    byFile.set(v.file, [...(byFile.get(v.file) ?? []), v]);
  }
  process.stdout.write(`JSX'te çıplak metin taraması — kök: ${root}\n\n`);
  for (const [file, list] of [...byFile.entries()].sort()) {
    process.stdout.write(`${file} (${String(list.length)})\n`);
    for (const v of list) {
      process.stdout.write(`  ${String(v.line).padStart(4)} ${v.kind.padEnd(14)} ${v.text}\n`);
    }
    process.stdout.write('\n');
  }
  process.stdout.write(
    `TOPLAM: ${String(violations.length)} ihlal, ${String(byFile.size)} dosya\n`,
  );
}
