/**
 * Türkçe ek motorunun testi — ve ROADMAP Faz 5 kabul kriteri 3'ün İDDİASI.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * `SUFFIX_CASES` BİR SAYI DEĞİL BİR LİSTE (4.5'in `VISIBLE_ATTRIBUTES` emsali)
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Kriter *"50 test vakasının tamamını geçiyor"* diyor. O "50" burada bir
 * yorumda değil, **koşan bir iddiada** yaşıyor: `SUFFIX_CASES.length >= 50`.
 *
 * ⚠️ AMA UZUNLUK TEK BAŞINA KÖR BİR KONTROLDÜR: 55 tane `Roma` yazılsa da
 * geçerdi. Bu yüzden **kapsam ayrıca ve tam olarak** iddia ediliyor —
 * dört ünlü uyumu sınıfının dördü de, iki bitiş türünün ikisi de, sekiz
 * bileşimin sekizi de temsil ediliyor ve **dağılım tek tek sabitleniyor**.
 * Bir satır eklemek dağılım testini kırar; sessizce büyümez.
 * (4.9'un dağılım nöbetçileriyle aynı desen.)
 *
 * ⚠️ ETİKETLER KENDİ KENDİNİ DOĞRULUYOR. Bir vakanın `harmony`/`ending`
 * etiketi yanlış yazılırsa kapsam iddiaları **yalan söyler** ve motor testi
 * bunu göremez. Bu yüzden ayrı bir çapraz kontrol var: `expected`, etiketin
 * gerektirdiği ekle bitmek ZORUNDA. Etiket ile beklenen çıktı ayrışırsa test
 * kırılır.
 *
 * ⚠️ `expected` ELLE YAZILDI ve motordan türetilmedi — türetilseydi test
 * kendi kendini doğrulardı.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * VAKALARIN KAYNAĞI — dürüstçe
 * ────────────────────────────────────────────────────────────────────────────
 *
 * ROADMAP'in 5.1 maddesi *"kaynak ünlü uyumu kuralları + 17 gerçek seed adı"*
 * diyordu ve o madde **bayattı** (5.1'de düzeltildi): `world-seed-data.ts`
 * görünen ad **tutmuyor**, `nameKey` tutuyor (`'country.tur'`, `'Türkiye'`
 * değil). Yani gerçek adlar `locales/tr/` yazıldığında (5.3) doğacak.
 *
 * Buradaki adlar **dilbilgisi kurallarından türetildi ve kapsam için seçildi**
 * — "gerçek veriden alındı" DEĞİL. Beşi kriterin kendi örnekleri.
 * **17 seed anahtarıyla çapraz doğrulama 5.3'ün işi.**
 */
import { describe, expect, it } from 'vitest';

import { ValidationError } from '../errors.js';
import {
  type EndingKind,
  GRAMMATICAL_CASES,
  PRONUNCIATION_OVERRIDES,
  resolveEnding,
  suffixFor,
  VOWEL_HARMONY_CLASSES,
  type VowelHarmonyClass,
  withSuffix,
} from './turkish-suffix.js';

type CaseTag = 'criterion' | 'foreign' | 'abbreviation' | 'override' | 'casing' | 'multiWord';

interface SuffixCase {
  readonly name: string;
  /** Tam biçim, ELLE yazıldı. */
  readonly expected: string;
  readonly harmony: VowelHarmonyClass;
  readonly ending: EndingKind;
  readonly tags?: readonly CaseTag[];
}

/**
 * Kriter 3'ün vaka listesi. **Bu liste kriterin kendisidir.**
 *
 * Kriterin beş örneği `criterion` etiketiyle işaretli ve hepsi burada:
 * Galatasaray'ın · Beşiktaş'ın · Trabzonspor'un · Roma'nın · Liverpool'un.
 *
 * ⚠️ Kriterin beş örneği kuralın TAMAMI DEĞİL (F3): beşi yalnızca iki ünlü
 * sınıfını (kalın düz, kalın yuvarlak) temsil ediyor. İnce düz (`e`, `i`) ve
 * ince yuvarlak (`ö`, `ü`) örneklerde HİÇ YOK ve bu liste onları kapatıyor.
 */
