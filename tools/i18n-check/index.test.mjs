/**
 * `i18n:check`in kendi testi — ÜÇ KATMAN, ve üçü AYRI İDDİA.
 *
 * ① **SAF FONKSİYONLAR** — çözümleme doğru mu (namespace, sabit çözümü,
 *    görünmez karakter, beyan okuma).
 * ② **NEGATİF TESTLER** — bilerek bozulmuş bir depoda araç GERÇEKTEN ötüyor
 *    mu, ve **çıkış kodu** sıfırdan farklı mı. Kabul kriteri 2'nin
 *    *"eksik anahtarları buluyor"* yarısı budur.
 * ③ **KABLOLAMA KANARYASI** — `ci.yml` bu kapıyı gerçekten koşturuyor mu ve
 *    adım **maskelenmemiş** mi. Kriterin *"CI'da kırıyor"* yarısı budur ve
 *    ①② onu **kanıtlamaz**: 5.5'in dersi, *"bir kapının VAR olması onun
 *    KOŞTUĞUNU göstermez"*.
 *
 * ⚠️ **BETİK KENDİ KOPYASINI DENETLEMEZ — 4.1'in dersi.** Negatif testler
 * gerçek depoya değil, `mkdtemp` ile kurulan **sahte bir depoya** bakıyor
 * (`arch-check`in kanarya deseni). Gerçek `locales/` üzerinde çalışsalardı
 * ya depoyu kirletirlerdi ya da birbirlerini görürlerdi.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  findInvisibleCharacters,
  findKeyUsages,
  findStringLiterals,
  flattenTranslations,
  FORBIDDEN_CODE_POINTS,
  parseDynamicPrefixes,
  runI18nCheck,
} from './index.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');

// ─────────────────────────────────────────────────────────────────────────────
// ① SAF FONKSİYONLAR
// ─────────────────────────────────────────────────────────────────────────────

describe('findInvisibleCharacters — ve TARAYICININ KENDİ ÖZ DENETİMİ', () => {
  it('ÖZ DENETİM: dokuz yasaklı kod noktasının DOKUZU da görülüyor', () => {
    // ⚠️ Bu testin var olma sebebi: hiçbir şeyle eşleşmeyen KÖR bir tarayıcı
    // her dosya için "0" der ve aşağıdaki bütün "temiz" iddiaları da geçer.
    // "0 bulundu" ile "hiçbir şey aramadı" ancak burada ayrılıyor.
    // Karakterler ASLA gömülü yazılmıyor — `String.fromCodePoint` ile üretiliyor.
    for (const [codePoint, label] of FORBIDDEN_CODE_POINTS) {
      const line = `a${String.fromCodePoint(codePoint)}b`;
      const found = findInvisibleCharacters(line);
      expect(found, label).toHaveLength(1);
      expect(found[0].label).toBe(label);
    }
    expect(FORBIDDEN_CODE_POINTS).toHaveLength(9);
  });

  it('temiz ASCII metinde hiçbir şey bulmuyor', () => {
    expect(findInvisibleCharacters('Bu satir tamamen temiz.\nIkinci satir.')).toEqual([]);
  });

  it('satır ve sütun bildiriliyor', () => {
    const text = `ilk\nikinci${String.fromCodePoint(0x00a0)}kelime`;
    const [hit] = findInvisibleCharacters(text);
    expect(hit.line).toBe(2);
    expect(hit.column).toBe(7);
  });

  it('EMOJİ ZWJ DİZİSİ MEŞRU — ve bu gerçek bir depo ölçümünden geliyor', () => {
    // `README.md`:11 → U+1F9D1 + U+200D + U+1F4BB. Körü körüne "ZWJ yasak"
    // diyen bir kural ilk koşuda ateşlenir; o gün cazip olan şey dosyayı
    // kapsam dışına almak, yani kapıyı yeşile boyamak olurdu.
    const emojiSequence =
      String.fromCodePoint(0x1f9d1) + String.fromCodePoint(0x200d) + String.fromCodePoint(0x1f4bb);
    expect(findInvisibleCharacters(`## ${emojiSequence} Baslik`)).toEqual([]);
  });

  it('KARŞI KONTROL: harfler arasındaki ZWJ meşru DEĞİL', () => {
    // Muafiyet emojiye özgü; her ZWJ'yi affeden bir kural bir kaçış deliğidir.
    expect(findInvisibleCharacters(`a${String.fromCodePoint(0x200d)}b`)).toHaveLength(1);
  });

  it('GERÇEK DEPO: README.md taranıyor ve emoji dizisi hata ÜRETMİYOR', () => {
    // Pozitif yön yukarıda; bu, muafiyetin gerçek dosyada da tuttuğunu iddia
    // ediyor — fixture'da geçip gerçek dosyada patlayan bir kural işe yaramaz.
    const readme = readFileSync(join(REPO_ROOT, 'README.md'), 'utf8');
    expect(readme).toContain(String.fromCodePoint(0x200d));
    expect(findInvisibleCharacters(readme)).toEqual([]);
  });
});

describe('flattenTranslations', () => {
  it('iç içe nesneyi ns:a.b.c biçimine düzleştiriyor', () => {
    const flat = flattenTranslations({ a: { b: { c: 'deger' } }, d: 'x' }, 'common');
    expect([...flat.keys()].sort()).toEqual(['common:a.b.c', 'common:d']);
    expect(flat.get('common:a.b.c')).toBe('deger');
  });
});

describe('findKeyUsages — namespace çözümü, ÜÇ bağlama biçimi de ölçüldü', () => {
  it("useTranslation('common') açık namespace bağlıyor", () => {
    const source = "const { t } = useTranslation('common');\nt('value.yes');";
    expect(findKeyUsages('a.tsx', source, 'common')).toEqual([
      { key: 'value.yes', namespaces: ['common'], line: 2 },
    ]);
  });

  it('useTranslation() argümansız → VARSAYILAN namespace', () => {
    const source = "const { t } = useTranslation();\nt('debugPanel.clear');";
    expect(findKeyUsages('a.tsx', source, 'common')[0].namespaces).toEqual(['common']);
  });

  it("withTranslation('errors') HOC'u da bağlıyor (sınıf bileşeni)", () => {
    const source = "t('boundary.retry');\nexport default withTranslation('errors')(C);";
    expect(findKeyUsages('a.tsx', source, 'common')[0].namespaces).toEqual(['errors']);
  });

  it('AÇIK ön ek dosyanın bağlamasını YENER', () => {
    const source = "const { t } = useTranslation('common');\nt('errors:boundary.retry');";
    expect(findKeyUsages('a.tsx', source, 'common')).toEqual([
      { key: 'boundary.retry', namespaces: ['errors'], line: 2 },
    ]);
  });

  it('MODÜL SABİTİ ÜZERİNDEN giden anahtarlar ÇÖZÜLÜYOR', () => {
    // 5.5 ölçtü ki AST *"bu dize düz metin mi?"* sorusuna cevap veremiyor.
    // Ama *"bu dize t()'ye ulaşıyor mu?"* BAŞKA bir soru ve cevabı VAR.
    const source = [
      "const TAB_LABEL_KEYS = { logs: 'debugPanel.tab.logs', save: 'debugPanel.tab.save' };",
      "const { t } = useTranslation('common');",
      'const label = t(TAB_LABEL_KEYS[tab]);',
    ].join('\n');
    expect(
      findKeyUsages('a.tsx', source, 'common')
        .map((u) => u.key)
        .sort(),
    ).toEqual(['debugPanel.tab.logs', 'debugPanel.tab.save']);
  });

  it('TİP konumundaki literaller sabit değeri sayılmıyor', () => {
    // `as const satisfies Readonly<Record<Exclude<TabId, 'logs'>, string>>`
    // içindeki `'logs'` bir TİP, bir anahtar değil.
    const source = [
      "const KEYS = { save: 'debugPanel.emptyTab.save' } as const satisfies Readonly<Record<Exclude<TabId, 'logs'>, string>>;",
      'const label = t(KEYS[tab]);',
    ].join('\n');
    expect(findKeyUsages('a.tsx', source, 'common').map((u) => u.key)).toEqual([
      'debugPanel.emptyTab.save',
    ]);
  });

  it('çözülemeyen bir argüman SESSİZCE atlanıyor, "eksik" diye BİLDİRİLMİYOR', () => {
    // `t(this.props.titleKey)` — kök bir tanımlayıcı değil. Çözülemeyen bir
    // şeyi "eksik" saymak yanlış alarm olurdu; o vakayı `typecheck` kapatıyor
    // (kapalı birleşim tipi `BoundaryTitleKey`).
    expect(findKeyUsages('a.tsx', 't(this.props.titleKey);', 'common')).toEqual([]);
  });
});

describe('findStringLiterals', () => {
  it('değer konumundaki literalleri topluyor, TİP konumundakileri atlıyor', () => {
    const source = "type K = 'tip.konumu';\nconst x: K = 'deger.konumu';";
    expect(findStringLiterals('a.ts', source)).toEqual(['deger.konumu']);
  });
});

describe('parseDynamicPrefixes — beyan TEK kaynaktan okunuyor', () => {
  it('dizi literalini okuyor', () => {
    const source = "export const DYNAMIC_KEY_PREFIXES = ['common:country.', 'errors:status.'];";
    expect(parseDynamicPrefixes(source)).toEqual(['common:country.', 'errors:status.']);
  });

  it('beyan YOKSA boş dönüyor (çağıran taraf bunu HATA sayıyor)', () => {
    expect(parseDynamicPrefixes('export const BASKA = 1;')).toEqual([]);
  });

  it('GERÇEK beyan dosyası okunabiliyor ve BOŞ DEĞİL', () => {
    // Beyan dosyası taşınır, yeniden adlandırılır ya da dizi başka bir adla
    // dışa aktarılırsa kapı sessizce "bütün dinamik aileler kullanılmıyor"
    // demeye başlardı. Bu testin işi ARACIN OKUYABİLDİĞİ.
    //
    // ⚠️ Beyanın İÇERİĞİ burada iddia EDİLMİYOR ve bu bilinçli: tam listeyi
    // hem burada hem `apps/web/src/app/i18n-dynamic-keys.test.ts`te sabitlemek
    // aynı iddianın iki kopyası olurdu ve iki kopya bir gün ayrışır. İçerik
    // beyanın kendi testinin işi (orada dört yönden iddia ediliyor); burada
    // yalnızca okunabilirlik ölçülüyor.
    const declaration = readFileSync(
      join(REPO_ROOT, 'apps/web/src/app/i18n-dynamic-keys.ts'),
      'utf8',
    );
    expect(parseDynamicPrefixes(declaration).length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ② NEGATİF TESTLER — sahte bir depo, ve GERÇEKTEN ötüyor mu
// ─────────────────────────────────────────────────────────────────────────────

describe('NEGATİF: bozulmuş bir depoda araç ötüyor mu', () => {
  let root;

  const write = (relPath, content) => {
    const abs = join(root, relPath);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content, 'utf8');
  };

  /** Sağlıklı bir taban depo — her test onu bozarak başlıyor. */
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'fms-i18n-check-'));
    write('apps/web/src/locales/tr/common.json', JSON.stringify({ value: { yes: 'evet' } }));
    write('apps/web/src/locales/tr/errors.json', JSON.stringify({ status: { 404: 'yok' } }));
    write(
      'apps/web/src/app/i18n-dynamic-keys.ts',
      "export const DYNAMIC_KEY_PREFIXES = ['errors:status.'] as const;\n",
    );
    write(
      'apps/web/src/App.tsx',
      "const { t } = useTranslation('common');\nexport const A = () => <p>{t('value.yes')}</p>;\n",
    );
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('TABAN: bozulmamış depo TEMİZ — karşı kontrol', () => {
    // Bu olmadan aşağıdaki hiçbir "kırıldı" iddiası bir şey kanıtlamaz:
    // her şeyi reddeden bozuk bir araç da hepsini geçerdi.
    expect(runI18nCheck(root).errors).toEqual([]);
  });

  /**
   * ⚠️ **İKİNCİ KAYNAK KÖKÜ — 6.4'te eklendi (6.0 ⑥'nın kararı).**
   *
   * Kök `packages/ui/src`. Boşluk 6.4'te ısırdı: tasarım sisteminin ilk `t()`
   * çağrıları oradan geliyor ve kök taranmasaydı kapı **iki yönde birden**
   * yalan söylerdi — oradaki bir anahtar hatası *"eksik"* olarak **bulunmaz**,
   * ve `common.json`daki karşılıkları *"kullanılmayan"* diye **yanlışlıkla**
   * bildirilirdi. İkinci vaka bu testin konusu, çünkü sessiz olan o.
   */
  it('İKİNCİ KÖK: `packages/ui/src` taranıyor — anahtar "kullanılmayan" DEĞİL', () => {
    write('apps/web/src/locales/tr/common.json', JSON.stringify({ ui: { x: { y: 'z' } } }));
    // `apps/web` bu anahtarı HİÇ kullanmıyor…
    write('apps/web/src/App.tsx', 'export const A = () => <p>sabit</p>;\n');
    // …ama `packages/ui` kullanıyor. Kök taranmazsa "kullanılmayan" ötürdü.
    write(
      'packages/ui/src/x.tsx',
      "const KEYS = { y: 'common:ui.x.y' } as const;\n" +
        'export const X = () => <p>{t(KEYS.y)}</p>;\n',
    );

    const { errors, counts } = runI18nCheck(root);
    expect(errors.filter((e) => e.check === 'unused')).toEqual([]);
    expect(counts.sourceRoots).toBe(2);
  });

  it('İKİNCİ KÖK YOKSA sessizce atlanmıyor — not düşülüyor', () => {
    // Sahte depo `packages/ui/src` taşımıyor. Sessiz bir muafiyet kapsamı
    // yutar (D3); atlanan kök `notes`ta görünür ve sayaç 2 değil 1 diyor.
    const { notes, counts } = runI18nCheck(root);
    expect(counts.sourceRoots).toBe(1);
    expect(notes.some((n) => n.includes('packages/ui/src'))).toBe(true);
  });

  it('EKSİK ANAHTAR: kaynaktan bir anahtar silinince ötüyor', () => {
    write('apps/web/src/locales/tr/common.json', JSON.stringify({ value: { no: 'hayir' } }));
    const { errors } = runI18nCheck(root);
    expect(errors.map((e) => e.check)).toContain('missing');
    expect(errors.find((e) => e.check === 'missing').message).toContain('value.yes');
  });

  it('BOŞ ÇEVİRİ: değeri boş bir anahtar ötüyor', () => {
    write('apps/web/src/locales/tr/common.json', JSON.stringify({ value: { yes: '   ' } }));
    const { errors } = runI18nCheck(root);
    expect(errors.map((e) => e.check)).toContain('empty');
  });

  it('KULLANILMAYAN ANAHTAR: yetim bir anahtar ötüyor', () => {
    write(
      'apps/web/src/locales/tr/common.json',
      JSON.stringify({ value: { yes: 'evet' }, yetim: 'kimse beni cagirmiyor' }),
    );
    const { errors } = runI18nCheck(root);
    expect(errors.map((e) => e.check)).toContain('unused');
    expect(errors.find((e) => e.check === 'unused').message).toContain('common:yetim');
  });

  it('BEYAN BOŞALIRSA kapı ötüyor — sessizce körelmiyor', () => {
    // Boş bir beyan bütün dinamik aileleri "kullanılıyor" saymaz, TERSİNE
    // hepsini "kullanılmayan" yapar; ama asıl risk beyanın okunamaması ve
    // bunun fark edilmemesi. Ayrı bir hata sınıfı olarak bildiriliyor.
    write('apps/web/src/app/i18n-dynamic-keys.ts', 'export const BASKA = 1;\n');
    const { errors } = runI18nCheck(root);
    expect(errors.map((e) => e.check)).toContain('declaration');
  });

  it('DİNAMİK AİLE beyan edilince "kullanılmayan" SUSUYOR', () => {
    // `errors:status.404` hiçbir yerde literal geçmiyor ama beyanlı.
    expect(runI18nCheck(root).errors.filter((e) => e.check === 'unused')).toEqual([]);
    // Beyan kaldırılınca ötmeli — muafiyetin GERÇEKTEN çalıştığının kanıtı.
    write('apps/web/src/app/i18n-dynamic-keys.ts', "export const DYNAMIC_KEY_PREFIXES = ['x:y.'];");
    expect(
      runI18nCheck(root)
        .errors.filter((e) => e.check === 'unused')
        .map((e) => e.message),
    ).toContain("Kullanılmayan anahtar: 'errors:status.404'");
  });

  it('GÖRÜNMEZ KARAKTER: kaynak kodda hata, ÇEVİRİ metninde yalnızca not', () => {
    const nbsp = String.fromCodePoint(0x00a0);
    write('apps/web/src/kirli.ts', `export const x = 'a${nbsp}b';\n`);
    write(
      'apps/web/src/locales/tr/common.json',
      JSON.stringify({ value: { yes: `1${nbsp}mn evet` } }),
    );

    const { errors, notes } = runI18nCheck(root);
    // Kaynak kod → KIRIYOR
    expect(errors.map((e) => e.check)).toContain('invisible');
    expect(errors.find((e) => e.check === 'invisible').message).toContain('kirli.ts');
    // `locales/**` → RAPOR EDİYOR, KIRMIYOR (ROADMAP'in şartı: bir çeviri
    // metni bölünmez boşluğu MEŞRU olarak isteyebilir — sayı + birim).
    expect(errors.some((e) => e.message.includes('locales/'))).toBe(false);
    expect(notes.some((n) => n.includes('locales/'))).toBe(true);
  });

  it('CLI ALT SÜREÇ OLARAK sıfırdan farklı çıkış kodu veriyor', () => {
    // Birim testi kablolamayı kanıtlamaz (2.3b). `pnpm i18n:check` bir KAPI;
    // kapı olması çıkış koduna bağlı ve o ancak süreç koşturularak ölçülür.
    write('apps/web/src/locales/tr/common.json', JSON.stringify({ value: { no: 'hayir' } }));

    let exitCode = 0;
    try {
      execFileSync(process.execPath, [join(REPO_ROOT, 'tools/i18n-check/index.mjs'), root], {
        stdio: 'pipe',
      });
    } catch (error) {
      exitCode = error.status;
    }
    expect(exitCode).toBe(1);
  });

  it('KARŞI KONTROL: sağlam depoda CLI SIFIR dönüyor', () => {
    // Tek yön yeterli olmazdı: her zaman 1 dönen bozuk bir CLI de geçerdi.
    const out = execFileSync(
      process.execPath,
      [join(REPO_ROOT, 'tools/i18n-check/index.mjs'), root],
      { stdio: 'pipe', encoding: 'utf8' },
    );
    expect(out).toContain('temiz');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ③ KABLOLAMA KANARYASI — CI bu kapıyı gerçekten koşturuyor mu
// ─────────────────────────────────────────────────────────────────────────────

describe("KANARYA: kapılar CI'da GERÇEKTEN koşuyor mu", () => {
  const workflow = readFileSync(join(REPO_ROOT, '.github/workflows/ci.yml'), 'utf8');
  const packageJson = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8'));

  /** Bir komutu koşturan adımın satırı; maskeleme kontrolü için komşuları da. */
  const stepFor = (command) => {
    const lines = workflow.split('\n');
    const index = lines.findIndex((line) => line.includes(`run: ${command}`));
    return { index, lines };
  };

  for (const command of ['pnpm i18n:check', 'pnpm gaps:check']) {
    it(`'${command}' ci.yml'de bir adım olarak VAR`, () => {
      expect(stepFor(command).index).toBeGreaterThan(-1);
    });

    it(`'${command}' adımı MASKELENMEMİŞ (continue-on-error / if / || true yok)`, () => {
      // ⚠️ Bir adımın var olması yetmez: `continue-on-error: true` onu bir
      // temenniye çevirir ve iş yine yeşil kalır. Kabul kriteri "CI'da
      // KIRIYOR" diyor — maskelenmiş bir adım o cümleyi karşılamaz.
      const { index, lines } = stepFor(command);
      expect(index).toBeGreaterThan(-1);
      // Adımın bloğu: bir önceki `- name:` satırından bu satıra kadar.
      let start = index;
      while (start > 0 && !lines[start].trimStart().startsWith('- name:')) start -= 1;
      const block = lines.slice(start, index + 1).join('\n');
      expect(block).not.toContain('continue-on-error');
      expect(block).not.toMatch(/^\s+if:/m);
      expect(lines[index]).not.toContain('|| true');
      expect(lines[index]).not.toContain('|| :');
    });
  }

  it("'i18n:check' betiği package.json'da tanımlı", () => {
    // Adım `pnpm i18n:check` çağırıyor; betik yoksa adım "command not found"
    // ile kırılırdı — ama kırılma sebebi kapı değil yazım hatası olurdu.
    expect(packageJson.scripts['i18n:check']).toBe('node tools/i18n-check/index.mjs');
  });

  it('GERÇEK DEPO bugün TEMİZ — kapı yeşil açılıyor', () => {
    const { errors } = runI18nCheck(REPO_ROOT);
    expect(errors).toEqual([]);
  });

  it('GERÇEK DEPO taraması BOŞ DEĞİL — kapı bakacak bir şey buluyor', () => {
    // SAPMA-024: bakacak bir şey bulamayan kapı bir onay değildir.
    // "Temiz" iddiası ancak sayılar sıfırdan büyükse bir şey söyler.
    const { counts } = runI18nCheck(REPO_ROOT);
    expect(counts.definedKeys).toBeGreaterThan(0);
    expect(counts.usedKeys).toBeGreaterThan(0);
    expect(counts.sourceFiles).toBeGreaterThan(0);
    expect(counts.scannedForInvisible).toBeGreaterThan(100);
  });
});
