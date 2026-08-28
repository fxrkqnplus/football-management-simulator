/**
 * TÜRKÇE ARAMA ZEMİNİ — `pg_trgm` + `unaccent` ve `IMMUTABLE` sarmalayıcı.
 *
 * Bu dosya bir tablo tanımlamıyor; **migration'ın yarattığı veritabanı
 * nesnelerinin adlarını** tek yerde tutuyor ki şema indeksleri ile
 * `0004_search_indexes.sql` ayrışamasın. Ayrışsalardı indeks ifadesi var olmayan
 * bir fonksiyonu çağırır ve migration çalışma anında patlardı.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * PROBLEM — ölçüldü (Faz 3.1, 3.7'de yeniden doğrulandı)
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Düz `pg_trgm` Türkçe aramayı **sağlamıyor**. Gerçek PG 18.6:
 *
 * | Ölçüm | Sonuç |
 * |---|---|
 * | `similarity('Beşiktaş','besiktas')` | **0,2857** (varsayılan eşik **0,3**) |
 * | `'Beşiktaş' % 'besiktas'` | **`f`** |
 * | `similarity(unaccent('Beşiktaş'), unaccent('besiktas'))` | **1,0** ✅ |
 *
 * Sebep `show_trgm` ile görüldü: Türkçe harf içeren trigramlar **hash'leniyor**
 * ve ASCII sorguyla kesişmiyor. Bu, `docs/ROADMAP.md` **Faz 8**'in kabul
 * kriterinin (*"kulüp arama `besiktas` → `Beşiktaş`"*) dayanağı.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ `unaccent` `STABLE` — ve İKİNCİ BİÇİMİ DE KURTARMIYOR (3.7'de ölçüldü)
 * ────────────────────────────────────────────────────────────────────────────
 *
 * PostgreSQL indeks ifadesinde `IMMUTABLE` olmayan fonksiyon kabul etmiyor
 * (`ERROR: functions in index expression must be marked IMMUTABLE`).
 *
 * Yaygın bir kurtarma hipotezi vardı: sözlüğü açıkça veren iki argümanlı biçim
 * (`unaccent(regdictionary, text)`) sözlük araması yapmadığı için `IMMUTABLE`
 * olabilirdi. **Hipotez ölçümle çürütüldü** — `pg_proc` her ikisi için de
 * `provolatile = 's'` diyor ve iki indeks denemesi de **aynı hatayla** kırıldı.
 * Yani "daha temiz bir yol" yok; seçim iki dürüst seçenek arasında.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * SEÇİLEN YOL VE BEDELİ — açıkça yazılıyor
 * ────────────────────────────────────────────────────────────────────────────
 *
 * **Seçilen:** `IMMUTABLE` işaretli bir sarmalayıcı. Bu **bir iddiadır ve tam
 * olarak doğru değildir**: `unaccent` sözlüğü (`unaccent.rules`) PostgreSQL
 * dağıtımıyla geliyor ve bir majör yükseltmede değişebilir. Değişirse indeks
 * eski normalleştirmeyle kalır ve arama **sessizce** yanlış sonuç verir.
 *
 * **Bedel sessiz kalmıyor — gürültülüye çevrildi:** entegrasyon testi
 * sarmalayıcının çıktısını **sabit bir Türkçe karakter kümesi** için iddia
 * ediyor. Sözlük değişirse test CI'da kırılır, yani hata dağıtımdan **önce**
 * görülür. Sözlük gerçekten değişirse yapılacak şey `REINDEX`.
 *
 * **Elenen seçenek — kalıcı `search_key` sütunu.** Kimse yalan söylemezdi, ama:
 * ① 3.6'da 11/11 kapanan ve sütun listeleri testlerle sabitlenen şemayı yeniden
 * açardı ② **her yazan tarafa** bir sözleşme koyardı (Faz 8 ingest, Faz 11
 * editör, Faz 40 newgen) ve unutan bir yazar **yine sessiz** bir bozulma
 * üretirdi ③ sütunu tetikleyiciyle bakmak bu projede hiç kullanılmayan bir
 * mekanizma getirirdi. Sarmalayıcının hata biçimi **daha nadir ve CI'da
 * yakalanabilir**; sütunun hata biçimi **her yeni yazma yolunda** yeniden
 * doğar.
 */

/**
 * `unaccent`i `IMMUTABLE` olarak sunan sarmalayıcının adı.
 *
 * Gövdesi `0004_search_indexes.sql` içinde; buradaki sabit yalnızca indeks
 * ifadelerinin ona **aynı adla** başvurmasını garanti ediyor.
 */
export const IMMUTABLE_UNACCENT_FN = 'immutable_unaccent';

/**
 * Migration'ın kurduğu uzantılar.
 *
 * `pg_trgm` benzerlik operatörünü ve `gin_trgm_ops` operatör sınıfını,
 * `unaccent` ise normalleştirmeyi getiriyor. İkisi de PG 18 imajında **mevcut**
 * (ölçüldü: `pg_trgm` 1.6 · `unaccent` 1.1) — kurulum yalnızca
 * `CREATE EXTENSION`.
 */
export const REQUIRED_EXTENSIONS = ['pg_trgm', 'unaccent'] as const;

/**
 * Arama için normalleştirilmiş metin üreten SQL ifadesi.
 *
 * `lower()` **önce** uygulanıyor: `unaccent` büyük harfleri de dönüştürüyor ama
 * `İ`/`I` ayrımı Türkçe'de asimetrik, o yüzden sıralamayı sabitlemek gerekiyor.
 * İndeks ifadesi ile sorgu ifadesi **birebir aynı** olmak zorunda — aksi hâlde
 * planlayıcı indeksi seçmez ve kimse fark etmez (D3).
 */
export const searchNormalizedSql = (columnSql: string): string =>
  `${IMMUTABLE_UNACCENT_FN}(lower(${columnSql}))`;