export const SUFFIX_CASES: readonly SuffixCase[] = [
  // ── kalın düz (a, ı) · ünsüzle bitiyor → 'ın ──────────────────────────────
  {
    name: 'Galatasaray',
    expected: "Galatasaray'ın",
    harmony: 'backUnrounded',
    ending: 'afterConsonant',
    tags: ['criterion'],
  },
  {
    name: 'Beşiktaş',
    expected: "Beşiktaş'ın",
    harmony: 'backUnrounded',
    ending: 'afterConsonant',
    tags: ['criterion'],
  },
  {
    name: 'Diyarbakır',
    expected: "Diyarbakır'ın",
    harmony: 'backUnrounded',
    ending: 'afterConsonant',
  },
  { name: 'Kars', expected: "Kars'ın", harmony: 'backUnrounded', ending: 'afterConsonant' },
  { name: 'Van', expected: "Van'ın", harmony: 'backUnrounded', ending: 'afterConsonant' },
  { name: 'Uşak', expected: "Uşak'ın", harmony: 'backUnrounded', ending: 'afterConsonant' },
  { name: 'Aydın', expected: "Aydın'ın", harmony: 'backUnrounded', ending: 'afterConsonant' },
  { name: 'Batman', expected: "Batman'ın", harmony: 'backUnrounded', ending: 'afterConsonant' },
  // Sözcük gibi okunan kısaltma ("var") — yazımda ünlü VAR, tablo gerekmiyor.
  {
    name: 'VAR',
    expected: "VAR'ın",
    harmony: 'backUnrounded',
    ending: 'afterConsonant',
    tags: ['abbreviation'],
  },
  // ⚠️ HARF TUZAĞI: naive toLowerCase() bunu "iğdir" yapar ve ek 'in olur.
  {
    name: 'IĞDIR',
    expected: "IĞDIR'ın",
    harmony: 'backUnrounded',
    ending: 'afterConsonant',
    tags: ['casing'],
  },

  // ── kalın düz (a, ı) · ünlüyle bitiyor → 'nın ─────────────────────────────
  {
    name: 'Roma',
    expected: "Roma'nın",
    harmony: 'backUnrounded',
    ending: 'afterVowel',
    tags: ['criterion', 'foreign'],
  },
  { name: 'Adana', expected: "Adana'nın", harmony: 'backUnrounded', ending: 'afterVowel' },
  { name: 'Manisa', expected: "Manisa'nın", harmony: 'backUnrounded', ending: 'afterVowel' },
  { name: 'Ankara', expected: "Ankara'nın", harmony: 'backUnrounded', ending: 'afterVowel' },
  { name: 'Bursa', expected: "Bursa'nın", harmony: 'backUnrounded', ending: 'afterVowel' },
  { name: 'Ağrı', expected: "Ağrı'nın", harmony: 'backUnrounded', ending: 'afterVowel' },
  { name: 'Sakarya', expected: "Sakarya'nın", harmony: 'backUnrounded', ending: 'afterVowel' },
  { name: 'Malatya', expected: "Malatya'nın", harmony: 'backUnrounded', ending: 'afterVowel' },
  {
    name: 'UEFA',
    expected: "UEFA'nın",
    harmony: 'backUnrounded',
    ending: 'afterVowel',
    tags: ['abbreviation'],
  },
  {
    name: 'FIFA',
    expected: "FIFA'nın",
    harmony: 'backUnrounded',
    ending: 'afterVowel',
    tags: ['abbreviation'],
  },

  // ── ince düz (e, i) · ünsüzle bitiyor → 'in ───────────────────────────────
  {
    name: 'Başakşehir',
    expected: "Başakşehir'in",
    harmony: 'frontUnrounded',
    ending: 'afterConsonant',
  },
  { name: 'İzmir', expected: "İzmir'in", harmony: 'frontUnrounded', ending: 'afterConsonant' },
  {
    name: 'Eskişehir',
    expected: "Eskişehir'in",
    harmony: 'frontUnrounded',
    ending: 'afterConsonant',
  },
  {
    name: 'Kırşehir',
    expected: "Kırşehir'in",
    harmony: 'frontUnrounded',
    ending: 'afterConsonant',
  },
  {
    name: 'Gaziantep',
    expected: "Gaziantep'in",
    harmony: 'frontUnrounded',
    ending: 'afterConsonant',
  },
  {
    name: 'Bayern',
    expected: "Bayern'in",
    harmony: 'frontUnrounded',
    ending: 'afterConsonant',
    tags: ['foreign'],
  },
  {
    name: 'Real Madrid',
    expected: "Real Madrid'in",
    harmony: 'frontUnrounded',
    ending: 'afterConsonant',
    tags: ['foreign', 'multiWord'],
  },

  // ── ince düz (e, i) · ünlüyle bitiyor → 'nin ──────────────────────────────
  {
    name: 'Fenerbahçe',
    expected: "Fenerbahçe'nin",
    harmony: 'frontUnrounded',
    ending: 'afterVowel',
  },
  { name: 'Göztepe', expected: "Göztepe'nin", harmony: 'frontUnrounded', ending: 'afterVowel' },
  { name: 'Edirne', expected: "Edirne'nin", harmony: 'frontUnrounded', ending: 'afterVowel' },
  { name: 'Denizli', expected: "Denizli'nin", harmony: 'frontUnrounded', ending: 'afterVowel' },
  { name: 'Kayseri', expected: "Kayseri'nin", harmony: 'frontUnrounded', ending: 'afterVowel' },
  { name: 'Çanakkale', expected: "Çanakkale'nin", harmony: 'frontUnrounded', ending: 'afterVowel' },
  // ⚠️ Yazım "a" ile bitiyor; kural 'ın derdi. Okunuş ("çelsi") tablodan geliyor.
  {
    name: 'Chelsea',
    expected: "Chelsea'nin",
    harmony: 'frontUnrounded',
    ending: 'afterVowel',
    tags: ['foreign', 'override'],
  },
  {
    name: 'TFF',
    expected: "TFF'nin",
    harmony: 'frontUnrounded',
    ending: 'afterVowel',
    tags: ['abbreviation', 'override'],
  },
  {
    name: 'PSG',
    expected: "PSG'nin",
    harmony: 'frontUnrounded',
    ending: 'afterVowel',
    tags: ['abbreviation', 'override', 'foreign'],
  },

  // ── kalın yuvarlak (o, u) · ünsüzle bitiyor → 'un ─────────────────────────
  {
    name: 'Trabzonspor',
    expected: "Trabzonspor'un",
    harmony: 'backRounded',
    ending: 'afterConsonant',
    tags: ['criterion'],
  },
  {
    name: 'Liverpool',
    expected: "Liverpool'un",
    harmony: 'backRounded',
    ending: 'afterConsonant',
    tags: ['criterion', 'foreign'],
  },
  { name: 'Bodrum', expected: "Bodrum'un", harmony: 'backRounded', ending: 'afterConsonant' },
  {
    name: 'Samsunspor',
    expected: "Samsunspor'un",
    harmony: 'backRounded',
    ending: 'afterConsonant',
  },
  { name: 'Konyaspor', expected: "Konyaspor'un", harmony: 'backRounded', ending: 'afterConsonant' },
  { name: 'Sivasspor', expected: "Sivasspor'un", harmony: 'backRounded', ending: 'afterConsonant' },
  { name: 'Erzurum', expected: "Erzurum'un", harmony: 'backRounded', ending: 'afterConsonant' },
  { name: 'Çorum', expected: "Çorum'un", harmony: 'backRounded', ending: 'afterConsonant' },

  // ── kalın yuvarlak (o, u) · ünlüyle bitiyor → 'nun ────────────────────────
  { name: 'Bolu', expected: "Bolu'nun", harmony: 'backRounded', ending: 'afterVowel' },
  {
    name: 'Porto',
    expected: "Porto'nun",
    harmony: 'backRounded',
    ending: 'afterVowel',
    tags: ['foreign'],
  },
  {
    name: 'Oslo',
    expected: "Oslo'nun",
    harmony: 'backRounded',
    ending: 'afterVowel',
    tags: ['foreign'],
  },
  {
    name: 'Monako',
    expected: "Monako'nun",
    harmony: 'backRounded',
    ending: 'afterVowel',
    tags: ['foreign'],
  },
  {
    name: 'Tokyo',
    expected: "Tokyo'nun",
    harmony: 'backRounded',
    ending: 'afterVowel',
    tags: ['foreign'],
  },

  // ── ince yuvarlak (ö, ü) · ünsüzle bitiyor → 'ün ──────────────────────────
  {
    name: 'Karagümrük',
    expected: "Karagümrük'ün",
    harmony: 'frontRounded',
    ending: 'afterConsonant',
  },
  { name: 'Gölcük', expected: "Gölcük'ün", harmony: 'frontRounded', ending: 'afterConsonant' },
  { name: 'Bingöl', expected: "Bingöl'ün", harmony: 'frontRounded', ending: 'afterConsonant' },
  { name: 'Kadıköy', expected: "Kadıköy'ün", harmony: 'frontRounded', ending: 'afterConsonant' },
  { name: 'Söğüt', expected: "Söğüt'ün", harmony: 'frontRounded', ending: 'afterConsonant' },

  // ── ince yuvarlak (ö, ü) · ünlüyle bitiyor → 'nün ─────────────────────────
  // ⚠️ Bu bileşimde TEK vaka var ve bu bir kapsam boşluğu DEĞİL, Türkçenin bir
  // olgusu: ö/ü ünlüsüyle BİTEN özel ad çok nadir. Sayı dürüstçe raporlanıyor.
  {
    name: 'Malmö',
    expected: "Malmö'nün",
    harmony: 'frontRounded',
    ending: 'afterVowel',
    tags: ['foreign'],
  },
];

