/**
 * TASARIM SİSTEMİNİN ÇEVİRİ ANAHTARLARI — **toplanmış**, tanımlanmamış.
 *
 * ════════════════════════════════════════════════════════════════════════════
 * SÖZLEŞME — 6.0 ⑤'te karara bağlandı, 6.4'te ilk kez YAZILDI
 * ════════════════════════════════════════════════════════════════════════════
 *
 *     common:ui.<bileşenAdı>.<alan>
 *
 * · **On birinci namespace AÇILMIYOR** (K12, 5.4 emsali). `common.json`un
 *   deseni *"üst seviye = bir yüzey"*; `ui.` o desene oturuyor ve 28 bileşenin
 *   28 üst seviye anahtar açmasını önlüyor.
 * · **Ön ek NOKTA ile biter.** Gerekçe `i18n-dynamic-keys.ts`ten birebir:
 *   noktasız bir `ui` ön eki `uiHelper` gibi bir anahtarı **yanlışlıkla**
 *   yakalar. Bu bir kuram değil, o dosyada ölçülmüş bir vaka.
 *
 * ════════════════════════════════════════════════════════════════════════════
 * ⚠️ ANAHTARLAR BURADA TANIMLANMIYOR — BİLEŞENLERİNDEN TOPLANIYOR
 * ════════════════════════════════════════════════════════════════════════════
 *
 * İlk yazımda hepsi bu dosyada tanımlıydı ve bileşenler import ediyordu.
 * **`pnpm i18n:check` üçünü birden *"kullanılmayan anahtar"* diye bildirdi** —
 * ve kapı haklıydı: `t(X.y)` çağrısında `X`i yalnızca **aynı dosyadaysa**
 * çözebiliyor, import zincirini takip etmiyor (aracın kendi başlığında yazılı
 * bir sınır: *"doğduğu gün ya çözüm genişler ya aile beyan edilir"*).
 *
 * **Beyan etmek yasaktı:** `i18n-dynamic-keys.ts` kural ① — *"kod içinde bir
 * tabloda duran anahtarlar girmez, çünkü `i18n-check` onları veri akışıyla
 * çözebiliyor"*. Aileyi beyan etmek kapıyı `common:ui.*`ın **tamamında**
 * körleştirirdi.
 *
 * Kalan doğru çıkış: anahtarı **çözülebilir yere** koymak. Her bileşen kendi
 * anahtarlarını kendi dosyasında tanımlıyor; bu modül onları **yayıyor**.
 * İki liste yok — biri diğerinin türevi, ayrışmaları mümkün değil.
 */
import { COMBOBOX_KEYS } from './combobox.js';
import { SELECT_KEYS } from './select.js';

/** Ön ek — **nokta ile biter**, ve bu bir kaza değil (yukarı bak). */
export const UI_KEY_PREFIX = 'common:ui.';

/**
 * Tasarım sisteminin kullanıcıya görünen bütün metinleri — **türetilmiş**.
 *
 * Bir bileşen yeni bir anahtar kazandığında burada tek yapılacak şey onun
 * `*_KEYS` nesnesini yaymak; anahtar dizeleri **kopyalanmıyor**.
 */
export const UI_KEYS = {
  select: SELECT_KEYS,
  combobox: COMBOBOX_KEYS,
} as const;

/** Bütün anahtar dizeleri, düz bir liste — nöbetçinin taradığı küme. */
export const ALL_UI_KEYS: readonly string[] = Object.values(UI_KEYS).flatMap((group) =>
  Object.values(group),
);

export type UiKeyGroupName = keyof typeof UI_KEYS;
