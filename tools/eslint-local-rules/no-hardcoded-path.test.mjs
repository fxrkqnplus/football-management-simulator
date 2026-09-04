/**
 * `no-hardcoded-path` kuralının testi — İKİ KATMAN, ve ikisi AYRI İDDİA.
 *
 * ① **`RuleTester`** — kuralın MANTIĞI doğru mu. İzole çalışır: kendi
 *    yapılandırmasını kurar, deponun `eslint.config.js`ine hiç bakmaz.
 * ② **KANARYA** (Faz 6.1, BORÇ-010) — `pnpm lint` bu kuralı GERÇEKTEN
 *    koşturuyor mu. Bambaşka bir iddia ve `RuleTester` onu **kanıtlayamaz**.
 *
 * NEDEN ① VAR: bir lint kuralının en büyük riski yanlış pozitiftir. Geliştirici
 * meşru koduna hata aldığında kuralı devre dışı bırakır ve kural bir daha
 * hiçbir şey yakalamaz. Bu yüzden geçerli senaryolar en az geçersizler kadar
 * ayrıntılı test edilir.
 *
 * ⚠️ **NEDEN ② ŞART — VE NEDEN BU KURAL İÇİN 5.5'TE YAZILMADI.**
 * 5.5 `no-bare-jsx-text` için gerçek depoda koşan bir kanarya yazdı ve **aynı
 * mekanizmayla bu kuralın da kablolu olduğunu ölçtü** — ama o iddia bir teste
 * **yazılmadı**. Yani bugüne kadar `local/no-hardcoded-path` `eslint.config.js`ten
 * sessizce kalksa `pnpm lint` **0 der** ve hiçbir test bunu söylemezdi; aşağıdaki
 * `RuleTester` süiti kuralı **izole** koşturuyor (D3). → **BORÇ-010**, 5.6'da
 * açıldı, ödeme fazı Faz 6, ödendi **6.1**.
 *
 * ⚠️ **KOPYALANMADI, UYARLANDI — ve fark burada yazılı** (4.8'in idiomu).
 * 5.5'in kanaryası `no-bare-jsx-text` için yazılmıştı; bu kuralın **ihlali**
 * farklı (JSX metni değil, sabit yol — ve **iki** mesaj kimliği: `hardcodedPath`
 * + `basePrefixed`) ve **muafiyet kümesi İKİ EKSENLİ**:
 *
 *   | Eksen | `no-bare-jsx-text` | `no-hardcoded-path` |
 *   |---|---|---|
 *   | birim testler | muaf | muaf |
 *   | **yol TANIM YERLERİ** | — (böyle bir ekseni yok) | **muaf** (`base-path.ts`, `server/env.ts`, `tools/eslint-local-rules/**`, `tools/arch-check/**`) |
 *
 * *"Bir kuralın İKİ EKSENİ varsa, birini doğrulamak diğerini doğrulamaz"* —
 * bu yüzden aşağıda **iki ayrı muafiyet vakası** var. 5.5'in kanaryasında bir
 * tane yeterliydi.
 *
 * ⚠️ **DİSKE HİÇBİR ŞEY YAZILMIYOR** — 5.5'in ölçtüğü üç sebep aynen geçerli:
 * `lintText` var **olmayan** bir yol için `projectService` ayrıştırma hatası
 * veriyor · koşu ortasında dosya yaratmak vitest glob'larıyla bir yarış ·
 * yaratılan dosya `coverage.include` ile eşleşip paydayı oynatabilir.
 * Çözüm: **var olan gerçek bir dosyanın kimliği** altında lint etmek.
 *
 * ⚠️ **BU DOSYANIN KENDİSİ MUAF** (`tools/eslint-local-rules/**`) — ama bu
 * kanaryayı etkilemiyor, çünkü `lintText` yapılandırmayı **verilen `filePath`
 * kimliğinden** çözüyor, dosyanın gerçek konumundan değil.
 */
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ESLint, RuleTester } from 'eslint';
import { beforeAll, describe, expect, it } from 'vitest';

import rule from './no-hardcoded-path.js';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
  },
});

