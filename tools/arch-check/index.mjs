/**
 * arch:check — mimari denetim.
 *
 * ESLint İLE İŞ BÖLÜMÜ (tekrar yok):
 *   ESLint yapar      → `console.log` (K8), kaynak kodda mutlak yol (K6),
 *                       tip farkında kurallar, biçim.
 *   arch:check yapar  → ESLint'in göremediği veya beceremediği dört şey:
 *                       ① katman bağımlılık yönü (paket sınırları)
 *                       ② motor saflığı (K3) — yasaklı modül ve sözdizimi
 *                       ③ import yolu harf duyarlılığı (dosya sistemi erişimi ister)
 *                       ④ TS olmayan kaynak varlıklarda mutlak yol (.html/.json/.css)
 *
 * `scripts/` için AYRI MUAFİYET YOK — bilinçli. Dizin bazlı muafiyet kaçış
 * deliği açar. Bootstrap betikleri zaten `console` kullanmaz, doğrudan
 * `process.stderr/stdout.write` çağırır; bu yüzden K8 için istisnaya ihtiyaç
 * duymazlar. Katman kuralları onlara da aynen uygulanır.
 *
 * Ayrıştırma regex ile değil TypeScript'in kendi ayrıştırıcısıyla yapılır:
 * yorum içindeki veya dizgi içindeki bir `Math.random` yanlış pozitif üretmez.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, posix, relative, resolve, sep } from 'node:path';

import ts from 'typescript';

// ─────────────────────────────────────────────────────────────────────────────
// Yapılandırma
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Katman bağımlılık yönü — CLAUDE.md §2.4.
 * Anahtar: paket kökü. Değer: import etmesine izin verilen @fms/* paketleri.
 */
export const LAYER_RULES = {
  'apps/web': ['@fms/shared', '@fms/ui'],
  'apps/api': ['@fms/shared', '@fms/db', '@fms/engine'],
  'apps/worker': ['@fms/shared', '@fms/db', '@fms/engine'],
  'packages/db': ['@fms/shared'],
  'packages/engine': ['@fms/shared'],
  'packages/ui': ['@fms/shared'],
  'packages/shared': [],
  // CLAUDE.md §2.4 tools/* katmanını tanımlamıyor. Veri aracı ingest yapar:
  // şema ve tipler için shared, yazma için db gerekir. Motoru import ETMEZ.
  'tools/data-cli': ['@fms/shared', '@fms/db'],
  // Bootstrap betikleri hiçbir workspace paketini import etmez.
  scripts: [],
};

/** K3 — motorun göremeyeceği modüller. */
const ENGINE_FORBIDDEN_MODULE_PREFIXES = [
  'node:',
  'fs',
  'path',
  'http',
  'https',
  'net',
  'os',
  'crypto',
  'child_process',
  'worker_threads',
  'perf_hooks',
];

/** K3 — motorun kullanamayacağı sözdizimi. */
const ENGINE_FORBIDDEN_CALLS = [
  { pattern: 'Math.random', reason: 'K2 — determinizm. Yerine SeededRng kullan.' },
  { pattern: 'Date.now', reason: 'K3 — motor saftır. Zamanı parametre olarak al.' },
  {
    pattern: 'performance.now',
    reason: 'K3 — motor saftır. Ölçümü çağıran taraf yapar.',
  },
];

/** TS olmayan kaynak varlıklarda aranacak mutlak uygulama yolu ön ekleri. */
const APP_PATH_PREFIXES = ['/api', '/assets', '/login', '/logout', '/register', '/fms'];

const ASSET_EXTENSIONS = ['.html', '.json', '.css'];

// ─────────────────────────────────────────────────────────────────────────────
// Saf yardımcılar (test edilebilir)
// ─────────────────────────────────────────────────────────────────────────────

/** Dosya yolundan katman adını bulur. Bulunamazsa null. */
export function resolveLayer(relPath) {
  // Her iki ayraç da normalize edilir. İlk yazımda `split(sep)` kullanmıştım:
  // `sep` ÇALIŞILAN platformun ayracı olduğu için Linux'ta ters bölü hiç
  // çevrilmiyordu ve Windows'ta yazılmış bir yol Linux CI'da katmansız
  // görünüyordu. CI (Linux) yakaladı — Faz 1.9.
  const normalized = relPath.split('\\').join('/');
  const layers = Object.keys(LAYER_RULES).sort((a, b) => b.length - a.length);
  return layers.find((layer) => normalized.startsWith(`${layer}/`)) ?? null;
}

