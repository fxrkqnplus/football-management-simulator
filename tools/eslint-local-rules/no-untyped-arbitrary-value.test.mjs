/**
 * `no-untyped-arbitrary-value` kuralının testi — ÜÇ KATMAN, üçü AYRI İDDİA.
 *
 * ① **`RuleTester`** — kuralın MANTIĞI: geçerli/geçersiz sınıf jetonları,
 *    iki sözdizimi, varyant önekleri, JSX niteliği, şablon dizgisi.
 * ② **TÜRETME NÖBETÇİSİ** — kural token türlerini `tokens.generated.css`ten
 *    türetir (ikinci liste yok, DZ-07). Bu katman o türetmenin BÜTÜN olduğunu
 *    iddia eder: üretilmiş CSS'teki her `--text-*` / `--font-*` token'ı bilinen
 *    bir sınıfa düşer (yeni bir token şekli "bilinmiyor" kalamaz); bilinen
 *    üç ad beklenen sınıfta; dosya yoksa yükleyici FIRLATIR (kapalı-güvenli).
 * ③ **KANARYA** — `pnpm lint` bu kuralı GERÇEKTEN koşturuyor mu (6.1'in
 *    BORÇ-010 deseni: `RuleTester` bunu kanıtlayamaz).
 *
 * ⚠️ KOPYALANMADI, UYARLANDI (4.8'in idiomu). Emsal `no-hardcoded-path`: bu
 * kuralın ihlali farklı (sınıf dizgisi), mesaj kimlikleri ÜÇ (`untypedValue` ·
 * `unknownToken` · `hintMismatch`), muafiyet ekseni TEK (`*.test.*` — sınıf
 * dizgisi orada VERİ). Yol tanım yeri ekseni YOK.
 *
 * ⚠️ DİSKE HİÇBİR ŞEY YAZILMIYOR — `lintText` var olan gerçek bir dosyanın
 * kimliği altında koşar (5.5'in ölçtüğü üç sebep: `projectService` ayrıştırma
 * hatası · vitest glob yarışı · `coverage.include` paydası).
 *
 * ⚠️ BU DOSYA `*.test.mjs` OLARAK MUAF — fixture'ları etiketsiz jetonlar
 * taşıyor; muafiyet olmasaydı kuralın kendi testi lint'i kırardı. Kanarya
 * muafiyeti ayrıca iddia ediyor (③), sessiz bırakmıyor.
 */
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ESLint, RuleTester } from 'eslint';
import { beforeAll, describe, expect, it } from 'vitest';

import rule, {
  AMBIGUOUS_UTILITIES,
  classifyTokenValue,
  loadTokenClasses,
  parseClassToken,
  TOKEN_CSS_PATH,
} from './no-untyped-arbitrary-value.js';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

// ─── ① MANTIK ───────────────────────────────────────────────────────────────