ruleTester.run('no-hardcoded-path', rule, {
  valid: [
    // İzin verilen sarmalayıcılar
    "basePath('/api/health');",
    "apiPath('/health');",
    "helpers.basePath('/login');",

    // Ön ek tam segment olarak eşleşmiyor — yanlış pozitif olmamalı
    "const s = '/apiary';",
    "const s = '/authentic-cases';",
    "const s = '/logins-report';",

    // Uygulama yolu olmayan mutlak dizgiler
    "const s = '/';",
    "const s = '/health';",
    "const s = '/usr/local/bin';",
    "const css = 'grid-template-columns';",

    // Regex literali dizgi düğümü değildir
    'const re = /^\\/api\\/v1/;',

    // Modül belirteçleri atlanır
    "import x from '/api/thing';",
    "export * from '/api/thing';",

    // Dinamik şablon — sabit değil
    'const s = `/api/${id}`;',

    // Yorumlar hiç görülmez
    "// fetch('/api/health') burada yalnızca açıklama\nconst s = 1;",
  ],

  invalid: [
    {
      code: "fetch('/api/health');",
      errors: [{ messageId: 'hardcodedPath', data: { value: '/api/health' } }],
    },
    {
      code: "const p = '/login';",
      errors: [{ messageId: 'hardcodedPath' }],
    },
    {
      code: "const p = '/api';",
      errors: [{ messageId: 'hardcodedPath' }],
    },
    {
      code: "const p = '/assets/logo.png';",
      errors: [{ messageId: 'hardcodedPath' }],
    },
    {
      // İfade içermeyen şablon literali de sabittir
      code: 'fetch(`/api/health`);',
      errors: [{ messageId: 'hardcodedPath' }],
    },
    {
      // Sorgu dizesiyle
      code: "fetch('/api?x=1');",
      errors: [{ messageId: 'hardcodedPath' }],
    },
    {
      // Alt yol ön eki elle yazılmış — basePath() İÇİNDE bile hata
      code: "basePath('/fms/api');",
      errors: [{ messageId: 'basePrefixed', data: { value: '/fms/api' } }],
    },
    {
      code: "const p = '/fms';",
      errors: [{ messageId: 'basePrefixed' }],
    },
  ],
});

// ─────────────────────────────────────────────────────────────────────────────
// KANARYA — `pnpm lint` bu kuralı gerçekten koşturuyor mu? (BORÇ-010)
// ─────────────────────────────────────────────────────────────────────────────

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const RULE_ID = 'local/no-hardcoded-path';

/**
 * Kanaryanın kimliğe büründüğü GERÇEK dosyalar. Var olmaları şart —
 * `projectService` var olmayan bir yol için ayrıştırma hatası veriyor.
 */
const SOURCE_IDENTITY = 'apps/web/src/lib/api.ts';
const TEST_IDENTITY = 'apps/web/src/lib/api.test.ts';
const DEFINITION_IDENTITY = 'packages/shared/src/base-path.ts';

/** Kesin bir ihlal: iki mesaj kimliği ve üç rapor. */
const CANARY_CODE =
  "export const url = '/api/health';\n" +
  "export const withBase = '/fms/login';\n" +
  'export const tpl = `/auth/callback`;\n';

