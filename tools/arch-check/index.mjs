/**
 * arch:check — mimari denetim.
 *
 * ESLint İLE İŞ BÖLÜMÜ (tekrar yok):
 *   ESLint yapar      → `console.log` (K8), kaynak kodda mutlak yol (K6),
 *                       tip farkında kurallar, biçim.
 *   arch:check yapar  → ESLint'in göremediği veya beceremediği DOKUZ şey.
 *
 * KURAL LİSTESİ — bu yorum kapsam beyanıdır, kod ile AYRIŞMAMALI.
 * (Adı geçen her belirteç aşağıda `rule:` alanı olarak basılır.)
 *
 *   ① layer-direction        katman bağımlılık yönü (CLAUDE.md §2.4) — 9 katman, 13 izinli bağ
 *   ② engine-purity          motor saflığı (K3) — yasaklı modül, yasaklı çağrı,
 *                             `new Date()`, modül düzeyi değiştirilebilir bağlama (4 bildirim yeri)
 *   ③ import-casing          import yolu harf duyarlılığı (dosya sistemi erişimi ister)
 *   ④ asset-absolute-path    TS olmayan kaynak varlıklarda mutlak yol (.html/.json/.css)
 *   ⑤ restricted-subpath     kısıtlı alt yol (`@fms/shared/server`) — Faz 2.2a
 *   ⑥ undeclared-dependency  import edilen `@fms/X` package.json'da bildirilmiş mi — Faz 2.2a
 *   ⑦ engine-forbidden-import motorun alamayacağı adlandırılmış dışa aktarımlar — Faz 2.3a
 *                             (3 giriş: createCorrelationId · measure · configureAssertions)
 *   ⑧ forbidden-export-exists ⑦'nin tablosundaki her adın `@fms/shared` barrel'ında
 *                             GERÇEKTEN dışa aktarıldığı — Faz 2.8 (yanlış yazım kuralı
 *                             köreltiyordu ve gate sessiz kalıyordu; 2.7 mutasyon ölçümü)
 *   ⑨ master-table-marking   `packages/db/src/schema/` altındaki her `pgTable(...)`
 *                             ya `masterTable(...)` ile sarılı ya da `arch:save-scoped`
 *                             yorumuyla AÇIKÇA muaf — Faz 3.3 (K4)
 *
 * ⚠️ BU LİSTE DEĞİŞTİRİLİRSE ÜÇ YER BİRDEN GÜNCELLENİR (Faz 2.3b'de kurallaştı):
 *   1. burada,
 *   2. `arch-check.test.mjs` → META KANARYA fixture'ı + beklenen kural listesi,
 *   3. `PROJECT_MEMORY.md` → "arch:check kapsamı" bloğu.
 * Gerekçe: SAPMA-012'den beri bu araç paket sınırının TEK yapısal savunması.
 * Kapsamı yazılı olmayan bir kapı sessizce daralabilir ve "✓ temiz" çıktısı
 * bunu söylemez.
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

/**
 * KISITLI ALT YOLLAR — Faz 2.2a.
 *
 * Katman kuralı "hangi PAKET" sorusunu cevaplıyor; bu tablo "paketin hangi
 * GİRİŞİ" sorusunu cevaplıyor. `@fms/shared` her katmana açık, ama onun
 * `server` girişi iki tarafa birden kapalı:
 *   • tarayıcı (`apps/web`, `packages/ui`) — K1, sunucu otoritesi. Faz 1.8'de
 *     `JWT_SECRET` ve `DATABASE_URL` tarayıcı paketine sızmıştı.
 *   • motor (`packages/engine`) — K3, motor saftır. `process.env` okuyan veya
 *     Node yerleşiklerine bağlı bir modül motora giremez.
 *
 * Sınırın İKİ YÖNLÜ olması bilinçli: 2.1'de ölçüldü ki `@fms/shared` barrel'ı
 * `env.js` üzerinden Zod'u **motora** çekiyordu — Faz 1 hata #11'in aynı
 * sınıfı, ters yönde.
 */