/**
 * ETİKET ÇAPRAZ KONTROLÜNÜN ORACLE'I — motordan BAĞIMSIZ, elle yazıldı.
 *
 * Bu, ek tablosunun ikinci bir kopyası ve bu **kasıtlı**: motorun tablosu
 * sınanan şey, bu tablo sınayan şey. Aynı dosyadan türetilselerdi çapraz
 * kontrol hiçbir şey kanıtlamazdı.
 */
const ORACLE: Readonly<Record<VowelHarmonyClass, Readonly<Record<EndingKind, string>>>> = {
  backUnrounded: { afterConsonant: 'ın', afterVowel: 'nın' },
  frontUnrounded: { afterConsonant: 'in', afterVowel: 'nin' },
  backRounded: { afterConsonant: 'un', afterVowel: 'nun' },
  frontRounded: { afterConsonant: 'ün', afterVowel: 'nün' },
};

const countBy = (predicate: (item: SuffixCase) => boolean): number =>
  SUFFIX_CASES.filter(predicate).length;

const hasTag = (item: SuffixCase, tag: CaseTag): boolean => item.tags?.includes(tag) === true;

describe('kriter 3 — 50 vakanın TAMAMI', () => {
  it('vaka sayısı kriterin eşiğini karşılıyor', () => {
    expect(SUFFIX_CASES.length).toBeGreaterThanOrEqual(50);
  });

  it('her vaka tam biçimi doğru üretiyor', () => {
    const failures = SUFFIX_CASES.filter((item) => withSuffix(item.name) !== item.expected).map(
      (item) => `${item.name}: beklenen ${item.expected}, gelen ${withSuffix(item.name)}`,
    );
    // Tek tek `expect` yerine toplu liste: bir vaka kırıldığında HANGİSİ
    // olduğu çıktıda görünsün, ilk kırılanda durup gerisini gizlemesin.
    expect(failures).toEqual([]);
  });

  it('suffixFor kesme işareti TAŞIMIYOR — kesme şablonda durur', () => {
    for (const item of SUFFIX_CASES) {
      const suffix = suffixFor(item.name);
      expect(suffix.startsWith("'")).toBe(false);
      expect(`${item.name.trim()}'${suffix}`).toBe(item.expected);
    }
  });
});