describe('KANARYA: kural gerçek depoda KABLOLU mu', () => {
  /** @type {InstanceType<typeof ESLint>} */
  let eslint;

  beforeAll(() => {
    eslint = new ESLint({ cwd: REPO_ROOT });
  });

  it('kanaryanın büründüğü üç kimlik de gerçekten diskte var', () => {
    // Bu dosyalar taşınır/silinirse kanarya yanıltıcı bir "ayrıştırma hatası"
    // ile kırılır; sebebi burada adıyla söyleniyor.
    for (const identity of [SOURCE_IDENTITY, TEST_IDENTITY, DEFINITION_IDENTITY]) {
      expect(existsSync(resolve(REPO_ROOT, identity))).toBe(true);
    }
  });

  it('GERÇEK yapılandırma bu kuralı ÜRÜN dosyasında `error` olarak açıyor', async () => {
    const config = await eslint.calculateConfigForFile(SOURCE_IDENTITY);
    // Kural `index.js`ten sökülürse `undefined`, `warn`a çekilirse [1],
    // `off` yapılırsa [0]. Üç bozulma da bu tek iddiada yakalanır.
    expect(config.rules[RULE_ID]).toEqual([2]);
  }, 30_000);

  it('ÜRÜN dosyası kimliğinde kural GERÇEKTEN ötüyor (uçtan uca)', async () => {
    const results = await eslint.lintText(CANARY_CODE, {
      filePath: SOURCE_IDENTITY,
      warnIgnored: false,
    });

    // Yol `ignores`a eklenirse ESLint hiç sonuç döndürmez.
    expect(results).toHaveLength(1);
    const messages = results[0].messages;

    // Ayrıştırma hatası kuralın çıktısını taklit edebilir — ayrı ayıklanıyor.
    expect(messages.filter((m) => m.ruleId === null)).toEqual([]);

    const ours = messages.filter((m) => m.ruleId === RULE_ID);
    expect(ours.every((m) => m.severity === 2)).toBe(true);
    // İKİ mesaj kimliği birden: yalnızca birini iddia etmek, kuralın
    // yarısının sessizce ölmesini görmezdi.
    expect(ours.map((m) => m.messageId).sort()).toEqual(
      ['basePrefixed', 'hardcodedPath', 'hardcodedPath'].sort(),
    );
  }, 30_000);

  it('MUAFİYET KANARYASI ① — aynı ihlal bir BİRİM TESTİNDE ötmüyor', async () => {
    // Birim testler yolları VERİ olarak kullanır: '/api/health' bir test
    // girdisidir, bir istek değildir. Muafiyet SESSİZ bırakılmıyor — ayrı bir
    // vaka olarak iddia ediliyor, çünkü "kısmi koruma D3 yanılsaması üretir".
    const results = await eslint.lintText(CANARY_CODE, {
      filePath: TEST_IDENTITY,
      warnIgnored: false,
    });

    expect(results).toHaveLength(1);
    expect(results[0].messages.filter((m) => m.ruleId === RULE_ID)).toEqual([]);

    const config = await eslint.calculateConfigForFile(TEST_IDENTITY);
    expect(config.rules[RULE_ID]).toEqual([0]);
  }, 30_000);

  it('MUAFİYET KANARYASI ② — YOL TANIM YERİ muaf (bu kuralın İKİNCİ ekseni)', async () => {
    // `no-bare-jsx-text`in böyle bir ekseni YOK. Alt yolun tanım yerleri
    // ('/fms' ve '/api' dizgilerini bilmek ZORUNDA olan dosyalar) ayrı bir
    // muafiyet bloğunda duruyor ve birinci ekseni doğrulamak bunu doğrulamaz.
    const config = await eslint.calculateConfigForFile(DEFINITION_IDENTITY);
    expect(config.rules[RULE_ID]).toEqual([0]);
  }, 30_000);

  it('MUAFİYET DAR ① — `*.spec.ts` muaf DEĞİL (Faz 17 uçtan uca gerçek istek atar)', async () => {
    // Yalnızca yapılandırma çözümlemesi — dosya diskte yok ve gerekmiyor
    // (5.5'te ölçüldü: `calculateConfigForFile` varlık aramıyor, `lintText` arıyor).
    const config = await eslint.calculateConfigForFile('apps/web/src/giris.spec.ts');
    expect(config.rules[RULE_ID]).toEqual([2]);
  }, 30_000);

  it('MUAFİYET DAR ② — muafiyet TAM YOL, gevşek bir `**/env.ts` deseni DEĞİL', async () => {
    // `eslint.config.js` bunu adıyla yazıyor: "yol içeren her yapılandırma
    // girdisi, dosya taşındığında güncellenmek zorunda — burada `**/env.ts`
    // gibi gevşek bir desen KULLANILMIYOR". Muaf olan
    // `packages/shared/src/server/env.ts`; başka bir konumdaki `env.ts` DEĞİL.
    const config = await eslint.calculateConfigForFile('packages/shared/src/env.ts');
    expect(config.rules[RULE_ID]).toEqual([2]);
  }, 30_000);
});
