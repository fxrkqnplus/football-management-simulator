/**
 * `no-bare-jsx-text` kuralının testi — İKİ KATMAN, ve ikisi AYRI İDDİA.
 *
 * ① **`RuleTester`** — kuralın MANTIĞI doğru mu. İzole çalışır: kendi
 *    yapılandırmasını kurar, deponun `eslint.config.js`ine hiç bakmaz.
 * ② **KANARYA** — `pnpm lint` bu kuralı GERÇEKTEN koşturuyor mu. Bambaşka bir
 *    iddia ve `RuleTester` onu **kanıtlayamaz**.
 *
 * ⚠️ **NEDEN İKİNCİSİ ŞART.** Bir kural yazılıp `eslint.config.js`e
 * bağlanmazsa `pnpm lint` **0 der ve hiçbir şeye bakmamıştır** (D3). Aynı
 * körlük bu depoda ölçülerek yaşandı: 2.3b'de `arch:check`in `import-casing`
 * kuralının kablolaması koparıldığında **43 test birden geçti**, çünkü hepsi
 * saf fonksiyonu doğrudan çağırıyordu. *"Bir kapının VAR olması, onun
 * KOŞTUĞUNU göstermez."*
 *
 * ⚠️ **KANARYA GERÇEK DEPODA YAŞIYOR.** Sahte bir yapılandırma kurmuyoruz:
 * ESLint Node API'si deponun **kendi `eslint.config.js`ini** çözüyor ve
 * **gerçek bir kaynak dosyanın kimliği** altında lint ediyor. Böylece
 * kanarya şunların hepsine birden bağlı: kuralın `index.js`te kayıtlı olması ·
 * `eslint.config.js`te `error` seviyesinde açık olması · yolun `ignores`
 * bloklarına takılmaması · muafiyet bloğunun bu yolu kapsamaması.
 *
 * ⚠️ **DİSKE HİÇBİR ŞEY YAZILMIYOR — bu bir ÖLÇÜMÜN sonucu.** İlk tasarım
 * `apps/web/src/` altına geçici bir dosya yazıyordu; üç sorun ölçüldü:
 *   • `lintText` var **olmayan** bir yol için `projectService` ayrıştırma
 *     hatası veriyor (ölçüldü) — yani sanal yol işe yaramıyor,
 *   • diske yazılan bir `*.test.tsx` vitest'in `web` projesinin glob'una
 *     (`src/**` + `.test.tsx`) takılabilir — koşu ortasında dosya yaratmak
 *     bir yarış,
 *   • aynı dosya `coverage.include` deseniyle de eşleşiyor ve paydayı
 *     rastgele oynatabilir.
 * Çözüm: **var olan gerçek bir dosyanın kimliği** altında lint etmek. Yol
 * gerçek (yapılandırma ondan çözülüyor), içerik bizim. Ölçüldü: bu yolla
 * bugünkü `local/no-hardcoded-path` kuralı da gerçekten ötüyor — yani
 * mekanizmanın kendisi bu kuraldan bağımsız olarak doğrulandı.
 */
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ESLint, RuleTester } from 'eslint';
import { beforeAll, describe, expect, it } from 'vitest';

import rule, { looksLikeProse, USER_FACING_ATTRIBUTES } from './no-bare-jsx-text.js';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

