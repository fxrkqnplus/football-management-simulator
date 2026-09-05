/**
 * `pnpm i18n:check` — çeviri kaynaklarının kapısı (Faz 5.6, kabul kriteri 2).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * İŞ BÖLÜMÜ — hiçbir kural iki yerde denetlenmez (`docs/spec/09` §11.5)
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Bu araç dört soruyu soruyor ve **hiçbiri** başka bir kapının sorusu değil:
 *
 *   ① EKSİK ANAHTAR   — `t()` bir anahtar istiyor, kaynakta yok
 *   ② KULLANILMAYAN   — kaynakta anahtar var, hiçbir yerden istenmiyor
 *   ③ BOŞ ÇEVİRİ      — anahtar var ama değeri boş
 *   ④ GÖRÜNMEZ KARAKTER — gömülü `U+00A0` ve akrabaları
 *
 * **Komşu kapılarla sınırlar — ölçülmüş, varsayılmamış:**
 *
 * | Kapı | Onun işi | Bu aracın ondan FARKI |
 * |---|---|---|
 * | `typecheck` (tipli anahtarlar) | **Literal** bir anahtarın var olduğu | ①'i literal olmayan yollarda da görür; ②③④'ü hiç görmez |
 * | `local/no-bare-jsx-text` (5.5) | JSX'e **çevrilmemiş metin** girmediği | Bambaşka bir soru: o metne bakar, bu anahtar kümesine |
 * | `no-irregular-whitespace` | Kaynak koddaki düzensiz boşluk | O kural **dizeleri atlıyor** (`skipStrings: true`, 5.3'te ölçüldü) ve `.md`ye **hiç bakmıyor** — ④ tam o iki yüzeyi hedefliyor |
 *
 * ⚠️ ①'de `typecheck` ile **kasıtlı bir örtüşme** var ve kabul kriteri 2 bunu
 * istiyor (*"`i18n-check` eksik anahtarları buluyor"*). Örtüşme bir tekrar
 * değil: tipli anahtarlar yalnızca literal çağrıları görür, bu araç bir modül
 * sabiti üzerinden giden anahtarları da çözer.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ BU ARACIN GÖRMEDİĞİ — sessiz bırakılmıyor
 * ────────────────────────────────────────────────────────────────────────────
 *
 *   • **Metnin doğru Türkçe olduğu.** Hiçbir statik kapı bunu göremez.
 *   • **`apps/web` dışı.** Bugün `t()` yalnızca orada; başka bir uygulama
 *     i18n kazanırsa kendi kökünü ekler (ölçüldü: bugün 0 çağrı).
 *   • **Başka bir dosyadan import edilen anahtar tabloları.** Çözüm **aynı
 *     dosyadaki** modül sabitleriyle sınırlı; import zinciri takip edilmiyor.
 *     Bugün böyle bir kullanım **yok** (ölçüldü) — doğduğu gün ya çözüm
 *     genişler ya aile beyan edilir.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ BETİK KENDİ KOPYASINI DENETLEMEZ — 4.1'in dersi
 * ────────────────────────────────────────────────────────────────────────────
 *
 * 4.1'de bir doğrulama betiği kendi kopyasına baktığı için bir mutasyona
 * hiçbir şey dememişti. Buradaki karşılığı: ④'ün tarama kümesi bu dosyayı ve
 * testini **dışlamaz** — tam tersine kapsar, ve testi kendi üzerinde bir
 * **öz denetim** koşturuyor (tarayıcı dokuz kod noktasının dokuzunu da
 * görebiliyor mu). *"0 bulundu"* ile *"hiçbir şey aramadı"* aksi hâlde ayırt
 * edilemez.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import ts from 'typescript';

/** Taranmayan dizinler — üretilmiş ya da bağımlılık. */
const SKIP_DIRS = new Set(['node_modules', 'dist', '.turbo', '.git', 'coverage', 'drizzle']);

