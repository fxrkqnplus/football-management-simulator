/**
 * Kapalı bir kümeyi SQL `IN (…)` literal listesine çeviren **tek** yer.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * NEDEN VAR — BORÇ-008 (Faz 4.7'de açıldı, 4.11'de ödendi)
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `spec/01` §3.1.2 ② kapalı kümelere CHECK kısıtı koyuyor ve §3.1.2 ① o listenin
 * **elle yazılmamasını**, kümenin kendisinden **türetilmesini** istiyor. Kural
 * doğruydu ve her tablo ona uydu — ama her tablo **kendi kopyasıyla** uydu:
 * 4.11'de sayıldı, ifade **dokuz** şema dosyasında birebir tekrarlanıyordu
 * (beşi adlandırılmış yerel bir yardımcı — `people` · `staff` · `managers` ·
 * `data-pack-columns` `literals`, `player-positions` `inList` —, dördü satır
 * içi: `club-kits` · `competitions` · `countries` · `players`).
 *
 * Dokuzu da **aynı** metni üretiyordu, yani borç bugün zararsızdı. Zarar
 * biçimlerden biri düzeltilip diğerlerinin unutulduğu gün doğardı: kaçış,
 * tırnak ya da ayraç kuralı bir dosyada değişir, sekiz dosyada değişmez ve
 * fark **üretilen SQL'de** ortaya çıkar — hiçbir statik kapının bakmadığı yerde.
 *
 * ⚠️ **`kit_templates.ts` BU SINIFA GİRMİYOR ve bu ölçülerek ayrıldı.**
 * O dosya da `KIT_COLOR_SLOTS.join(', ')` yazıyor ve kaba bir taramada aynı
 * desene benziyor, ama `KIT_COLOR_SLOTS` **sayı** dizisi (`[2, 3]`) — çıktısı
 * `2, 3`, tırnaksız. Buraya bağlanması üretilen SQL'i `'2', '3'` yapardı, yani
 * **şemayı değiştirirdi**. Ortaklaştırmanın sınırı "aynı görünen" değil, "aynı
 * metni üreten" ifadedir.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * `sql.raw` BURADA NEDEN GÜVENLİ
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Değerler her zaman repodaki bir `as const` dizisinden geliyor; dışarıdan
 * gelen hiçbir girdi bu fonksiyona ulaşmıyor. Ve çıktının `drizzle-kit
 * generate`in ürettiği DDL dosyasına **gömülü literal** olarak girmesi
 * gerekiyor — bir parametre yer tutucusu bir migration dosyasına yazılamaz.
 * Gerekçenin uzun hâli `data-pack-columns.ts` → `sourceCheck()` başlığında.
 */
export function sqlLiterals(values: readonly string[]): string {
  return values.map((value) => `'${value}'`).join(', ');
}