ruleTester.run('no-untyped-arbitrary-value', rule, {
  valid: [
    // İpucu var ve token'la uyumlu
    "const c = 'text-[length:var(--text-sm)]';",
    "const c = 'text-[length:var(--text-2xs)] leading-none';",
    "const c = 'font-[family-name:var(--font-ui)] font-medium';",
    "const c = 'font-[family-name:var(--font-mono)]';",
    "const c = 'text-[color:var(--text-primary)]';",
    // Renk token'ı çıplak: varsayılan (renk) niyetle örtüşüyor → serbest
    "const c = 'text-[var(--text-primary)] text-[var(--text-secondary)]';",
    "const c = 'text-[var(--text-muted)]';",
    "const c = 'text-[var(--danger)] text-[var(--success)] text-[var(--accent)]';",
    // Kısa sözdizimi, uyumlu
    "const c = 'text-(length:--text-sm) text-(--text-primary)';",
    "const c = 'font-(family-name:--font-ui)';",
    // Varyant önekli, uyumlu
    "const c = '[[data-cvd]_&]:text-[length:var(--text-xs)] hover:text-[var(--accent)]';",
    // `var()` içermeyen keyfi değerler: Tailwind birim/renk şeklinden çıkarır
    "const c = 'text-[13px] text-[#fff] font-[500]';",
    // Belirsiz olmayan önekler kapsam dışı
    "const c = 'bg-[var(--bg-base)] border-[var(--border-subtle)] gap-[var(--space-2)] z-[var(--z-toast)]';",
    "const c = 'leading-[var(--text-sm-line)] rounded-[var(--radius-md)]';",
    // Ön ayarlı yardımcılar
    "const c = 'text-sm font-medium text-center';",
    // JSX niteliği, uyumlu
    'const el = <span className="font-[family-name:var(--font-ui)] text-[length:var(--text-sm)]" />;',
    // Şablon dizgisi, uyumlu
    'const c = `text-[length:var(--text-sm)] ${extra}`;',
    // Yorumdaki örnek bir düğüm değildir — kural onu görmez
    "// text-[var(--text-sm)] burada yalnızca anlatılıyor\nconst c = 'text-sm';",
    // Sınıf olmayan dizgide `var(` geçmesi: jeton deseni uymuyor
    "const css = 'color: var(--text-sm);';",
  ],
  invalid: [
    {
      // Tam veri: mesaj yazılacak ipucunu ADIYLA söylüyor mu (`length:`)
      code: "const c = 'text-[var(--text-sm)]';",
      errors: [
        {
          messageId: 'untypedValue',
          data: {
            token: 'text-[var(--text-sm)]',
            variable: 'text-sm',
            utility: 'text',
            tokenClass: 'length',
            defaultClass: 'color',
            hint: 'length',
          },
        },
      ],
    },
    {
      code: "const c = 'text-[var(--text-2xs)] text-[var(--text-secondary)]';",
      errors: [{ messageId: 'untypedValue' }],
    },
    {
      code: "const c = 'font-[var(--font-ui)] font-medium';",
      errors: [
        {
          messageId: 'untypedValue',
          data: {
            token: 'font-[var(--font-ui)]',
            variable: 'font-ui',
            utility: 'font',
            tokenClass: 'family-name',
            defaultClass: 'number',
            hint: 'family-name',
          },
        },
      ],
    },
    {
      code: "const c = 'font-[var(--font-mono)]';",
      errors: [{ messageId: 'untypedValue' }],
    },
    // Bir dizgide iki ihlal → iki rapor (yarısı sessizce ölmesin)
    {
      code: "const c = 'font-[var(--font-ui)] text-[var(--text-xs)] text-[var(--text-muted)]';",
      errors: [{ messageId: 'untypedValue' }, { messageId: 'untypedValue' }],
    },
    // Dizgi birleştirme: her Literal ayrı düğüm
    {
      code: "const c = 'px-2 ' + 'text-[var(--text-base)]';",
      errors: [{ messageId: 'untypedValue' }],
    },
    // Şablon dizgisi, ifade içeren: sabit parça yine okunur
    {
      code: 'const c = `text-[var(--text-lg)] ${x}`;',
      errors: [{ messageId: 'untypedValue' }],
    },
    // JSX niteliği
    {
      code: 'const el = <p className="font-[var(--font-ui)] text-[var(--text-sm)]" />;',
      errors: [{ messageId: 'untypedValue' }, { messageId: 'untypedValue' }],
    },
    // Varyant öneki ipucu eksikliğini gizlemez
    {
      code: "const c = '[[data-cvd]_&]:text-[var(--text-2xs)]';",
      errors: [{ messageId: 'untypedValue' }],
    },
    // Kısa sözdizimi de belirsiz
    {
      code: "const c = 'text-(--text-sm)';",
      errors: [{ messageId: 'untypedValue' }],
    },
    // Yanlış ipucu: renk denilen şey uzunluk
    {
      code: "const c = 'text-[color:var(--text-sm)]';",
      errors: [{ messageId: 'hintMismatch' }],
    },
    // Yanlış ipucu: aile denilen şey renk
    {
      code: "const c = 'font-[family-name:var(--text-primary)]';",
      errors: [{ messageId: 'hintMismatch' }],
    },
    // Bilinmeyen token → kapalı-güvenli hata
    {
      code: "const c = 'text-[var(--text-hero)]';",
      errors: [{ messageId: 'unknownToken' }],
    },
    // Uzunluk token'ı olsa da `text-` altında ipucusuz → renk olurdu
    {
      code: "const c = 'text-[var(--space-2)]';",
      errors: [{ messageId: 'untypedValue' }],
    },
  ],
});