ruleTester.run('no-bare-jsx-text', rule, {
  valid: [
    // ── t() üzerinden gelen metin — kuralın ZORUNLU KILDIĞI biçim ──────────
    '<p>{t("errors:boundary.body")}</p>;',
    '<section title={t("errors:boundary.title")} />;',
    '<p>{ok ? t("common:done") : t("common:failed")}</p>;',

    // ── AŞAĞIDAKİ YEDİ VAKA `tools/i18n-inventory`DEN DEVRALINDI ──────────
    // Araç 5.5'te emekli edildi; sabitlediği NEGATİF anlamlar burada devam
    // ediyor. Emeklilik kanıtlanmış bir güvenceyi sessizce düşürmemeli.

    // Yorum ihlal değil — K5 arayüz metnini korur, yorumu değil.
    '// Bu bir Türkçe yorum satırı ve ihlal değildir.\n<div />;',
    '/* Blok yorum: kullanıcı bunu görmez. */\n<div />;',

    // logger mesajı ihlal değil — geliştirici içindir (K8).
    'logger.info({ x: 1 }, "İstek hatayla sonuçlandı");',

    // AppError.message ihlal değil — SAPMA-010: çevrilmez.
    'throw new ValidationError({ code: "a.b", message: "Gönderilen bilgi geçersiz" });',

    // Teknik nitelikler ihlal değil.
    '<div data-testid="error-boundary-kok" role="alert" className="hata-kutusu" />;',

    // JSX DIŞINDAKİ dize ihlal değil.
    'const SABIT = "Bu bir sabit, arayüzde görünmüyor";\n<div>{SABIT.length}</div>;',

    // Sayı, noktalama ve CSS değeri metin değildir.
    '<p>{"16"}{"—"}{"1.6"}<span>·</span></p>;',

    // ── ARAÇTAN BİLİNÇLİ SAPMA — nitelik konumunda NİTELİK politikası ─────
    // Araç bunu ihlal sayardı (ifade kabına baktığı için), oysa `data-testid="x"`
    // ile aynı şey. Aynı şeyin iki yazımı iki farklı cevap almamalı.
    '<div data-testid={"error-boundary-kok"} />;',
    '<div className={ok ? "acik" : "kapali"} />;',

    // Boş ifade kabı (yalnızca yorum içeren) çökmemeli.
    '<div>{/* açıklama */}</div>;',

    // Dinamik şablon sabit değildir.
    '<p>{`${count} oyuncu`}</p>;',

    // JSX metni yalnızca boşluk/satır sonu ise ihlal değil.
    '<div>\n  <span>{t("common:ok")}</span>\n</div>;',
  ],

  invalid: [
    {
      // 5.4'ün var oluş sebebi: hiçbir Türkçe karakter taşımıyor, yani kaba
      // tarama bunu KAÇIRIYOR. Kural dile bakmadığı için yakalıyor.
      code: '<button type="button">Tekrar dene</button>;',
      errors: [{ messageId: 'bareJsxText', data: { value: 'Tekrar dene' } }],
    },
    {
      // İngilizce teknik etiket de ihlal — kullanıcı onu ekranda görüyor.
      code: '<span>api prefix</span>;',
      errors: [{ messageId: 'bareJsxText' }],
    },
    {
      code: '<section title="Bu ekran yüklenemedi" />;',
      errors: [
        {
          messageId: 'bareJsxAttribute',
          data: { attribute: 'title', value: 'Bu ekran yüklenemedi' },
        },
      ],
    },
    {
      code: '<img alt="Kulüp arması" src={logo} />;',
      errors: [
        { messageId: 'bareJsxAttribute', data: { attribute: 'alt', value: 'Kulüp arması' } },
      ],
    },
    {
      // Tireli nitelik adı tek bir JSXIdentifier olarak ayrıştırılıyor.
      code: '<button aria-label="Paneli kapat" />;',
      errors: [
        {
          messageId: 'bareJsxAttribute',
          data: { attribute: 'aria-label', value: 'Paneli kapat' },
        },
      ],
    },
    {
      // Koşullu ifadenin İKİ dalı da ayrı ayrı bildiriliyor.
      code: "<p>{ok ? 'Bitti' : 'Hata oldu'}</p>;",
      errors: [{ messageId: 'bareJsxExpression' }, { messageId: 'bareJsxExpression' }],
    },
    {
      // ESTree'de `&&` LogicalExpression — TS ayrıştırıcısında BinaryExpression'dı.
      // İkisi de ele alınmasaydı bu sessizce kaçardı.
      code: "<p>{hata && 'Bir şeyler ters gitti'}</p>;",
      errors: [{ messageId: 'bareJsxExpression' }],
    },
    {
      // Şablon literali de sabittir — emsal `no-hardcoded-path`.
      code: '<p>{`Bu bölüm yüklenemedi`}</p>;',
      errors: [{ messageId: 'bareJsxExpression' }],
    },
    {
      // Kullanıcıya görünen nitelikteki ifade kabı — nitelik politikası
      // geçerli olduğu için BURADA ötüyor (yukarıdaki data-testid'in tersi).
      code: "<section title={ok ? 'Hazır' : 'Yükleniyor'} />;",
      errors: [
        { messageId: 'bareJsxAttribute', data: { attribute: 'title', value: 'Hazır' } },
        { messageId: 'bareJsxAttribute', data: { attribute: 'title', value: 'Yükleniyor' } },
      ],
    },
    {
      code: '<>Doğrudan parça içindeki metin</>;',
      errors: [{ messageId: 'bareJsxText' }],
    },
  ],
});

