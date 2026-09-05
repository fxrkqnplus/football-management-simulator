/**
 * Tema modu çözümlemesi — `docs/spec/05-design-system.md` §7.1.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ SAF YARI BURADA, ÖLÇÜLEMEYEN YARI AYRI VE ADIYLA
 * ────────────────────────────────────────────────────────────────────────────
 *
 * 6.0 ölçtü: jsdom **30.0.1**'de `window.matchMedia` **tanımsız**. Yani
 * `prefers-color-scheme` ve `prefers-reduced-motion` bu ortamda
 * **değerlendirilemiyor**.
 *
 * Desen 6.7'nin kart moduyla aynı: **karar** saf bir fonksiyon ve tam test
 * edilebilir; **sinyalin okunması** edilemez. Bu yüzden ikisi ayrı:
 *
 *   • `resolveThemeMode()`      — saf, girdiden çıktı. **Tam test edilebilir.**
 *   • `readSystemPrefersDark()` — ortamı okur. **jsdom'da ölçülemez.**
 *
 * Sağlayıcı sinyali **parametre olarak** alıyor; ortamı okuyan fonksiyon
 * yalnızca uygulamanın kenarında çağrılıyor. Ortamı içeriden okuyan bir
 * sağlayıcı jsdom'da sınanamazdı ve *"bakacak bir şey bulamayan bir kapı"*
 * doğardı (SAPMA-024).
 *
 * → Tarayıcı yarısının doğrulaması **Faz 49**'a taşındı ve o fazın kapsamında
 *   adıyla yazılı.
 */

/**
 * Kullanıcının **seçimi**. `system` bir tema değil, bir **yönlendirme**:
 * çözülen tema ortamın sinyaline bağlı.
 */
export const THEME_PREFERENCES = ['dark', 'light', 'system'] as const;

export type ThemePreference = (typeof THEME_PREFERENCES)[number];

/** Ekrana basılan tema. `system` burada **yok** — çözülmüş olmak zorunda. */
export const THEME_MODES = ['dark', 'light'] as const;

export type ThemeMode = (typeof THEME_MODES)[number];

/**
 * §7.1: *"Koyu tema **(varsayılan)**"*.
 *
 * ⚠️ Varsayılan `system` **değil** ve bu spec'in kararı: uygulama koyu tema
 * için tasarlandı (*"FM26 estetiği: koyu, yoğun bilgi"*), ve açık tema §7.1'de
 * **eksik tanımlı** (20 token'ın 8'i — 6.2'nin ölçümü). `system` varsayılan
 * olsaydı, açık işletim sistemi ayarı olan bir kullanıcı uygulamayı **eksik
 * tanımlı** bir temada açardı.
 */
export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'dark';

/**
 * Tercihi ve ortam sinyalini **çözülmüş** bir temaya indirger.
 *
 * Saf: aynı girdi her zaman aynı çıktı. `system` dışındaki tercihler sinyali
 * **yok sayar** — kullanıcının açık seçimi ortamı yener.
 */
export const resolveThemeMode = (
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ThemeMode => {
  if (preference === 'dark') return 'dark';
  if (preference === 'light') return 'light';
  return systemPrefersDark ? 'dark' : 'light';
};

/**
 * Bir dizenin geçerli bir tercih olup olmadığı — `localStorage`'dan okunan
 * değer için.
 *
 * ⚠️ **Sessiz varsayılan yok.** Bozuk bir değer `dark`a düşmüyor; çağıran
 * `false` görüp ne yapacağına **kendi** karar veriyor. *"Falsy bir değer
 * «özellik yok» anlamına da gelebilir."*
 */
export const isThemePreference = (value: unknown): value is ThemePreference =>
  typeof value === 'string' && (THEME_PREFERENCES as readonly string[]).includes(value);

/**
 * ⚠️ **ORTAMI OKUYAN YARI — jsdom'da ÖLÇÜLEMEZ.**
 *
 * `window.matchMedia` jsdom 30.0.1'de **tanımsız** (6.0'da ölçüldü). Bu
 * fonksiyonun **doğru** davrandığı bu depoda **kanıtlanamaz**; kanıtlanabilen
 * tek şey, `matchMedia` yokken **ne yaptığı**.
 *
 * **Seçilen davranış ve gerekçesi:** `matchMedia` yoksa `true` döner, yani
 * **koyu tema**. Gerekçe `DEFAULT_THEME_PREFERENCE` ile aynı: açık tema §7.1'de
 * eksik tanımlı, dolayısıyla bilinmeyen bir ortamda ona düşmek daha kötü bir
 * varsayılan. Bu bir **seçim** ve iddia ediliyor — sessiz değil.
 *
 * → Gerçek tarayıcıda doğrulaması **Faz 49**.
 */
export const readSystemPrefersDark = (): boolean => {
  if (typeof globalThis.matchMedia !== 'function') return true;
  return globalThis.matchMedia('(prefers-color-scheme: dark)').matches;
};

/**
 * ⚠️ **ORTAMI OKUYAN YARI — jsdom'da ÖLÇÜLEMEZ.** Yukarıdakiyle aynı sınır.
 *
 * **Seçilen davranış:** `matchMedia` yoksa `false`, yani **hareket azaltılmaz**.
 * Gerekçe yön farkı: burada bilinmeyen bir ortamda animasyonu kapatmak,
 * kullanıcının **istemediği** bir kısıtlama olurdu; koyu temaya düşmek ise
 * spec'in zaten varsayılanı. İki fonksiyonun varsayılanları **ters yönde** ve
 * bu bir tutarsızlık değil, iki farklı sorunun iki farklı cevabı.
 */
export const readSystemPrefersReducedMotion = (): boolean => {
  if (typeof globalThis.matchMedia !== 'function') return false;
  return globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;
};
