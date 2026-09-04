/**
 * i18next kurulumunun testi — ve 5.1'in ÇAPRAZ DOĞRULAMASI.
 *
 * ⚠️ **BUGÜN ÖLÇÜLEMEYENLER AÇIKÇA YAZILI (D1):** *"anahtarlar tam"*,
 * *"eksik yok"*, *"kullanılmayan yok"* iddialarını yapacak araç (`i18n-check`)
 * **5.6'da geliyor**. Buradaki testler kurulumun **davranışını** ölçüyor;
 * anahtar bütünlüğünü değil.
 */
import { withSuffix } from '@fms/shared';
import { describe, expect, it } from 'vitest';

import commonTr from '../locales/tr/common.json';
import {
  createI18n,
  DEFAULT_NAMESPACE,
  FALLBACK_LANGUAGE,
  NAMESPACES,
  SUPPORTED_LANGUAGES,
  trResources,
} from './i18n.js';

/** `common.json`daki düz anahtar → değer listesi. */
const flattenKeys = (obj: unknown, prefix = ''): readonly (readonly [string, string])[] => {
  if (typeof obj !== 'object' || obj === null) return [];
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix === '' ? key : `${prefix}.${key}`;
    return typeof value === 'string' ? [[path, value] as const] : flattenKeys(value, path);
  });
};

/**
 * Seed anahtarları — YALNIZCA `country.*` ve `competition.*`.
 *
 * ⚠️ 5.3'te `common.json` yalnızca bu ikisini taşıyordu ve liste dosyanın
 * tamamından türetiliyordu. 5.4 dosyaya `value.*`, `diagnostics.*` ve
 * `debugPanel.*` ekledi; kapsam **açıkça daraltıldı** ki "17 anahtar" iddiası
 * anlamını korusun. Gevşetilmedi — **daraltıldı ve sebebi yazıldı**.
 */
const SEED_KEYS = [
  ...flattenKeys(commonTr.country, 'country'),
  ...flattenKeys(commonTr.competition, 'competition'),
];

describe('namespace envanteri — SAYI değil LİSTE', () => {
  it('ROADMAP kapsamının saydığı ON namespace, ADLARIYLA', () => {
    // Bir namespace eklemek ya da çıkarmak bu testi kırar; on birinci bir
    // namespace açmak ROADMAP kapsamını genişletmektir (K12).
    expect([...NAMESPACES]).toEqual([
      'common',
      'squad',
      'tactics',
      'transfer',
      'match',
      'finance',
      'dialogue',
      'news',
      'tutorial',
      'errors',
    ]);
  });

  it('her namespace için bir kaynak dosyası VAR', () => {
    expect(Object.keys(trResources).sort()).toEqual([...NAMESPACES].sort());
  });

  it('boş namespace listesi TAM — 5.4 birini doldurdu ve liste küçüldü', () => {
    // ⚠️ 5.3'te DOKUZ namespace boştu; 5.4 `errors`ı doldurdu (BORÇ-005) ve
    // bu iddia **kırıldı** — beklendiği gibi. Test GEVŞETİLMEDİ
    // (`toBeGreaterThan` gibi), liste **güncellendi**: bir envanterin
    // boşalması ancak envanter tam kalırsa görünür.
    // Anahtar hâlâ UYDURULMUYOR (SAPMA-026): kalan sekizi tüketicisiyle dolar.
    const empty = NAMESPACES.filter((ns) => Object.keys(trResources[ns]).length === 0);
    expect([...empty]).toEqual([
      'squad',
      'tactics',
      'transfer',
      'match',
      'finance',
      'dialogue',
      'news',
      'tutorial',
    ]);
    expect(Object.keys(trResources.common)).toEqual([
      'country',
      'competition',
      'value',
      'diagnostics',
      'debugPanel',
    ]);
    expect(Object.keys(trResources.errors)).toEqual(['boundary', 'status']);
  });
});