/** Bir katman verilen @fms/* paketini import edebilir mi? */
export function isImportAllowed(layer, pkgName) {
  const allowed = LAYER_RULES[layer];
  if (allowed === undefined) return true; // tanımsız katman denetlenmez
  return allowed.includes(pkgName);
}

/** Modül belirteci motorda yasak mı? */
export function isForbiddenEngineModule(spec) {
  if (spec === '@fms/db') return true;
  return ENGINE_FORBIDDEN_MODULE_PREFIXES.some((prefix) => {
    // 'node:' bir şema öneki, alt yol ayracı değil: 'node:fs' eşleşmeli.
    // İlk yazımda `${prefix}/` kullanmıştım ve 'node:/' hiçbir zaman eşleşmedi;
    // negatif test yakaladı.
    if (prefix.endsWith(':')) return spec.startsWith(prefix);
    return spec === prefix || spec.startsWith(`${prefix}/`);
  });
}

/**
 * Bir kaynak dosyayı ayrıştırır ve ilgilendiğimiz her şeyi çıkarır.
 * @returns {{imports: {spec: string, line: number}[],
 *            calls: {text: string, line: number}[],
 *            newDates: {line: number}[],
 *            moduleMutables: {name: string, line: number}[]}}
 */
export function scanSource(text, fileName) {
  const sf = ts.createSourceFile(fileName, text, ts.ScriptTarget.ESNext, true);
  const imports = [];
  const calls = [];
  const newDates = [];
  const moduleMutables = [];

  const lineOf = (node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;

  // Modül düzeyi değiştirilebilir bağlamalar (global durum yasağı)
  for (const statement of sf.statements) {
    if (ts.isVariableStatement(statement)) {
      const flags = statement.declarationList.flags;
      const isConst = (flags & ts.NodeFlags.Const) !== 0;
      if (!isConst) {
        for (const decl of statement.declarationList.declarations) {
          moduleMutables.push({
            name: decl.name.getText(sf),
            line: lineOf(decl),
          });
        }
      }
    }
  }

  const visit = (node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      const spec = node.moduleSpecifier;
      if (spec !== undefined && ts.isStringLiteral(spec)) {
        imports.push({ spec: spec.text, line: lineOf(spec) });
      }
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length > 0 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      imports.push({ spec: node.arguments[0].text, line: lineOf(node.arguments[0]) });
    } else if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      calls.push({ text: node.expression.getText(sf), line: lineOf(node) });
    } else if (ts.isNewExpression(node) && node.expression.getText(sf) === 'Date') {
      newDates.push({ line: lineOf(node) });
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sf, visit);

  return { imports, calls, newDates, moduleMutables };
}

/**
 * Göreli bir import yolunun diskteki gerçek dosya adıyla BİREBİR eşleştiğini
 * doğrular.
 *
 * NEDEN GEREKLİ: Windows dosya sistemi büyük/küçük harfe duyarsız, üretim
 * (Linux/ARM64) duyarlı. `import './playerCard.js'` yazıp dosyanın adı
 * `PlayerCard.ts` olsa yerelde tsc de Node da SORUNSUZ çalışır; Docker
 * imajında ve CI'da kırılır. tsconfig'deki
 * `forceConsistentCasingInFileNames` bunu yakalamaz — o yalnızca AYNI dosyaya
 * iki FARKLI yazımla referans verilmesini görür (bkz. docs/ADR/0004 §2).
 *
 * @returns {{ok: true} | {ok: false, expected: string, actual: string}}
 */