// ─── ② TÜRETME NÖBETÇİSİ ────────────────────────────────────────────────────

describe("TÜRETME: token türleri tokens.generated.css'ten geliyor, ikinci liste yok", () => {
  it('kaynak dosya kuralın beklediği yolda', () => {
    expect(existsSync(TOKEN_CSS_PATH)).toBe(true);
  });

  it('her --text-* ve --font-* token\'ı BİLİNEN bir sınıfa düşüyor (yeni şekil "unknown" kalamaz)', () => {
    const classes = loadTokenClasses();
    const ours = [...classes.entries()].filter(([name]) => /^(text|font)-/.test(name));
    expect(ours.length).toBeGreaterThan(0);
    const unknown = ours.filter(([, cls]) => cls === 'unknown').map(([name]) => `--${name}`);
    expect(unknown, 'bilinmeyen şekilli token — classifyTokenValue genişletilmeli').toEqual([]);
    // Kapsam satırı: kaç token, hangi sınıf kaç tane (D3 — "0 bulundu" ile "bakılmadı" ayrılsın)
    const histogram = {};
    for (const [, cls] of ours) histogram[cls] = (histogram[cls] ?? 0) + 1;
    expect(Object.keys(histogram).sort()).toEqual(['color', 'family-name', 'length']);
  });

  it('bilinen üç ad beklenen sınıfta — türetme yönü ters okunmasın', () => {
    const classes = loadTokenClasses();
    expect(classes.get('text-sm')).toBe('length');
    expect(classes.get('text-primary')).toBe('color');
    expect(classes.get('font-ui')).toBe('family-name');
  });

  it('sınıflayıcı şekilleri: hex/rgb/oklch renk · px/rem uzunluk · tırnaklı aile · çıplak sayı', () => {
    expect(classifyTokenValue('#E8ECF3')).toBe('color');
    expect(classifyTokenValue('oklch(0.7 0.1 250)')).toBe('color');
    expect(classifyTokenValue('13px')).toBe('length');
    expect(classifyTokenValue('0.875rem')).toBe('length');
    expect(classifyTokenValue("'Inter', system-ui, sans-serif")).toBe('family-name');
    expect(classifyTokenValue('600')).toBe('number');
    expect(classifyTokenValue('0 1px 2px rgba(0,0,0,.2)')).toBe('unknown');
  });

  it('dosya yoksa yükleyici FIRLATIR — sessizce "her şey serbest" demez (kapalı-güvenli)', () => {
    expect(() => loadTokenClasses(resolve(TOKEN_CSS_PATH, '../yok.generated.css'))).toThrow(
      /token dosyası okunamadı/,
    );
  });

  it('ipucu tabloları Tailwind 4.3.3 kaynağındaki adlarla aynı (F4: belge değil kaynak)', () => {
    // dist/lib.js: text → Q(g,["color","length","percentage","absolute-size","relative-size"])
    //              font → Q(g,["number","generic-name","family-name"])
    expect(Object.keys(AMBIGUOUS_UTILITIES.text.hints).sort()).toEqual(
      ['absolute-size', 'color', 'length', 'percentage', 'relative-size'].sort(),
    );
    expect(Object.keys(AMBIGUOUS_UTILITIES.font.hints).sort()).toEqual(
      ['family-name', 'generic-name', 'number'].sort(),
    );
    expect(AMBIGUOUS_UTILITIES.text.defaultClass).toBe('color');
    expect(AMBIGUOUS_UTILITIES.font.defaultClass).toBe('number');
  });

  it('jeton ayrıştırıcı iki sözdizimini, varyantı ve /değiştiriciyi okuyor', () => {
    expect(parseClassToken('text-[var(--text-sm)]')).toEqual({
      utility: 'text',
      hint: null,
      variable: 'text-sm',
    });
    expect(parseClassToken('hover:font-[family-name:var(--font-ui)]')).toEqual({
      utility: 'font',
      hint: 'family-name',
      variable: 'font-ui',
    });
    expect(parseClassToken('text-(length:--text-sm)')).toEqual({
      utility: 'text',
      hint: 'length',
      variable: 'text-sm',
    });
    expect(parseClassToken('text-[var(--text-primary)]/50')).toEqual({
      utility: 'text',
      hint: null,
      variable: 'text-primary',
    });
    expect(parseClassToken('bg-[var(--bg-base)]')).toBeNull();
    expect(parseClassToken('text-sm')).toBeNull();
  });
});