/** `t()` çağrılarının arandığı uzantılar. */
const SOURCE_EXTENSIONS = ['.ts', '.tsx'];

/** Görünmez karakter taramasının kapsadığı uzantılar. */
const SCANNED_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
  '.js',
  '.mjs',
  '.cjs',
  '.json',
  '.md',
  '.yml',
  '.yaml',
];

/**
 * Yasaklı görünmez kod noktaları — **kaçış dizisiyle** yazılır, karakterin
 * kendisi ASLA gömülmez. Faz 5 bu tuzağa sekiz kez düştü ve her seferinde tam
 * da onu yazarken; bir dosyanın tuzağı ANLATMASI ona düşmediğini göstermiyor.
 */
export const FORBIDDEN_CODE_POINTS = [
  [0x00a0, 'U+00A0 NO-BREAK SPACE'],
  [0x200b, 'U+200B ZERO WIDTH SPACE'],
  [0x200c, 'U+200C ZERO WIDTH NON-JOINER'],
  [0x200d, 'U+200D ZERO WIDTH JOINER'],
  [0x200e, 'U+200E LEFT-TO-RIGHT MARK'],
  [0x200f, 'U+200F RIGHT-TO-LEFT MARK'],
  [0x2028, 'U+2028 LINE SEPARATOR'],
  [0x2029, 'U+2029 PARAGRAPH SEPARATOR'],
  [0xfeff, 'U+FEFF BYTE ORDER MARK'],
];

const EMOJI = /\p{Extended_Pictographic}/u;

/**
 * Bir satırdaki gömülü görünmez karakterleri bulur.
 *
 * ⚠️ **ZWJ (`U+200D`) İKİ EMOJİ ARASINDA MEŞRUDUR ve bu bir ÖLÇÜMÜN sonucu.**
 * `README.md`:11 `🧑‍💻` taşıyor = `U+1F9D1 + U+200D + U+1F4BB`. Körü körüne
 * *"ZWJ yasak"* diyen bir kural ilk koşuda ateşlenirdi — ve o gün cazip olan
 * şey dosyayı kapsam dışına almak olurdu, yani kapıyı yeşile boyamak.
 * Bunun yerine **kuralın kendisi** daraltıldı: ZWJ, yalnızca iki komşusu da
 * emoji ise geçer.
 */
export function findInvisibleCharacters(text) {
  const found = [];
  const forbidden = new Map(FORBIDDEN_CODE_POINTS);

  text.split('\n').forEach((line, lineIndex) => {
    const points = Array.from(line);
    points.forEach((ch, i) => {
      const cp = ch.codePointAt(0);
      const label = forbidden.get(cp);
      if (label === undefined) return;

      if (cp === 0x200d) {
        const before = points[i - 1];
        const after = points[i + 1];
        if (
          before !== undefined &&
          after !== undefined &&
          EMOJI.test(before) &&
          EMOJI.test(after)
        ) {
          return;
        }
      }

      found.push({ line: lineIndex + 1, column: i + 1, label });
    });
  });

  return found;
}

/** İç içe bir çeviri nesnesini `ns:a.b.c` biçimine düzleştirir. */
export function flattenTranslations(tree, namespace) {
  const flat = new Map();

  const walk = (node, prefix) => {
    for (const [key, value] of Object.entries(node)) {
      const path = prefix === '' ? key : `${prefix}.${key}`;
      if (typeof value === 'object' && value !== null) {
        walk(value, path);
        continue;
      }
      flat.set(`${namespace}:${path}`, value);
    }
  };

  walk(tree, '');
  return flat;
}