describe('kapsam — uzunluk kör bir kontroldür, dağılım ayrıca iddia edilir', () => {
  it('dört ünlü uyumu sınıfının DÖRDÜ de temsil ediliyor', () => {
    const classes = Object.values(VOWEL_HARMONY_CLASSES);
    for (const harmony of classes) {
      expect(countBy((item) => item.harmony === harmony)).toBeGreaterThan(0);
    }
    expect(classes).toHaveLength(4);
  });

  it('sekiz bileşimin SEKİZİ de temsil ediliyor ve dağılım sabit', () => {
    const endings: readonly EndingKind[] = ['afterConsonant', 'afterVowel'];
    const distribution = Object.values(VOWEL_HARMONY_CLASSES).flatMap((harmony) =>
      endings.map((ending) => ({
        key: `${harmony}/${ending}`,
        count: countBy((item) => item.harmony === harmony && item.ending === ending),
      })),
    );

    for (const entry of distribution) {
      expect(entry.count, `${entry.key} bileşiminde hiç vaka yok`).toBeGreaterThan(0);
    }

    // Dağılım TEK TEK sabitleniyor: bir satır eklemek bu testi kırar.
    expect(Object.fromEntries(distribution.map((e) => [e.key, e.count]))).toEqual({
      'backUnrounded/afterConsonant': 10,
      'backUnrounded/afterVowel': 10,
      'frontUnrounded/afterConsonant': 7,
      'frontUnrounded/afterVowel': 9,
      'backRounded/afterConsonant': 8,
      'backRounded/afterVowel': 5,
      'frontRounded/afterConsonant': 5,
      'frontRounded/afterVowel': 1,
    });
    expect(SUFFIX_CASES).toHaveLength(55);
  });

  it('etiketli sınıflar sayılıyor ve boş değil', () => {
    expect(countBy((item) => hasTag(item, 'foreign'))).toBe(11);
    expect(countBy((item) => hasTag(item, 'abbreviation'))).toBe(5);
    expect(countBy((item) => hasTag(item, 'override'))).toBe(3);
    expect(countBy((item) => hasTag(item, 'casing'))).toBe(1);
    expect(countBy((item) => hasTag(item, 'multiWord'))).toBe(1);
  });

  it('kriterin BEŞ örneğinin beşi de listede', () => {
    expect(
      SUFFIX_CASES.filter((item) => hasTag(item, 'criterion')).map((item) => item.expected),
    ).toEqual(["Galatasaray'ın", "Beşiktaş'ın", "Roma'nın", "Trabzonspor'un", "Liverpool'un"]);
  });

  it('etiketler kendi kendini doğruluyor — expected, etiketin gerektirdiği ekle bitiyor', () => {
    const mismatched = SUFFIX_CASES.filter(
      (item) =>
        !item.expected.endsWith(`'${ORACLE[item.harmony][item.ending]}`) ||
        !item.expected.startsWith(`${item.name}'`),
    ).map((item) => item.name);
    expect(mismatched).toEqual([]);
  });
});

