/**
 * FONT ALT KÜMESİ KAPSAMI — `docs/spec/05-design-system.md` §7.3'ün iddiası
 * ölçülüyor.
 *
 * §7.3 diyor ki: *"Türkçe karakterler (ğ Ğ ü Ü ş Ş ı İ ö Ö ç Ç) her iki fontta
 * tam desteklidir; alt küme (subset) oluştururken `latin-ext` dahil
 * edilmeli."*
 *
 * ⚠️ **BU BİR DIŞ PAKETİN VERİSİNİ ÖLÇÜYOR — ve bilinçli.** *"Bir dış
 * kütüphanenin çıktısını tam sayıyla iddia eden test, kodu değil onu ölçer."*
 * Burada ölçülmek istenen şey **tam olarak odur**: bizim gönderdiğimiz
 * fontların Türkçe alfabesini kapsayıp kapsamadığı. Bir sürüm yükseltmesi
 * `latin-ext`i düşürürse arayüzde `ğ` yedek yazı tipine düşer ve **hiçbir şey
 * ötmez** — bu test o sessizliği kapatıyor.
 *
 * ⚠️ **`node:fs` KULLANILMIYOR.** `apps/web/tsconfig.json` `types:
 * ["vite/client"]` taşıyor, yani Node tipleri yok — bir test rahatlığı için o
 * sınırı açmak muafiyetin kapsamı yutması sınıfı olurdu. Veri **JSON içe
 * aktarımıyla** geliyor (emsal: `app/i18n.ts` çeviri dosyalarını böyle okuyor)
 * ve paketin `exports` haritası `./unicode.json` ile `./package.json`ı
 * **adıyla** dışa açıyor.
 */
import { TURKISH_CODE_POINTS } from '@fms/ui';
import interPkg from '@fontsource-variable/inter/package.json';
import interSubsets from '@fontsource-variable/inter/unicode.json';
import monoPkg from '@fontsource-variable/jetbrains-mono/package.json';
import monoSubsets from '@fontsource-variable/jetbrains-mono/unicode.json';
import { describe, expect, it } from 'vitest';

interface UnicodeRange {
  readonly from: number;
  readonly to: number;
}

/** `U+0100-02BA,U+0304,…` biçimini aralık listesine çevirir. */
const parseUnicodeRange = (range: string): UnicodeRange[] =>
  range.split(',').map((part) => {
    const body = part.trim().replace(/^U\+/i, '');
    const [start, end] = body.split('-');
    const from = Number.parseInt(start ?? '', 16);
    const to = end === undefined ? from : Number.parseInt(end, 16);
    return { from, to };
  });

const covers = (ranges: readonly UnicodeRange[], codePoint: number): boolean =>
  ranges.some((r) => codePoint >= r.from && codePoint <= r.to);

const hex = (codePoint: number): string => `U+${codePoint.toString(16).toUpperCase()}`;

const FONTS = [
  { name: 'Inter Variable', subsets: interSubsets, version: interPkg.version },
  { name: 'JetBrains Mono Variable', subsets: monoSubsets, version: monoPkg.version },
] as const;

describe.each(FONTS)('$name — Türkçe glif kapsamı', ({ subsets, version }) => {
  it('ölçüm ortamı KAYITLI — sürüm bir iddia değil, bir künye', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('`latin` VE `latin-ext` alt kümelerinin ikisi de bildirilmiş', () => {
    // §7.3 yalnızca `latin-ext`i adıyla istiyor; ölçüm ikisinin de gerektiğini
    // gösterdi (aşağıdaki vaka).
    expect(Object.keys(subsets)).toContain('latin');
    expect(Object.keys(subsets)).toContain('latin-ext');
  });

  it('ON İKİ Türkçe kod noktasının HEPSİ iki alt kümenin birleşiminde', () => {
    const latin = parseUnicodeRange(subsets.latin);
    const latinExt = parseUnicodeRange(subsets['latin-ext']);
    expect(TURKISH_CODE_POINTS).toHaveLength(12);

    for (const entry of TURKISH_CODE_POINTS) {
      const inEither = covers(latin, entry.codePoint) || covers(latinExt, entry.codePoint);
      expect(inEither, `${entry.char} (${hex(entry.codePoint)})`).toBe(true);
    }
  });

  it('⚠️ TEK BAŞINA `latin` YETMİYOR — `latin-ext` gerçekten gerekli', () => {
    // Karşı kontrol. Bu vaka olmadan yukarıdaki test, `latin-ext`in gereksiz
    // olduğu ihtimalini ayıramazdı ("bir mutasyonun hiçbir şeyi kırmaması
    // KODUN GEREKSİZ olduğu anlamına da gelebilir").
    const latin = parseUnicodeRange(subsets.latin);
    const missing = TURKISH_CODE_POINTS.filter((e) => !covers(latin, e.codePoint));
    expect(missing.map((e) => e.char).sort()).toEqual(['Ğ', 'İ', 'Ş', 'ğ', 'ş'].sort());
  });

  it('⚠️ `ı` (U+0131) `latin-ext`te DEĞİL, `latin` alt kümesinde — ölçüldü', () => {
    // Sezgiye aykırı ve yazılıyor: noktasız `ı` Latin Extended-A bloğunda
    // (U+0131) ama Google Fonts onu `latin` alt kümesine AÇIKÇA eklemiş.
    // "Türkçe harfler latin-ext'tedir" genellemesi bu harfte YANLIŞ.
    const latin = parseUnicodeRange(subsets.latin);
    expect(covers(latin, 0x0131)).toBe(true);
    // Kardeşi `İ` (U+0130) ise `latin`de YOK — ikisi ayrı alt kümelerde.
    expect(covers(latin, 0x0130)).toBe(false);
  });

  it('KONTROL: ayrıştırıcı gerçekten çalışıyor — kapsam DIŞI bir kod noktası false', () => {
    // "0 bulundu" ile "hiçbir şeye bakmadı" ayırt edilebilir olmalı.
    const latin = parseUnicodeRange(subsets.latin);
    const latinExt = parseUnicodeRange(subsets['latin-ext']);
    // U+4E2D hiçbir Latin alt kümesinde olmamalı.
    expect(covers(latin, 0x4e2d) || covers(latinExt, 0x4e2d)).toBe(false);
  });
});

describe('TURKISH_CODE_POINTS envanteri', () => {
  it('§7.3’ün saydığı on iki harfin hepsi, büyük ve küçük çiftleriyle', () => {
    expect(TURKISH_CODE_POINTS.map((e) => e.char).join('')).toBe('çÇğĞıİöÖşŞüÜ');
  });

  it('kod noktaları harflerle TUTARLI — liste kendi içinde doğrulanıyor', () => {
    // Bir SAYI değil bir LİSTE; ve listenin iki sütunu birbirini kontrol ediyor.
    for (const entry of TURKISH_CODE_POINTS) {
      expect(entry.char.codePointAt(0), entry.name).toBe(entry.codePoint);
    }
  });

  it('hiçbir kod noktası tekrarlanmıyor', () => {
    const points = TURKISH_CODE_POINTS.map((e) => e.codePoint);
    expect(new Set(points).size).toBe(points.length);
  });
});