/**
 * Bir kaynak dosyadaki `t()` anahtar kullanımlarını bulur. SAF — dosya
 * sistemine dokunmuyor, böylece testler onu doğrudan sınayabiliyor.
 *
 * **Namespace çözümü — üç bağlama biçimi de ölçüldü (5.6):**
 *   `useTranslation('common')` · `useTranslation()` → varsayılan ·
 *   `withTranslation('errors')`
 * Dosyada hiç bağlama yoksa varsayılan namespace kullanılır. Birden fazla
 * bağlama varsa anahtar **hepsine karşı** aranır: birinde varsa kullanılmış
 * sayılır. (Bugün her dosya tek namespace bağlıyor — ölçüldü.)
 *
 * ⚠️ **MODÜL SABİTLERİ ÇÖZÜLÜR, BEYAN EDİLMEZ.** `t(TAB_LABEL_KEYS[id])`
 * çağrısı sabitin **bütün** dize değerlerini kullanılmış sayar. Bu, 5.5'in
 * ESLint kuralında **yapılamayan** şeyin buradaki karşılığı ve fark önemli:
 * orada soru *"bu dize düz metin mi?"*ydi ve AST'nin cevabı yok; burada soru
 * *"bu dize `t()`ye ulaşıyor mu?"* ve AST'nin cevabı **var**.
 */
export function findKeyUsages(fileName, text, defaultNamespace) {
  const sf = ts.createSourceFile(fileName, text, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TSX);
  const lineOf = (node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;

  /** Dosyanın bağladığı namespace'ler. */
  const namespaces = new Set();
  /** Modül düzeyi dize sabitleri: ad → değerler. */
  const constants = new Map();
  /** Bulunan kullanımlar. */
  const usages = [];

  /** Bir düğümdeki dize literallerini toplar; TİP konumlarına GİRMEZ. */
  const stringsIn = (node, out) => {
    if (ts.isTypeNode(node)) return;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) out.push(node.text);
    ts.forEachChild(node, (child) => {
      stringsIn(child, out);
    });
  };

  for (const stmt of sf.statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    for (const decl of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || decl.initializer === undefined) continue;
      const values = [];
      stringsIn(decl.initializer, values);
      if (values.length > 0) constants.set(decl.name.text, values);
    }
  }

  const namespaceArgument = (node) => {
    const first = node.arguments[0];
    if (first === undefined) return null;
    const values = [];
    stringsIn(first, values);
    return values;
  };

  const record = (node, key) => {
    // Açık ön ek varsa namespace kesindir: `t('errors:boundary.body')`.
    const separator = key.indexOf(':');
    if (separator > 0) {
      usages.push({
        key: key.slice(separator + 1),
        namespaces: [key.slice(0, separator)],
        line: lineOf(node),
      });
      return;
    }
    usages.push({ key, namespaces: null, line: lineOf(node) });
  };

  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const name = ts.isIdentifier(callee)
        ? callee.text
        : ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.name)
          ? callee.name.text
          : null;

      if (name === 'useTranslation' || name === 'withTranslation') {
        const bound = namespaceArgument(node) ?? [];
        if (bound.length === 0) namespaces.add(defaultNamespace);
        for (const ns of bound) namespaces.add(ns);
      }

      if (name === 't') {
        const first = node.arguments[0];
        if (first !== undefined) {
          if (ts.isStringLiteral(first) || ts.isNoSubstitutionTemplateLiteral(first)) {
            record(first, first.text);
          } else {
            // Modül sabiti üzerinden giden anahtarlar — kökteki tanımlayıcı
            // bilinen bir sabitse BÜTÜN değerleri kullanılmış sayılır.
            let root = first;
            while (ts.isElementAccessExpression(root) || ts.isPropertyAccessExpression(root)) {
              root = root.expression;
            }
            if (ts.isIdentifier(root)) {
              for (const value of constants.get(root.text) ?? []) record(first, value);
            }
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sf);

  const bound = namespaces.size > 0 ? [...namespaces] : [defaultNamespace];
  return usages.map((usage) => ({
    ...usage,
    namespaces: usage.namespaces ?? bound,
  }));
}

/**
 * Bir kaynak dosyadaki BÜTÜN dize literallerini toplar — tip konumları hariç.
 *
 * ⚠️ **NEDEN AYRI BİR ÇÖZÜMLEME (5.6'da ölçülerek bulundu).** İki denetim iki
 * ayrı soru soruyor ve aynı analiz ikisine birden yetmiyor:
 *
 * | Denetim | Soru | Gereken |
 * |---|---|---|
 * | **eksik** | *"Bu `t()` çağrısının anahtarı var mı?"* | **namespace çözümü** — `t()` analizi |
 * | **kullanılmayan** | *"Bu anahtara herhangi bir yerden atıf var mı?"* | **atıf**, çağrı yeri değil |
 *
 * İlk koşuda `errors:boundary.*`in dört anahtarı *"kullanılmayan"* çıktı ve
 * **yanlıştı**: onlar `t()`ye bir **prop** üzerinden gidiyor
 * (`<ErrorBoundary titleKey="boundary.screen">` → `t(this.props.titleKey)`).
 * Prop zincirini takip etmek bir veri akışı analizi ister; *"anahtara eşit bir
 * literal var mı"* sorusu ise aynı vakayı **kesin** cevaplıyor.
 *
 * ⚠️ **BUNUN BEDELİ YAZILIYOR:** ölü koddaki bir literal de bir atıf sayılır,
 * yani *"kullanılmayan"* denetimi **atfı** görür, **çalışan çağrıyı** değil.
 * Bilinçli takas: bu denetimin asıl işi yetim anahtarı bulmak ve yanlış
 * pozitif üreten bir kapı kapatılıp bir daha hiçbir şey yakalamaz.
 *
 * **Tip konumları HARİÇ ve bu bir karar:** `BoundaryTitleKey` birleşimi dört
 * anahtarı sayıyor; yalnızca orada geçen ama hiçbir çağrı yerinden
 * geçirilmeyen bir anahtar gerçekten kullanılmıyordur.
 */
export function findStringLiterals(fileName, text) {
  const sf = ts.createSourceFile(fileName, text, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TSX);
  const literals = [];

  const visit = (node) => {
    if (ts.isTypeNode(node)) return;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      literals.push(node.text);
    }
    ts.forEachChild(node, visit);
  };

  visit(sf);
  return literals;
}