export const RESTRICTED_SUBPATHS = {
  '@fms/shared/server': {
    forbiddenLayers: ['apps/web', 'packages/ui', 'packages/engine'],
    reason:
      'Sunucu alt yolu: process.env okur, Node yerleşiklerine bağlıdır ve şema ' +
      'sistemdeki sırların adlarını sayar. Tarayıcıya (K1) ve motora (K3) giremez.',
  },
};

/**
 * `@fms/shared/server` → `@fms/shared`. Kapsamlı (scoped) paketlerde ilk İKİ
 * segment paket adıdır; gerisi alt yoldur.
 *
 * NEDEN GEREKLİ (2.0'da ölçüldü): `isImportAllowed` tam eşleşme yapıyordu ve
 * `allowed.includes('@fms/shared/server')` her zaman false dönüyordu. Sonuç
 * SAHTE bir katman ihlaliydi — `apps/api` `@fms/shared`'ı import edebiliyor
 * ama `@fms/shared/server`'ı edemiyordu.
 */
export function basePackageOf(spec) {
  const parts = spec.split('/');
  return spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

/** K3 — motorun göremeyeceği modüller. */
export const ENGINE_FORBIDDEN_MODULE_PREFIXES = [
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
export const ENGINE_FORBIDDEN_CALLS = [
  { pattern: 'Math.random', reason: 'K2 — determinizm. Yerine SeededRng kullan.' },
  { pattern: 'Date.now', reason: 'K3 — motor saftır. Zamanı parametre olarak al.' },
  {
    pattern: 'performance.now',
    reason: 'K3 — motor saftır. Ölçümü çağıran taraf yapar.',
  },
];

/** TS olmayan kaynak varlıklarda aranacak mutlak uygulama yolu ön ekleri. */
export const APP_PATH_PREFIXES = ['/api', '/assets', '/login', '/logout', '/register', '/fms'];

export const ASSET_EXTENSIONS = ['.html', '.json', '.css'];

/**
 * MOTORUN ALAMAYACAĞI ADLANDIRILMIŞ DIŞA AKTARIMLAR (Faz 2.3a, 2.7'de genişledi).
 *
 * `@fms/shared` motora açık ama içindeki her sembol açık değil. Bu liste
 * MODÜL düzeyinde ifade edilemeyen yasakları taşır:
 *   • `createCorrelationId` — kimlik üretmek zaman + entropi okumaktır (K3).
 *     Kimlik oyun rastgeleliği DEĞİL (K2 kapsamı dışı) ama motorun işi de
 *     değil: motor iz döndürür, kimliği çağıran taraf ilişkilendirir.
 *   • `measure` — Faz 2.7, Karar 6. Ölçmek zaman okumaktır; motor kendini
 *     ölçmez, ölçüm motoru DIŞARIDAN sarmalar.
 *   • `configureAssertions` — Faz 2.7. Motor kendi değişmez kontrolünü
 *     GEVŞETEMEZ; varsayılan `throw` kipi orada değiştirilemez kalmalı.
 *
 * ⚠️ HER GİRDİNİN KENDİ KANARYA FIXTURE'I VAR (`arch-check.test.mjs`).
 * Kural sayısı değişmiyor ama giriş sayısı değişiyor: yalnızca kural düzeyinde
 * kanarya tutmak, bir anahtarın yanlış yazılmasını (`Measure`, `measures`)
 * göremezdi — kural `createCorrelationId` üzerinden ötmeye devam eder ve yeni
 * yasak sessizce hiç uygulanmazdı.
 */
export const ENGINE_FORBIDDEN_SHARED_EXPORTS = {
  createCorrelationId:
    'Kimlik üretmek zaman ve entropi okumaktır (K3). Motor iz (debugTrace) döndürür; ' +
    'correlationId ilişkilendirmesini çağıran taraf yapar.',
  measure:
    'Ölçmek zaman okumaktır (K3, K2). Motor kendini ölçmez; ölçüm motoru DIŞARIDAN ' +
    'sarmalar: measure(..., () => engine.simulate(...)).',
  configureAssertions:
    'Motor kendi değişmez kontrolünü gevşetemez (K3, spec/09 §11.3). assertInvariant ' +
    'motorda her zaman varsayılan `throw` kipindedir; kip yalnızca uygulama ' +
    'önyüklemesinde, motorun dışında ayarlanır.',
};

/**
 * arch:check'in BAKTIĞI uzantılar.
 *
 * Sabit olarak dışa aktarılıyor çünkü meta-test onu doğruluyor: 2.1'de bu
 * listeden `.cts` eksikti ve bir `.cts` dosyası denetimden TAMAMEN kaçıyordu —
 * gate "temiz" diyordu. Bir denetleyicinin çıktısı, dosyaya BAKILDIĞINI
 * söylemez; liste daralırsa kapı sessizce kör olur.
 */
export const SCANNED_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.mjs', '.cjs', '.js'];

/**
 * ⑨ MASTER TABLO İŞARETLEME — Faz 3.3, K4.
 *
 * `CLAUDE.md` K4 master tabloya yazmanın **tip seviyesinde derlenmemesini**
 * istiyor. Zorlama `packages/db/src/client/master.ts`'teki marka ile kuruldu ve
 * kontrol deneyiyle kanıtlandı (`master-write-control.test-d.ts`).
 *
 * **Ama tip sistemi bir şeyi göremez: İŞARETLEMEYİ UNUTMAK.** İşaretlenmemiş bir
 * tablo yazılabilir kalır ve derleyicinin şikâyet edeceği bir şey yoktur —
 * görecek bir marka yoktur. 3.3'te ölçüldü: `countries`ten sarma kaldırılınca
 * kontrol deneyi 3 hata verdi, ama YALNIZCA o dosya `countries`i adıyla
 * andığı için. 3.4'te eklenecek yeni bir tablo sarmayı unutursa **hiçbir şey
 * ötmez**. Bu kural o boşluğu kapatıyor.
 *
 * **Muafiyet SESSİZ DEĞİL.** Save katmanı tabloları (Faz 12: `save_deltas`,
 * `contracts` …) yazılabilir olmak zorunda. Onlar `arch:save-scoped` yorumuyla
 * AÇIKÇA muaf tutulur — varsayılan olarak muaf sayılmazlar. Sessiz bir varsayılan,
 * "unuttum" ile "bilerek" arasındaki farkı yok ederdi.
 */
export const SCHEMA_DIR_PREFIX = 'packages/db/src/schema/';
export const MASTER_TABLE_WRAPPER = 'masterTable(';
export const SAVE_SCOPED_MARKER = 'arch:save-scoped';

/**
 * Bir şema dosyasındaki işaretlenmemiş `pgTable(...)` tanımlarını bulur.
 *
 * SAF fonksiyon — dosya sistemine dokunmuyor, metin alıyor. Böylece birim
 * testiyle doğrudan sınanabiliyor; kablolamasını ise kanarya kanıtlıyor
 * (2.3b dersi: birim testi kablolamayı kanıtlamaz).
 *
 * @param {string} text
 * @returns {{line: number, snippet: string}[]}
 */
export function findUnmarkedTables(text) {
  const lines = text.split(/\r?\n/);
  /** @type {{line: number, snippet: string}[]} */
  const found = [];

  lines.forEach((lineText, idx) => {
    if (!lineText.includes('pgTable(')) return;

    // Aynı satırda sarılı: `masterTable(pgTable('x', {`
    if (lineText.includes(MASTER_TABLE_WRAPPER)) return;

    // Önceki satırda sarılı (biçimlendiricinin ürettiği çok satırlı hâl):
    //   export const countries = masterTable(
    //     pgTable('countries', {
    const previous = idx > 0 ? lines[idx - 1] : '';
    if (previous.includes(MASTER_TABLE_WRAPPER)) return;

    // Açık muafiyet: önceki üç satırdan birinde işaretçi.
    const window = lines.slice(Math.max(0, idx - 3), idx).join(' ');
    if (window.includes(SAVE_SCOPED_MARKER)) return;

    found.push({ line: idx + 1, snippet: lineText.trim().slice(0, 60) });
  });

  return found;
}

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

/**
 * Bir katman verilen belirteci import edebilir mi?
 *
 * Belirteç alt yol taşıyabilir (`@fms/shared/server`); karar TEMEL PAKETE göre
 * verilir. Alt yolun kendi kısıtı ayrı bir kural (`isSubpathForbidden`).
 */
export function isImportAllowed(layer, spec) {
  const allowed = LAYER_RULES[layer];
  if (allowed === undefined) return true; // tanımsız katman denetlenmez
  return allowed.includes(basePackageOf(spec));
}

/**
 * Bu katman bu ALT YOLU görebilir mi?
 * @returns kısıt varsa gerekçe metni, yoksa null
 */
export function subpathRestrictionFor(layer, spec) {
  const rule = RESTRICTED_SUBPATHS[spec];
  if (rule === undefined) return null;
  return rule.forbiddenLayers.includes(layer) ? rule.reason : null;
}

/**
 * Bu katmanın `package.json`'ı bu paketi BİLDİRMİŞ mi?
 *
 * NEDEN GEREKLİ (2.1'de ölçüldü): `arch:check` 12 katman bağına izin veriyordu
 * ama `package.json`'larda yalnızca 2'si bildirilmişti. `packages/engine`
 * `@fms/shared`'ı "izinli" olarak import edebiliyor görünüyordu; pnpm'in sıkı
 * `node_modules` düzeninde ise **hiç çözümlenemiyordu**
 * (`Cannot find package '@fms/shared'`). Yani kapı yanlış NEGATİF veriyordu:
 * kullanılamayan bir izni onaylıyordu. 2.0'daki alt yol yanlış POZİTİFİNİN
 * aynadaki hâli — aynı kapının iki yüzü.
 *
 * Kural bilerek "import varsa bildirim de olmalı" biçiminde: spekülatif
 * bildirim istemez, boşluğu ilk gerçek import'ta yakalar.
 *
 * @returns true = bildirilmiş veya denetlenemiyor, false = eksik
 */
export function isDependencyDeclared(readPackageJson, layer, spec) {
  const pkg = readPackageJson(layer);
  if (pkg === null) return true; // package.json'ı olmayan katman (scripts/) denetlenmez
  const declared = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
  return Object.prototype.hasOwnProperty.call(declared, basePackageOf(spec));
}

/**
 * `@fms/shared` kök barrel'ının dışa aktardığı adlar — Faz 2.8.
 *
 * NEDEN GEREKLİ (2.7'de ÖLÇÜLDÜ): `ENGINE_FORBIDDEN_SHARED_EXPORTS` bir dize
 * kümesi ve yazımı hiçbir yerde denetlenmiyordu. Mutasyon deneyinde anahtar
 * `measure` → `measured` diye yanlış yazıldı; iki **meta-test** kırıldı ama
 * `pnpm arch:check` **"✓ temiz" dedi.** Yani gate tarafında yasak sessizce
 * kalkmıştı. Bu fonksiyon o sessizliği kapatıyor: tablodaki her ad, barrel'ın
 * gerçekten dışa aktardığı bir ada karşılık gelmeli.
 *
 * `export { a, b } from './x.js'` ve `export type { T }` biçimlerinin ikisi de
 * toplanıyor. Tip dışa aktarımını da saymak bilinçli: bir yasağın hedefi bir
 * gün tipe dönüşürse kural yanlış alarm vermesin, yalnızca **var olmayan** ad
 * ötsün.
 *
 * @returns adlar kümesi; dosya okunamıyorsa `null` (denetlenemiyor demek)
 */
export function sharedBarrelExports(root) {
  const file = join(root, 'packages', 'shared', 'src', 'index.ts');
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    return null;
  }

  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.ESNext, true);
  const names = new Set();
  for (const statement of sf.statements) {
    if (!ts.isExportDeclaration(statement)) continue;
    const clause = statement.exportClause;
    if (clause !== undefined && ts.isNamedExports(clause)) {
      for (const element of clause.elements) names.add(element.name.getText(sf));
    }
  }
  return names;
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
        // Adlandırılmış bağlamalar da toplanıyor (Faz 2.3a). Gerekçe: bazı
        // yasaklar MODÜL değil SEMBOL düzeyinde. `@fms/shared` motora açık,
        // ama içindeki `createCorrelationId` açık değil — kimlik üretmek zaman
        // ve entropi okumak demek (K3). Modül belirteci bunu ayırt edemez.
        const named = [];
        const clause = ts.isImportDeclaration(node) ? node.importClause : undefined;
        const bindings = clause?.namedBindings;
        if (bindings !== undefined && ts.isNamedImports(bindings)) {
          for (const element of bindings.elements) named.push(element.name.getText(sf));
        }
        imports.push({ spec: spec.text, line: lineOf(spec), named });
      }
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length > 0 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      imports.push({ spec: node.arguments[0].text, line: lineOf(node.arguments[0]), named: [] });
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

  // Katman başına package.json — okuma bir kez yapılır, sonuç önbelleklenir.
  // `null` = dosya yok (scripts/ gibi), o katman bildirim kuralına girmez.
  const packageJsonCache = new Map();
  const readPackageJson = (layer) => {
    if (!packageJsonCache.has(layer)) {
      try {
        packageJsonCache.set(
          layer,
          JSON.parse(readFileSync(join(root, layer, 'package.json'), 'utf8')),
        );
      } catch {
        packageJsonCache.set(layer, null);
      }
    }
    return packageJsonCache.get(layer);
  };

  // ⑧ Yasak listesindeki adlar GERÇEKTEN var mı? — Faz 2.8.
  //
  // Dosya başına değil, depo başına bir kez çalışır: denetlenen şey bir dosya
  // değil, denetleyicinin KENDİ tablosunun geçerliliği. 2.7'de ölçüldü ki
  // yanlış yazılmış bir anahtar gate tarafında tamamen sessiz kalıyor.
  //
  // Barrel okunamıyorsa kural ATLANIR — "doğrulanamıyor" ile "ihlal var" iki
  // ayrı şey. (Kanaryanın temiz depo testi bu sayede yanlış pozitif almıyor.)
  const barrelExports = sharedBarrelExports(root);
  if (barrelExports !== null) {
    for (const name of Object.keys(ENGINE_FORBIDDEN_SHARED_EXPORTS)) {
      if (!barrelExports.has(name)) {
        violations.push({
          file: 'tools/arch-check/index.mjs',
          line: 1,
          rule: 'forbidden-export-exists',
          message:
            `ENGINE_FORBIDDEN_SHARED_EXPORTS '${name}' adını yasaklıyor ama ` +
            `'@fms/shared' barrel'ı böyle bir ad dışa aktarmıyor. Yasak SESSİZCE ` +
            `hiçbir şey yapmıyor: yanlış yazılmış bir anahtar (örn. 'measured') ` +
            `kuralı körelttir ve gate yine "temiz" der (Faz 2.7 mutasyon ölçümü). ` +
            `Adı düzelt ya da yasağı kaldır.`,
        });
      }
    }
  }

  for (const top of roots) {
    for (const abs of walk(join(root, top))) {
      const rel = relative(root, abs).split(sep).join('/');
      const ext = abs.slice(abs.lastIndexOf('.'));
      const layer = resolveLayer(rel);

      // ⑨ Master tablo işaretleme — Faz 3.3, K4.
      //
      // Tip sistemi "yazma girişimini" yakalar ama "işaretlemeyi unutmayı"
      // yakalayamaz — göreceği bir marka yoktur. Kural o boşlukta duruyor.
      if (rel.startsWith(SCHEMA_DIR_PREFIX) && ext === '.ts') {
        for (const hit of findUnmarkedTables(readFileSync(abs, 'utf8'))) {
          violations.push({
            file: rel,
            line: hit.line,
            rule: 'master-table-marking',
            message:
              `İşaretlenmemiş tablo tanımı: ${hit.snippet}. Master World salt-okunurdur (K4) ` +
              `ve zorlama TİP SEVİYESİNDE: tablo 'masterTable(...)' ile sarılmalı. ` +
              `Sarılmayan bir tablo YAZILABİLİR kalır ve derleyici bunu göremez — ` +
              `görecek bir marka yoktur. Save katmanı tablosuysa üstüne '${SAVE_SCOPED_MARKER}' ` +
              `yorumu koy: muafiyet açık olmalı, varsayılan olmamalı.`,
          });
        }
      }

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
      if (!SCANNED_EXTENSIONS.includes(ext)) continue;
      if (rel.includes('/dist/')) continue;

      const text = readFileSync(abs, 'utf8');
      const { imports, calls, newDates, moduleMutables } = scanSource(text, abs);
      const isEngine = layer === 'packages/engine';

      for (const { spec, line, named } of imports) {
        if (spec.startsWith('@fms/') && layer !== null) {
          const selfPkg = `@fms/${layer.split('/')[1]}`;
          const isSelfImport = basePackageOf(spec) === selfPkg;

          // ① Katman yönü — karar TEMEL PAKETE göre verilir (2.2a).
          if (!isSelfImport && !isImportAllowed(layer, spec)) {
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

          // ⑤ Kısıtlı alt yol (2.2a) — paket izinli olsa da GİRİŞİ kapalı olabilir.
          const restriction = subpathRestrictionFor(layer, spec);
          if (restriction !== null) {
            violations.push({
              file: rel,
              line,
              rule: 'restricted-subpath',
              message:
                `'${layer}' katmanı '${spec}' alt yolunu import edemez. ${restriction} ` +
                `İzomorfik olan her şey kök girişte ('${basePackageOf(spec)}') durur.`,
            });
          }

          // ⑦ Motorun alamayacağı adlandırılmış dışa aktarımlar (2.3a)
          if (isEngine) {
            for (const name of named) {
              const reason = ENGINE_FORBIDDEN_SHARED_EXPORTS[name];
              if (reason !== undefined) {
                violations.push({
                  file: rel,
                  line,
                  rule: 'engine-forbidden-import',
                  message: `Motor '${spec}' paketinden '${name}' alamaz (K3). ${reason}`,
                });
              }
            }
          }

          // ⑥ Bildirilmiş bağımlılık (2.2a) — "izinli" ile "çözümlenebilir" ayrı şeyler.
          if (!isSelfImport && !isDependencyDeclared(readPackageJson, layer, spec)) {
            const basePkg = basePackageOf(spec);
            violations.push({
              file: rel,
              line,
              rule: 'undeclared-dependency',
              message:
                `'${layer}' '${spec}' import ediyor ama '${basePkg}' onun package.json'ında ` +
                `BİLDİRİLMEMİŞ. Katman kuralı izin verse de pnpm'in sıkı node_modules düzeninde ` +
                `bu import çözümlenmez ("Cannot find package"). ` +
                `Çözüm: ${layer}/package.json → dependencies'e "${basePkg}": "workspace:*" ekle.`,
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