// ─── ③ KANARYA ──────────────────────────────────────────────────────────────

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../..');
const RULE_ID = 'local/no-untyped-arbitrary-value';

/** Gerçek, diskte var olan kimlikler — sınıf dizgisi taşıyan bir ürün dosyası ve onun testi. */
const SOURCE_IDENTITY = 'packages/ui/src/components/form-indicator.tsx';
const TEST_IDENTITY = 'packages/ui/src/components/form-indicator.test.tsx';

/** Üç mesaj kimliğinin üçünü de tetikleyen kesin bir ihlal. */
const CANARY_CODE =
  "export const a = 'font-[var(--font-ui)] text-[var(--text-xs)]';\n" +
  "export const b = 'text-[color:var(--text-sm)]';\n" +
  "export const c = 'text-[var(--text-hero)]';\n";

describe('KANARYA: kural gerçek depoda KABLOLU mu', () => {
  /** @type {InstanceType<typeof ESLint>} */
  let eslint;

  beforeAll(() => {
    eslint = new ESLint({ cwd: REPO_ROOT });
  });

  it('kanaryanın büründüğü iki kimlik de gerçekten diskte var', () => {
    for (const identity of [SOURCE_IDENTITY, TEST_IDENTITY]) {
      expect(existsSync(resolve(REPO_ROOT, identity))).toBe(true);
    }
  });

  it('GERÇEK yapılandırma bu kuralı ÜRÜN dosyasında `error` olarak açıyor', async () => {
    const config = await eslint.calculateConfigForFile(SOURCE_IDENTITY);
    // `index.js`ten sökülürse `undefined`, `warn`a çekilirse [1], `off` yapılırsa [0].
    expect(config.rules[RULE_ID]).toEqual([2]);
  }, 30_000);

  it('ÜRÜN dosyası kimliğinde kural GERÇEKTEN ötüyor (uçtan uca) — üç mesaj kimliği', async () => {
    const results = await eslint.lintText(CANARY_CODE, {
      filePath: SOURCE_IDENTITY,
      warnIgnored: false,
    });
    expect(results).toHaveLength(1);
    const messages = results[0].messages;
    expect(messages.filter((m) => m.ruleId === null)).toEqual([]);
    const ours = messages.filter((m) => m.ruleId === RULE_ID);
    expect(ours.every((m) => m.severity === 2)).toBe(true);
    expect(ours.map((m) => m.messageId).sort()).toEqual(
      ['hintMismatch', 'unknownToken', 'untypedValue', 'untypedValue'].sort(),
    );
  }, 30_000);

  it('MUAFİYET KANARYASI — aynı ihlal bir BİRİM TESTİNDE ötmüyor (sınıf dizgisi orada VERİ)', async () => {
    const results = await eslint.lintText(CANARY_CODE, {
      filePath: TEST_IDENTITY,
      warnIgnored: false,
    });
    expect(results).toHaveLength(1);
    expect(results[0].messages.filter((m) => m.ruleId === RULE_ID)).toEqual([]);
    const config = await eslint.calculateConfigForFile(TEST_IDENTITY);
    expect(config.rules[RULE_ID]).toEqual([0]);
  }, 30_000);

  it('MUAFİYET DAR — `*.stories.tsx` ve `*.spec.tsx` muaf DEĞİL (gerçek sınıf render eder)', async () => {
    for (const identity of [
      'packages/ui/src/components/form-indicator.stories.tsx',
      'apps/web/src/kadro.spec.tsx',
    ]) {
      const config = await eslint.calculateConfigForFile(identity);
      expect(config.rules[RULE_ID], identity).toEqual([2]);
    }
  }, 30_000);
});