describe('resolveEnding — sessiz varsayılan YOK', () => {
  it('boş ad ValidationError fırlatıyor', () => {
    expect(() => resolveEnding('')).toThrow(ValidationError);
    expect(() => resolveEnding('   ')).toThrow(ValidationError);
    try {
      resolveEnding('');
      expect.unreachable('fırlatmalıydı');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).code).toBe('i18n.suffix.emptyName');
    }
  });

  it('ünlüsü olmayan ve tabloda satırı olmayan ad fırlatıyor', () => {
    try {
      resolveEnding('XYZ');
      expect.unreachable('fırlatmalıydı');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).code).toBe('i18n.suffix.noVowel');
    }
    // Rakamlar da ünlü değildir: "1907" sessizce bir ek ALMAZ.
    expect(() => resolveEnding('1907')).toThrow(ValidationError);
    expect(() => suffixFor('XYZ')).toThrow(ValidationError);
    expect(() => withSuffix('XYZ')).toThrow(ValidationError);
  });

  it('KARŞI KONTROL — tabloda satırı OLAN ünlüsüz ad fırlatmıyor', () => {
    // Yukarıdaki test kuralın öttüğünü gösteriyor; bu, YANLIŞ YERE ötmediğini.
    expect(() => resolveEnding('TFF')).not.toThrow();
    expect(withSuffix('TFF')).toBe("TFF'nin");
  });

  it('baştaki/sondaki boşluk kırpılıyor', () => {
    expect(withSuffix('  Roma  ')).toBe("Roma'nın");
    expect(suffixFor('  Roma  ')).toBe('nın');
  });
});