/** `DYNAMIC_KEY_PREFIXES` beyanını TEK kaynağından okur. */
export function parseDynamicPrefixes(text) {
  const sf = ts.createSourceFile('decl.ts', text, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
  const prefixes = [];

  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'DYNAMIC_KEY_PREFIXES' &&
      node.initializer !== undefined
    ) {
      const collect = (n) => {
        if (ts.isTypeNode(n)) return;
        if (ts.isStringLiteral(n)) prefixes.push(n.text);
        ts.forEachChild(n, collect);
      };
      collect(node.initializer);
    }
    ts.forEachChild(node, visit);
  };

  visit(sf);
  return prefixes;
}

/** Bir dizin ağacındaki dosyaları toplar. */
function collectFiles(root, extensions) {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      if (SKIP_DIRS.has(entry)) continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (extensions.some((ext) => entry.endsWith(ext))) out.push(full);
    }
  };
  walk(root);
  return out;
}

const toPosix = (root, file) => relative(root, file).split(sep).join('/');

/**
 * Bütün denetimi koşturur.
 *
 * @returns {{errors: {check: string, message: string}[], notes: string[],
 *            counts: Record<string, number>}}
 */
export function runI18nCheck(root, options = {}) {
  const localeDir = options.localeDir ?? join(root, 'apps/web/src/locales/tr');

  /**
   * KAYNAK KÖKLERİ — 6.4'te **tek**ten **iki**ye çıktı.
   *
   * ⚠️ Bu genişletme 6.0 ⑥'da ölçülerek kararlaştırıldı ve **6.3'e atanmıştı**;
   * o alt görev kullanıcıya görünen metin üretmediği için sıra gelmedi. 6.4
   * tasarım sisteminin **ilk** `t()` çağrılarını getiriyor, yani boşluk tam
   * bugün ısırırdı: `packages/ui/src` taranmasaydı kapı **iki yönde birden**
   * yalan söylerdi — oradaki bir anahtar hatası *"eksik"* olarak
   * **bulunmaz**, ve `common.json`daki karşılıkları *"kullanılmayan"* diye
   * **yanlışlıkla bildirilirdi**.
   *
   * ⚠️ **VAR OLMAYAN KÖK SESSİZCE ATLANMIYOR.** Sahte depolarda kurulan
   * testler `packages/ui/src` taşımıyor; onu `readdirSync` ile taramak
   * kırılırdı. Atlanan her kök `notes`a yazılıyor ve sayısı `counts`ta —
   * sessiz bir muafiyet kapsamı yutar (D3).
   */
  const sourceDirs = options.sourceDirs ?? [
    options.sourceDir ?? join(root, 'apps/web/src'),
    join(root, 'packages/ui/src'),
  ];
  const declarationFile =
    options.declarationFile ?? join(root, 'apps/web/src/app/i18n-dynamic-keys.ts');
  const defaultNamespace = options.defaultNamespace ?? 'common';

  const errors = [];
  const notes = [];

  // ── Çeviri kaynakları ────────────────────────────────────────────────────
  const defined = new Map();
  for (const file of readdirSync(localeDir)) {
    if (!file.endsWith('.json')) continue;
    const namespace = file.slice(0, -'.json'.length);
    const tree = JSON.parse(readFileSync(join(localeDir, file), 'utf8'));
    for (const [key, value] of flattenTranslations(tree, namespace)) defined.set(key, value);
  }

  // ── ③ BOŞ ÇEVİRİ ─────────────────────────────────────────────────────────
  for (const [key, value] of defined) {
    if (typeof value === 'string' && value.trim() === '') {
      errors.push({ check: 'empty', message: `Boş çeviri: '${key}'` });
    }
  }

  // ── Kullanımlar ──────────────────────────────────────────────────────────
  const presentRoots = [];
  for (const dir of sourceDirs) {
    if (existsSync(dir)) presentRoots.push(dir);
    else notes.push(`Kaynak kökü yok, atlandı: ${toPosix(root, dir)}`);
  }

  if (presentRoots.length === 0) {
    errors.push({
      check: 'source-root',
      message: 'Hiçbir kaynak kökü bulunamadı — tarayıcı kör, "0 eksik anahtar" bir onay değil.',
    });
  }

  const sourceFiles = presentRoots
    .flatMap((dir) => collectFiles(dir, SOURCE_EXTENSIONS))
    .filter((file) => !/\.test\.tsx?$/.test(file) && !file.endsWith('.d.ts'));

  const used = new Set();
  /** Kaynak ağacındaki her dize literali — "kullanılmayan" denetimi için. */
  const literals = new Set();

  for (const file of sourceFiles) {
    const rel = toPosix(root, file);
    const text = readFileSync(file, 'utf8');

    for (const literal of findStringLiterals(rel, text)) literals.add(literal);

    for (const usage of findKeyUsages(rel, text, defaultNamespace)) {
      const resolved = usage.namespaces
        .map((ns) => `${ns}:${usage.key}`)
        .find((candidate) => defined.has(candidate));

      // ── ① EKSİK ANAHTAR ────────────────────────────────────────────────
      if (resolved === undefined) {
        errors.push({
          check: 'missing',
          message: `Eksik anahtar: '${usage.key}' (${rel}:${String(usage.line)}) — aranan namespace: ${usage.namespaces.join(', ')}`,
        });
        continue;
      }
      used.add(resolved);
    }
  }

  // ── ② KULLANILMAYAN ANAHTAR ──────────────────────────────────────────────
  const prefixes = parseDynamicPrefixes(readFileSync(declarationFile, 'utf8'));
  if (prefixes.length === 0) {
    errors.push({
      check: 'declaration',
      message:
        'Dinamik anahtar beyanı BOŞ ya da okunamadı — bu bir yapılandırma hatası, ' +
        'boş bir beyan bütün dinamik aileleri sessizce "kullanılmayan" yapar.',
    });
  }

  for (const key of defined.keys()) {
    if (used.has(key)) continue;
    // Anahtara eşit bir literal herhangi bir yerde geçiyorsa bu bir ATIFTIR —
    // `t()` çağrısı olmak zorunda değil (prop olarak taşınabilir).
    const bare = key.slice(key.indexOf(':') + 1);
    if (literals.has(key) || literals.has(bare)) continue;
    if (prefixes.some((prefix) => key.startsWith(prefix))) continue;
    errors.push({ check: 'unused', message: `Kullanılmayan anahtar: '${key}'` });
  }

  // ── ④ GÖRÜNMEZ KARAKTER ──────────────────────────────────────────────────
  //
  // ⚠️ `locales/**` RAPOR EDER, KIRMAZ — ROADMAP'in şartı: bir çeviri metni
  // bölünmez boşluğu MEŞRU olarak isteyebilir (sayı + birim). Kaynak kodda ve
  // belgelerde ise gömülü karakter bir hatadır.
  let scannedForInvisible = 0;
  for (const file of collectFiles(root, SCANNED_EXTENSIONS)) {
    const rel = toPosix(root, file);
    scannedForInvisible += 1;
    const hits = findInvisibleCharacters(readFileSync(file, 'utf8'));
    const inLocales = rel.includes('/locales/');
    for (const hit of hits) {
      const where = `${rel}:${String(hit.line)}:${String(hit.column)} ${hit.label}`;
      if (inLocales) notes.push(`Görünmez karakter (çeviri metni — bilgi): ${where}`);
      else errors.push({ check: 'invisible', message: `Gömülü görünmez karakter: ${where}` });
    }
  }

  return {
    errors,
    notes,
    counts: {
      definedKeys: defined.size,
      usedKeys: used.size,
      dynamicPrefixes: prefixes.length,
      sourceFiles: sourceFiles.length,
      sourceRoots: presentRoots.length,
      scannedForInvisible,
    },
  };
}