describe('yardımcılar', () => {
  it('looksLikeProse en az İKİ harf istiyor', () => {
    expect(looksLikeProse('Tekrar dene')).toBe(true);
    expect(looksLikeProse('ok')).toBe(true);
    expect(looksLikeProse('16')).toBe(false);
    expect(looksLikeProse('—')).toBe(false);
    expect(looksLikeProse('a')).toBe(false);
  });

  it('kullanıcıya görünen nitelik listesi BOŞALMADI', () => {
    // Liste boşalırsa kural ② sınıfını sessizce hiç denetlemez ve
    // `RuleTester`ın geri kalanı yine geçer.
    expect(USER_FACING_ATTRIBUTES).toEqual(['title', 'aria-label', 'placeholder', 'alt', 'label']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// KANARYA — `pnpm lint` bu kuralı gerçekten koşturuyor mu?
// ─────────────────────────────────────────────────────────────────────────────

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const RULE_ID = 'local/no-bare-jsx-text';

/** Kanaryanın kimliğe büründüğü GERÇEK dosyalar. Var olmaları şart. */
const SOURCE_IDENTITY = 'apps/web/src/App.tsx';
const TEST_IDENTITY = 'apps/web/src/App.test.tsx';

/** Kesin bir ihlal: üç sınıfın üçü birden. */
const CANARY_CODE =
  'export const Kanarya = () => (\n' +
  '  <section title="Kanarya başlığı">\n' +
  '    Kanarya metni\n' +
  "    {ok ? 'Evet' : 'Hayır'}\n" +
  '  </section>\n' +
  ');\n';

describe('KANARYA: kural gerçek depoda KABLOLU mu', () => {
  /** @type {InstanceType<typeof ESLint>} */
  let eslint;

  beforeAll(() => {
    eslint = new ESLint({ cwd: REPO_ROOT });
  });

  it('kanaryanın büründüğü iki kimlik de gerçekten diskte var', () => {
    // Ölçüldü: `projectService` var olmayan bir yol için ayrıştırma hatası
    // veriyor. Bu dosyalar taşınır/silinirse kanarya yanıltıcı bir
    // "ayrıştırma hatası" ile kırılır; sebebi burada adıyla söyleniyor.
    expect(existsSync(resolve(REPO_ROOT, SOURCE_IDENTITY))).toBe(true);
    expect(existsSync(resolve(REPO_ROOT, TEST_IDENTITY))).toBe(true);
  });

  it('GERÇEK yapılandırma bu kuralı ÜRÜN dosyasında `error` olarak açıyor', async () => {
    const config = await eslint.calculateConfigForFile(SOURCE_IDENTITY);
    // Kural sökülürse `undefined`, `warn`a çekilirse [1], `off` yapılırsa [0].
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
    expect(ours.length).toBeGreaterThanOrEqual(3);
    expect(ours.every((m) => m.severity === 2)).toBe(true);
    expect(ours.map((m) => m.messageId).sort()).toEqual(
      ['bareJsxAttribute', 'bareJsxExpression', 'bareJsxExpression', 'bareJsxText'].sort(),
    );
  }, 30_000);

  it('MUAFİYET KANARYASI: aynı ihlal bir BİRİM TESTİNDE ötmüyor', async () => {
    // Emsal `no-hardcoded-path` (`eslint.config.js`): testler metni VERİ
    // olarak kullanır. Muafiyet SESSİZ bırakılmıyor — ayrı bir vaka olarak
    // iddia ediliyor, çünkü "kısmi koruma D3 yanılsaması üretir": muafiyet
    // bir gün `**/*.tsx`e genişlerse bu test kırılmaz ama yukarıdaki kırılır,
    // muafiyet tamamen kalkarsa bu test kırılır. İki yön de nöbette.
    const results = await eslint.lintText(CANARY_CODE, {
      filePath: TEST_IDENTITY,
      warnIgnored: false,
    });

    expect(results).toHaveLength(1);
    expect(results[0].messages.filter((m) => m.ruleId === RULE_ID)).toEqual([]);

    const config = await eslint.calculateConfigForFile(TEST_IDENTITY);
    expect(config.rules[RULE_ID]).toEqual([0]);
  }, 30_000);

  it('MUAFİYET DAR: `*.spec.tsx` muaf DEĞİL (Faz 17 uçtan uca gerçek arayüzü sürer)', async () => {
    // Yalnızca yapılandırma çözümlemesi — dosya diskte yok ve gerekmiyor
    // (ölçüldü: `calculateConfigForFile` varlık aramıyor, `lintText` arıyor).
    const config = await eslint.calculateConfigForFile('apps/web/src/giris.spec.tsx');
    expect(config.rules[RULE_ID]).toEqual([2]);
  }, 30_000);
});