describe('HARF TUZAĞI — neden hiçbir yerde toLowerCase() yok', () => {
  it('IĞDIR: noktasız I kalın ünlüdür, naive lowercase onu inceye çevirirdi', () => {
    // Ölçüldü: 'IĞDIR'.toLowerCase() === 'iğdir' — son ünlü ı → i olur ve ek
    // 'in çıkardı. Motor küçük harfe HİÇ çevirmediği için doğru cevap veriyor.
    expect('IĞDIR'.toLowerCase()).toBe('iğdir');
    expect(withSuffix('IĞDIR')).toBe("IĞDIR'ın");
  });

  it("İ'nin naive küçük harfi İKİ kod birimi üretir — indeks taraması kayardı", () => {
    expect('İ'.toLowerCase().length).toBe(2);
    expect('İ'.length).toBe(1);
    expect(withSuffix('İzmir')).toBe("İzmir'in");
  });

  it('NFD ile ayrışmış İ, NFC normalizasyonu sayesinde doğru çözülüyor', () => {
    // Ayrışmış biçim: I + U+0307. Normalize edilmeseydi taban `I` KALIN
    // sayılır ve `İzmir` yanlışlıkla 'ın alırdı.
    const decomposed = 'İzmir'.normalize('NFD');
    expect(decomposed.length).toBe(6);
    expect(decomposed).not.toBe('İzmir');
    expect(withSuffix(decomposed)).toBe(`${decomposed}'in`);
  });
});

describe('tablolar — veri olarak sabit', () => {
  it('bugün YALNIZCA tamlayan hâli destekleniyor ve bu iddia ediliyor', () => {
    expect(Object.keys(GRAMMATICAL_CASES)).toEqual(['genitive']);
    expect(suffixFor('Roma', 'genitive')).toBe('nın');
  });

  it('her istisna satırı kendi GEREKÇESİNİ taşıyor', () => {
    const rows = Object.entries(PRONUNCIATION_OVERRIDES);
    expect(rows.length).toBeGreaterThan(0);
    for (const [name, row] of rows) {
      expect(row.reason.length, `${name} satırının gerekçesi boş`).toBeGreaterThan(20);
    }
    expect(Object.keys(PRONUNCIATION_OVERRIDES)).toEqual(['Chelsea', 'TFF', 'PSG']);
  });

  it('istisna araması TAM EŞLEŞME — farklı yazım kendi satırını ister', () => {
    // Bulanık eşleme bilerek yok. 'CHELSEA' tabloda değil ve yazımıyla
    // çözülüyor (son ünlü 'A' → kalın düz, ünlüyle bitiyor).
    expect(withSuffix('CHELSEA')).toBe("CHELSEA'nın");
    expect(withSuffix('Chelsea')).toBe("Chelsea'nin");
  });
});
