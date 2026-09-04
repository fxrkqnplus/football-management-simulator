/**
 * i18next örneği — `apps/web`in işi, `packages/shared`ın DEĞİL.
 *
 * ⚠️ **Bu dosyanın YERİ bir karar** (Faz 5.0, ROADMAP Faz 5 → 5.0 SONUÇ (a)):
 * `apps/api`, `apps/worker` ve `packages/engine` `@fms/shared`ı import ediyor;
 * i18next'i oraya koymak onu üç katmana birden sokardı. SAPMA-012'de ölçüldü ki
 * `sideEffects: false` ve `types: []` bir alt yol sızıntısını **engellemiyor**.
 * `packages/shared/src/i18n/` **saf** kalır (dilbilgisi + `Intl`); i18next burada.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * KARARLAR — hiçbiri varsayılana bırakılmadı
 * ────────────────────────────────────────────────────────────────────────────
 *
 * **① KAYNAKLAR STATİK PAKETLENİYOR, geç yükleme YOK.**
 * On küçük JSON, **tek dil**. Geç yükleme bir backend paketi (`i18next-http-backend`)
 * getirirdi ve ROADMAP Faz 5 kapsamı öyle bir paket **saymıyor** (K12). Statik
 * olmanın üç ölçülebilir faydası var: `Suspense` sınırı gerekmiyor (anahtar
 * yanıp sönmesi yok), `initReactI18next` senkron başlıyor, ve 5.6'nın
 * `i18n-check`i taranacak yüzeyi **dosya sisteminden** biliyor.
 *
 * **② `fallbackLng: 'tr'` AÇIKÇA yazılı.** v1 tek dilli (`CLAUDE.md` §16.1 —
 * İngilizce v2 kasasında). Tarayıcı `en` derse ve geri düşüş yazılmasaydı
 * i18next **anahtarın kendisini** basardı: kullanıcı ekranda `squad:table.age`
 * görürdü. Bu, K5'in korumak istediği yüzeyde sessiz bir bozulma olurdu.
 *
 * **③ `supportedLngs: ['tr']` — ve GEREKÇESİ ÖLÇÜLDÜ, tahmin edilmedi.**
 * İlk yazılan gerekçe *"yazılmazsa `tr-TR` için kaynak bulunamaz"* idi ve
 * **yanlış çıktı**: dört kombinasyon koşuldu, çeviri her hâlde çözülüyor.
 * Gerçek fark `i18n.language` alanında:
 *
 * | `supportedLngs` | `changeLanguage('en')` sonrası `language` | `t()` |
 * |---|---|---|
 * | `['tr']` | **`tr`** | `Fransa` |
 * | yazılmamış | **`en`** ⚠️ | `Fransa` |
 *
 * Yani onsuz çeviri **çalışır ama `i18n.language` YALAN SÖYLER**. O alanı
 * `<html lang>` eşitlemesi, `localStorage` önbelleği ve dil gösteren her
 * arayüz okur — `en` yazması sessiz bir bozulmadır. Test bunu iddia ediyor.
 *
 * ⚠️ **`nonExplicitSupportedLngs` YAZILMADI ve bu bir ölçüm sonucu.** Önce
 * eklenmişti; mutasyon onu **yakalayamadı** (`true`/`false` fark üretmedi) ve
 * izole bir deney dört kombinasyonda da `resolvedLanguage: 'tr'` verdi.
 * i18next 26 bu indirgemeyi zaten yapıyor. Hiçbir şey yapmayan bir ayarı
 * bırakmak, bir sonraki okuyucuya *"bu gerekli"* dedirtirdi (SAPMA-026).
 *
 * **④ ALGILAMA SIRASI AÇIK: `localStorage` → `navigator` → `htmlTag`.**
 * Varsayılana bırakılmadı. Sıranın anlamı: kullanıcının **açık** seçimi
 * (bugün yok, Faz 6'da gelebilir) tarayıcı tercihini yener; tarayıcı da
 * `<html lang>`i yener. `<html lang="tr">` ölçüldü ve **zaten doğru**
 * (`apps/web/index.html`:2) — yani son çare de `tr`.
 *
 * ⚠️ **`<html lang>` bir erişilebilirlik sözleşmesi:** yanlışsa ekran okuyucu
 * Türkçe metni yanlış dille seslendirir. Bugün doğru; asıl denetimi Faz 49.
 */