/** CLI: `node tools/i18n-check/index.mjs [kök]` */
if (process.argv[1]?.endsWith(join('i18n-check', 'index.mjs')) === true) {
  const root = process.argv[2] ?? process.cwd();
  const { errors, notes, counts } = runI18nCheck(root);

  process.stdout.write('i18n:check — çeviri kaynağı denetimi\n');
  process.stdout.write(`  tanımlı anahtar    : ${String(counts.definedKeys)}\n`);
  process.stdout.write(`  kullanılan anahtar : ${String(counts.usedKeys)}\n`);
  process.stdout.write(`  dinamik ön ek      : ${String(counts.dynamicPrefixes)}\n`);
  process.stdout.write(
    `  taranan kaynak     : ${String(counts.sourceFiles)} dosya · ${String(counts.sourceRoots)} kök\n`,
  );
  process.stdout.write(`  görünmez tarama    : ${String(counts.scannedForInvisible)} dosya\n\n`);

  for (const note of notes) process.stdout.write(`  ℹ ${note}\n`);
  if (notes.length > 0) process.stdout.write('\n');

  if (errors.length === 0) {
    process.stdout.write('✓ i18n:check temiz\n');
  } else {
    for (const error of errors) process.stderr.write(`  ✗ [${error.check}] ${error.message}\n`);
    process.stderr.write(`\n✗ i18n:check ${String(errors.length)} hata buldu\n`);
    process.exitCode = 1;
  }
}