export function checkImportCasing(fromDir, spec) {
  if (!spec.startsWith('.')) return { ok: true };

  const segments = spec.split('/').filter((s) => s !== '' && s !== '.');
  let current = fromDir;

  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i];
    if (segment === '..') {
      current = dirname(current);
      continue;
    }

    const isLast = i === segments.length - 1;
    let entries;
    try {
      entries = readdirSync(current);
    } catch {
      return { ok: true }; // dizin okunamıyorsa denetleyemeyiz
    }

    if (!isLast) {
      const exact = entries.includes(segment);
      if (exact) {
        current = join(current, segment);
        continue;
      }
      const ci = entries.find((e) => e.toLowerCase() === segment.toLowerCase());
      if (ci !== undefined) return { ok: false, expected: ci, actual: segment };
      return { ok: true }; // hiç yoksa çözümleme hatası değil, bizim işimiz değil
    }

    // Son segment: NodeNext'te '.js' yazılır, diskte '.ts' durur.
    //
    // ⚠️ UZANTI EŞLEMESİ TAM TUTULUR (Faz 2.1 glob taraması).
    // İlk yazımda yalnızca `.js → .ts|.tsx` vardı; `.mjs → .mts` ve
    // `.cjs → .cts` eşlemeleri yoktu. Sonuç: `./x.mjs` diye yazılıp diskte
    // `X.mts` duran bir import, harf denetiminden **sessizce** geçerdi.
    // Bugün repoda `.mts`/`.cts` dosyası yok — yani bu bir hata düzeltmesi
    // değil, bir boşluğun kapatılması. Boşluk bırakmamanın sebebi ADR-0004 §2:
    // harf duyarlılığı bu projede en pahalı hata sınıfı ve yerelde asla
    // tekrar üretilemiyor.
    const candidates = [segment];
    if (segment.endsWith('.js')) {
      const stem = segment.slice(0, -3);
      candidates.push(`${stem}.ts`, `${stem}.tsx`);
    } else if (segment.endsWith('.mjs')) {
      candidates.push(`${segment.slice(0, -4)}.mts`);
    } else if (segment.endsWith('.cjs')) {
      candidates.push(`${segment.slice(0, -4)}.cts`);
    } else {
      candidates.push(`${segment}.ts`, `${segment}.tsx`, `${segment}.mts`, `${segment}.cts`);
    }

    for (const candidate of candidates) {
      if (entries.includes(candidate)) return { ok: true };
    }
    for (const candidate of candidates) {
      const ci = entries.find((e) => e.toLowerCase() === candidate.toLowerCase());
      if (ci !== undefined) {
        return { ok: false, expected: ci, actual: candidate };
      }
    }
    return { ok: true }; // dizin (index.ts) veya paket — çözümleme bizim işimiz değil
  }

  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tarama
// ─────────────────────────────────────────────────────────────────────────────

const IGNORED_DIRS = new Set(['node_modules', 'dist', '.git', '.turbo', 'coverage']);

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      yield* walk(full);
    } else {
      yield full;
    }
  }
}

/**
 * Depoyu denetler ve ihlal listesi döner.
 * @returns {{file: string, line: number, rule: string, message: string}[]}
 */