describe('seed anahtarları — 17, ÜRETİCİDEN türetilmiş', () => {
  it('tam olarak 17 anahtar var', () => {
    expect(SEED_KEYS).toHaveLength(17);
  });

  it('anahtar adları seed üreticisinin biçimini izliyor', () => {
    // `countryNameKey` → `country.<kod>` · `competitionNameKey` →
    // `competition.<sahip>.<slug>` (ilk alt çizgi noktaya döner).
    expect(SEED_KEYS.map(([key]) => key)).toEqual([
      'country.eng',
      'country.esp',
      'country.ger',
      'country.ita',
      'country.fra',
      'country.tur',
      'competition.eng.premier_league',
      'competition.eng.fa_cup',
      'competition.esp.laliga',
      'competition.ger.bundesliga',
      'competition.ita.serie_a',
      'competition.fra.ligue_1',
      'competition.tur.superlig',
      'competition.tur.cup',
      'competition.uefa.ucl',
      'competition.uefa.uel',
      'competition.uefa.uecl',
    ]);
  });

  it('hiçbir değer boş değil', () => {
    expect(SEED_KEYS.filter(([, value]) => value.trim() === '')).toEqual([]);
  });

  it('YABANCI YARIŞMA ADLARI ÇEVRİLMEDİ — bu bir karar', () => {
    // Kural: UEFA yarışmalarının RESMİ Türkçe adı var → çevrilir.
    // Ulusal lig özel adları → OLDUĞU GİBİ kalır ("Premier Ligi" uydurma olurdu).
    // Türk yarışmaları → zaten Türkçe.
    const byKey = Object.fromEntries(SEED_KEYS);
    expect(byKey['competition.eng.premier_league']).toBe('Premier League');
    expect(byKey['competition.esp.laliga']).toBe('LaLiga');
    expect(byKey['competition.ger.bundesliga']).toBe('Bundesliga');
    expect(byKey['competition.ita.serie_a']).toBe('Serie A');
    expect(byKey['competition.fra.ligue_1']).toBe('Ligue 1');
    expect(byKey['competition.eng.fa_cup']).toBe('FA Cup');
    // UEFA — resmî Türkçe adlar
    expect(byKey['competition.uefa.ucl']).toBe('UEFA Şampiyonlar Ligi');
    expect(byKey['competition.uefa.uel']).toBe('UEFA Avrupa Ligi');
    expect(byKey['competition.uefa.uecl']).toBe('UEFA Konferans Ligi');
    // Türk yarışmaları
    expect(byKey['competition.tur.superlig']).toBe('Süper Lig');
    expect(byKey['competition.tur.cup']).toBe('Türkiye Kupası');
  });

  it('GÖMÜLÜ GÖRÜNMEZ KARAKTER YOK — 5.2 beş kez düştü', () => {
    // `locales/**` içinde bölünmez boşluk MEŞRU olabilir (sayı + birim), ama
    // bugün hiçbiri onu istemiyor. Kalıcı nöbetçi 5.6'nın işi.
    // ⚠️ Desen AÇIK KAÇIŞ DİZİLERİYLE yazıldı. İlk hâli gerçek karakterleri
    // taşıyordu ve `no-irregular-whitespace` onu YAKALADI — 5.2 tuzağının
    // altıncı tekrarı, ve ilk kez bir KAPI yakaladı. Kuralın 5.2'de neden
    // ötmediği de ölçüldü: varsayılanı `skipStrings: true`, ve oradaki
    // karakterler DİZE içindeydi; buradaki bir REGEX literali.
    // U+00A0 bölünmez boşluk · U+200B sıfır genişlikli · U+200E/200F yön işareti
    const invisible = /[\u00A0\u200B\u200E\u200F]/;
    const offenders = SEED_KEYS.filter(([, value]) => invisible.test(value));
    expect(offenders).toEqual([]);
  });
});

