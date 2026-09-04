/**
 * DİNAMİK ANAHTAR AİLELERİ — 5.0'ın kararının TEK kaynağı.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * NEDEN VAR
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Bazı çeviri anahtarları hiçbir `t()` çağrısında **literal olarak geçmez**:
 * değerleri çalışma zamanında doğar. Statik bir tarama onları *"kullanılmayan
 * anahtar"* sayar ve gürültü basan bir kapı kapatılır.
 *
 * 5.0 kararı (ROADMAP Faz 5 → 5.0 SONUÇ (b)) bu dosyanın sözleşmesidir:
 * *"her dinamik aile için bir yardımcı yazılır, girdisi kapalı bir kümeye
 * daraltılır, ve kaçış tek yerde gerekçesiyle durur. **Aynı modül
 * `i18n-check`in dinamik aile beyanı olur** — yani tip sınırı ile kapının
 * beyanı aynı kaynak, ayrışamazlar."* Ayrı bir allowlist dosyası o gün
 * **elenmişti**: iki liste kaçınılmaz olarak ayrışır.
 *
 * ⚠️ **TİP KAÇIŞ YARDIMCISI HENÜZ BURADA DEĞİL — ve bu bir eksiklik değil.**
 * Ölçüldü (5.6): depoda **tek bir dinamik `t()` çağrısı yok** (`errors:code`
 * ve `defaultValue` için 0 eşleşme). Tüketicisi olmayan bir yardımcı yazmak
 * ölü kod olurdu. Bu modülün bugünkü **tek** tüketicisi `pnpm i18n:check`;
 * ilk dinamik `t()` çağrısı doğduğunda (Faz 13+, `errors:code.*`) yardımcı
 * **bu dosyaya** gelir ve beyan onunla aynı kaynakta kalır.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ BEYAN ETMEK, GÖRMEZDEN GELMEKTİR — LİSTE DAR TUTULUR
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Buraya eklenen her ön ek, o ön ekle başlayan **bütün** anahtarları
 * *"kullanılmayan"* denetiminden çıkarır. `common:diagnostics.` eklenseydi on
 * bir anahtar birden sessizleşirdi ve kapı orada kör olurdu. Bu yüzden:
 *
 *   ① Yalnızca değeri **uygulamanın dışından** gelen aileler girer
 *      (veritabanı, HTTP gövdesi) — kod içinde bir tabloda duran anahtarlar
 *      **girmez**, çünkü `i18n-check` onları veri akışıyla **çözebiliyor**.
 *   ② Her satır kendi gerekçesini taşır.
 *   ③ Hiçbir anahtarla eşleşmeyen bir ön ek **yasaktır** (testte iddia
 *      ediliyor): ya yazım hatasıdır ya da ailesi ölmüştür.
 *
 * **Neden `debugPanel.tab.` BURADA DEĞİL — ölçüldü (5.6).** O anahtarlar da
 * `t()`ye bir modül sabiti üzerinden gidiyor (`TAB_LABEL_KEYS`), yani
 * literal geçmiyorlar. Ama sabit **aynı dosyada** ve değerleri statik;
 * `i18n-check` `t(TAB_LABEL_KEYS[id])` çağrısından sabitin **bütün
 * değerlerini** çözüyor. Çözülebilen bir şey beyan edilmez — beyan, çözümün
 * mümkün olmadığı yerde kullanılır.
 */

/**
 * Değeri uygulamanın dışından gelen anahtar aileleri.
 *
 * Biçim: `<namespace>:<anahtar ön eki>` — ön ek nokta ile biter, böylece
 * `country.` yanlışlıkla `countryside` gibi bir anahtarı yakalamaz.
 */
export const DYNAMIC_KEY_PREFIXES = [
  // Ülke adları: `countries.name_key` sütunu `country.<kod>` üretiyor
  // (`tools/data-cli/src/seed/world-seed-data.ts` → `countryNameKey`).
  // Değer veritabanından geliyor; hiçbir `t()` çağrısında literal geçmez.
  'common:country.',

  // Yarışma adları: `competitions.name_key` sütunu
  // `competition.<ülke>.<slug>` üretiyor (`competitionNameKey`). Aynı gerekçe.
  'common:competition.',

  // HTTP hata yedeği: anahtar çalışma zamanında `'errors:status.' + status`
  // diye birleşiyor (SAPMA-038 — `kind` gövdede yok, `status` var).
  // 5.0'ın dinamik aile tablosu bu aileyi **kapalı, 4 üye** diye zaten
  // saymıştı; burada uydurulmuyor, uygulanıyor.
  //
  // ⚠️ **BUGÜN TÜKETİCİSİ YOK ve bunu `i18n:check` BULDU** (5.6): dört anahtar
  // 5.4'te yazıldı ama `api.ts` hata gövdesini hiç parse etmiyor, yani hiçbir
  // ekrana ulaşmıyorlar. Silinmediler çünkü aile **kapalı ve tasarlanmış**;
  // ilk tüketici bir HTTP hata yüzeyiyle gelecek (Faz 13+). Bu satır o güne
  // kadar aileyi görünür tutuyor — beyan edilmeseydi kapı her koşuda dört
  // yanlış alarm basar ve kapatılırdı.
  'errors:status.',
] as const;

export type DynamicKeyPrefix = (typeof DYNAMIC_KEY_PREFIXES)[number];

// ⚠️ BURADA BİR `isDynamicKey()` YARDIMCISI YOK — yazılıp SİLİNDİ (5.6).
// `i18n:check` bu dosyayı **import etmiyor**, TypeScript'in ayrıştırıcısıyla
// **okuyor** (bir `.mjs` kapısı bir `.ts` modülünü derlemeden çağıramaz), yani
// fonksiyonun tüketicisi yoktu. Tüketicisi olmayan bir sonda silinir — 5.3'ün
// `nonExplicitSupportedLngs`i sildiği gerekçenin aynısı: hiçbir şey yapmayan
// bir dışa aktarım bir sonraki okuyucuya "bu gerekli" dedirtir (SAPMA-026).
// İlk gerçek tüketici doğduğunda (tip kaçış yardımcısıyla birlikte) geri gelir.