export function runArchCheck(root) {
  const violations = [];
  const roots = ['apps', 'packages', 'tools', 'scripts'];

  for (const top of roots) {
    for (const abs of walk(join(root, top))) {
      const rel = relative(root, abs).split(sep).join('/');
      const ext = abs.slice(abs.lastIndexOf('.'));
      const layer = resolveLayer(rel);

      // ④ TS olmayan kaynak varlıklarda mutlak uygulama yolu
      if (ASSET_EXTENSIONS.includes(ext) && /\/src\//.test(rel)) {
        const text = readFileSync(abs, 'utf8');
        text.split('\n').forEach((lineText, idx) => {
          for (const prefix of APP_PATH_PREFIXES) {
            if (lineText.includes(`"${prefix}/`) || lineText.includes(`'${prefix}/`)) {
              violations.push({
                file: rel,
                line: idx + 1,
                rule: 'asset-absolute-path',
                message:
                  `Kaynak varlıkta mutlak uygulama yolu: '${prefix}/...'. ` +
                  `Uygulama alt yolda çalışır; yol derleme sırasında PUBLIC_BASE_PATH'ten üretilmeli (K6).`,
              });
              break;
            }
          }
        });
        continue;
      }

      // ⚠️ TARANAN UZANTILAR — LİSTE TAM TUTULUR (Faz 2.1 glob taraması).
      // `.cts` eksikti: bir `.cts` dosyası arch:check'ten TAMAMEN kaçardı —
      // ne katman yönü, ne motor saflığı, ne harf duyarlılığı denetlenirdi.
      // Sessiz bir kaçış deliği, çünkü "arch:check temiz" çıktısı dosyanın hiç
      // bakılmadığını söylemiyor. ESLint (`**/*.cts`), tsconfig ve vitest
      // desenleri `.cts`yi zaten kapsıyordu; tek istisna burasıydı.
      if (!['.ts', '.tsx', '.mts', '.cts', '.mjs', '.cjs', '.js'].includes(ext)) continue;
      if (rel.includes('/dist/')) continue;

      const text = readFileSync(abs, 'utf8');
      const { imports, calls, newDates, moduleMutables } = scanSource(text, abs);
      const isEngine = layer === 'packages/engine';

      for (const { spec, line } of imports) {
        // ① Katman yönü
        if (spec.startsWith('@fms/') && layer !== null) {
          const selfPkg = `@fms/${layer.split('/')[1]}`;
          if (spec !== selfPkg && !isImportAllowed(layer, spec)) {
            const allowed = LAYER_RULES[layer];
            violations.push({
              file: rel,
              line,
              rule: 'layer-direction',
              message:
                `Katman ihlali: '${layer}' → '${spec}'. ` +
                `İzin verilenler: ${allowed.length > 0 ? allowed.join(', ') : '(hiçbiri)'} (CLAUDE.md §2.4).`,
            });
          }
        }

        // ② Motor saflığı — yasaklı modüller
        if (isEngine && isForbiddenEngineModule(spec)) {
          violations.push({
            file: rel,
            line,
            rule: 'engine-purity',
            message:
              `Motor '${spec}' modülünü import edemez (K3). ` +
              `Motor girdi alır, çıktı döner; veriyi parametre olarak al.`,
          });
        }

        // ③ Import yolu harf duyarlılığı
        const casing = checkImportCasing(dirname(abs), spec);
        if (!casing.ok) {
          violations.push({
            file: rel,
            line,
            rule: 'import-casing',
            message:
              `Import yolundaki harf kullanımı diskteki dosyayla eşleşmiyor: ` +
              `yazılan '${casing.actual}', gerçek '${casing.expected}'. ` +
              `Windows'ta çalışır, üretimde (Linux/ARM64) kırılır (docs/ADR/0004 §2).`,
          });
        }
      }

      if (isEngine) {
        for (const { text: callText, line } of calls) {
          const hit = ENGINE_FORBIDDEN_CALLS.find((f) => callText === f.pattern);
          if (hit !== undefined) {
            violations.push({
              file: rel,
              line,
              rule: 'engine-purity',
              message: `Motor '${hit.pattern}()' çağıramaz. ${hit.reason}`,
            });
          }
        }
        for (const { line } of newDates) {
          violations.push({
            file: rel,
            line,
            rule: 'engine-purity',
            message: "Motor 'new Date()' kullanamaz (K3). Zamanı parametre olarak al.",
          });
        }
        for (const { name, line } of moduleMutables) {
          violations.push({
            file: rel,
            line,
            rule: 'engine-purity',
            message:
              `Motorda modül düzeyi değiştirilebilir bağlama: '${name}' (K3 — global durum yok). ` +
              `'const' kullan veya durumu parametreye taşı.`,
          });
        }
      }
    }
  }

  return violations;
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────────────────────

const isMain =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]).split(sep).join(posix.sep).endsWith('tools/arch-check/index.mjs');

if (isMain) {
  const root = process.cwd();
  const started = performance.now();
  const violations = runArchCheck(root);
  const elapsed = Math.round(performance.now() - started);

  if (violations.length === 0) {
    process.stdout.write(`✓ arch:check temiz (${String(elapsed)} ms)\n`);
  } else {
    process.stderr.write(
      `\n  ✖ arch:check ${String(violations.length)} ihlal buldu (${String(elapsed)} ms):\n\n`,
    );
    for (const v of violations) {
      process.stderr.write(`    ${v.file}:${String(v.line)}  [${v.rule}]\n`);
      process.stderr.write(`      ${v.message}\n\n`);
    }
    process.exit(1);
  }
}