describe('5.1 ÇAPRAZ DOĞRULAMASI — ek motoru GERÇEK adlarda, 17/17', () => {
  it('her adın tamlayan hâli doğru — örneklem YOK, hepsi', () => {
    const actual = SEED_KEYS.map(([, name]) => withSuffix(name));
    expect(actual).toEqual([
      "İngiltere'nin",
      "İspanya'nın",
      "Almanya'nın",
      "İtalya'nın",
      "Fransa'nın",
      "Türkiye'nin",
      // ⚠️ İkisi ISIRDI ve `PRONUNCIATION_OVERRIDES`a satır olarak eklendi:
      "Premier League'in", // yazım ünlüyle biter, okunuş ("lig") ünsüzle
      "FA Cup'ın", // yazımın "u"su kalın yuvarlak, okunuş ("kap") kalın düz
      "LaLiga'nın",
      "Bundesliga'nın",
      "Serie A'nın",
      "Ligue 1'in",
      "Süper Lig'in",
      "Türkiye Kupası'nın",
      "UEFA Şampiyonlar Ligi'nin",
      "UEFA Avrupa Ligi'nin",
      "UEFA Konferans Ligi'nin",
    ]);
  });

  it('hiçbir ad motoru FIRLATMAYA zorlamıyor', () => {
    // Ünlüsüz bir ad gelseydi `resolveEnding` fırlatırdı (sessiz varsayılan yok).
    for (const [key, name] of SEED_KEYS) {
      expect(() => withSuffix(name), `${key} fırlattı`).not.toThrow();
    }
  });
});

describe('kurulum davranışı', () => {
  it('tek dil, açık geri düşüş', () => {
    expect([...SUPPORTED_LANGUAGES]).toEqual(['tr']);
    expect(FALLBACK_LANGUAGE).toBe('tr');
    expect(DEFAULT_NAMESPACE).toBe('common');
  });

  it('örnek kuruluyor ve seed anahtarını çözüyor', async () => {
    const i18n = createI18n();
    await i18n.loadNamespaces([...NAMESPACES]);
    expect(i18n.t('country.tur')).toBe('Türkiye');
    expect(i18n.t('competition.tur.superlig')).toBe('Süper Lig');
  });

  it('KARŞI KONTROL — bilinmeyen anahtar ANAHTARIN KENDİSİNİ döner, boş değil', () => {
    // Bu davranış SEÇİLDİ ve iddia ediliyor: sessiz boş dize, eksik çeviriyi
    // görünmez yapardı. 5.6'nın `i18n-check`i asıl nöbetçi.
    const i18n = createI18n();
    // ⚠️ `@ts-expect-error` burada İKİ İŞ yapıyor ve ikincisi bir NÖBETÇİ:
    // ① testin derlenmesini sağlıyor ② tipli anahtarların bu anahtarı
    // GERÇEKTEN reddettiğini iddia ediyor. Tipleme bir gün çalışmayı bırakırsa
    // bu yorum "kullanılmayan" duruma düşer ve `typecheck` KIRILIR.

    // @ts-expect-error — tipli anahtar kümesinde yok; ölçülen şey RUNTIME davranışı
    expect(i18n.t('country.xxx')).toBe('country.xxx');
  });

  it('`en` istense bile Türkçe düşüyor — v1 tek dilli', () => {
    const i18n = createI18n();
    void i18n.changeLanguage('en');
    expect(i18n.t('country.ger')).toBe('Almanya');
  });

  it('`supportedLngs` `i18n.language`i NORMALLEŞTİRİYOR — asıl işi bu', () => {
    // ⚠️ İlk yazılan iddia *"onsuz `tr-TR` için kaynak bulunamaz"* idi ve
    // MUTASYON ONU YAKALAYAMADI; izole bir deney gerekçeyi çürüttü — çeviri
    // her hâlde çözülüyor. Ölçülen gerçek fark burada: `language` alanı.
    // Onsuz `changeLanguage('en')` sonrası `language === 'en'` kalıyor ve
    // `<html lang>` eşitlemesi ile `localStorage` önbelleği o alanı okuyor.
    const i18n = createI18n();
    void i18n.changeLanguage('tr-TR');
    expect(i18n.language).toBe('tr');
    expect(i18n.t('country.fra')).toBe('Fransa');

    void i18n.changeLanguage('en');
    expect(i18n.language).toBe('tr');
  });

  it('her çağrı AYRI bir örnek — modül düzeyi paylaşılan durum YOK', () => {
    // `createI18n()` bir fonksiyon; modül yüklenince kendiliğinden kurulmuyor.
    // Gerekçe `main.test.tsx`in jsdom yıkım yarışıyla aynı sınıf.
    expect(createI18n()).not.toBe(createI18n());
  });
});