import i18next, { type i18n as I18nInstance } from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import common from '../locales/tr/common.json';
import dialogue from '../locales/tr/dialogue.json';
import errors from '../locales/tr/errors.json';
import finance from '../locales/tr/finance.json';
import match from '../locales/tr/match.json';
import news from '../locales/tr/news.json';
import squad from '../locales/tr/squad.json';
import tactics from '../locales/tr/tactics.json';
import transfer from '../locales/tr/transfer.json';
import tutorial from '../locales/tr/tutorial.json';

/** Arayüz dili. Tek eleman — v1 yalnızca Türkçe. */
export const SUPPORTED_LANGUAGES = ['tr'] as const;

export const FALLBACK_LANGUAGE = 'tr';

/**
 * ON NAMESPACE — ROADMAP Faz 5 kapsamı bunları **tek tek** sayıyor.
 *
 * ⚠️ Bu bir SAYI değil bir LİSTE (4.5'in `VISIBLE_ATTRIBUTES` emsali):
 * bir namespace eklenir ya da çıkarılırsa test kırılır, sessizce değişmez.
 * On birinci bir namespace açmak ROADMAP kapsamını genişletmektir (K12).
 */
export const NAMESPACES = [
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
] as const;

export type Namespace = (typeof NAMESPACES)[number];

export const DEFAULT_NAMESPACE = 'common' satisfies Namespace;

/**
 * Türkçe kaynaklar — STATİK, derleme zamanında paketleniyor.
 *
 * `as const` YOK ve bu bilinçli: JSON import'ları TypeScript tarafından zaten
 * dar tiplenmiş nesneler olarak geliyor (`resolveJsonModule`), ve
 * `i18next.d.ts` `typeof` ile bu nesnelerden tip üretiyor.
 */
export const trResources = {
  common,
  squad,
  tactics,
  transfer,
  match,
  finance,
  dialogue,
  news,
  tutorial,
  errors,
};

/**
 * i18next örneğini kurar.
 *
 * ⚠️ Modül düzeyinde **kendiliğinden çalışmıyor** — bir fonksiyon döndürüyor.
 * Gerekçe `main.test.tsx`in jsdom yıkım yarışıyla aynı sınıf: modül düzeyi yan
 * etki, testin kontrol edemediği bir yaşam döngüsü yaratır. Çağrı yeri
 * uygulamanın önyüklemesi (`main.tsx`), 5.4'te bağlanacak.
 */
export function createI18n(): I18nInstance {
  const instance = i18next.createInstance();

  void instance
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: { tr: trResources },
      supportedLngs: [...SUPPORTED_LANGUAGES],
      fallbackLng: FALLBACK_LANGUAGE,
      ns: [...NAMESPACES],
      defaultNS: DEFAULT_NAMESPACE,
      detection: {
        order: ['localStorage', 'navigator', 'htmlTag'],
        caches: ['localStorage'],
      },
      interpolation: {
        // React zaten kaçış yapıyor; i18next'in ikinci kez kaçış yapması
        // Türkçe kesme işaretini bozardı (`Galatasaray&#39;ın`).
        escapeValue: false,
      },
      // Anahtar bulunamazsa sessizce anahtarı basmak yerine görünür olsun.
      returnNull: false,
      react: {
        /**
         * ⚠️ `Suspense` KAPALI — ve gerekçesi hata arayüzünde.
         *
         * Açık olsaydı `withTranslation`/`useTranslation` çeviri "hazır"
         * olana kadar askıya alır ve **her tüketici bir `Suspense` sınırı**
         * isterdi. `ErrorBoundary` de bir tüketici; onu askıya alan bir
         * mekanizma, hata anında ekranı boş bırakabilirdi.
         * Kaynaklar zaten **statik paketlenmiş** ve `main.tsx` başlatmayı
         * render'dan önce doğruluyor — beklenecek hiçbir şey yok.
         */
        useSuspense: false,
      },
    });

  return instance;
}
