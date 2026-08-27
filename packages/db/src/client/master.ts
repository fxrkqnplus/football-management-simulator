/**
 * Master World işaretlemesi — K4'ün TİP SEVİYESİNDEKİ zorlaması.
 *
 * `CLAUDE.md` **K4**: *"Master World salt-okunurdur. […] Master tabloya yazma
 * girişimi **tip seviyesinde derlenmez**."*
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ BU BİR İDDİA VE KANITLANMASI GEREKİYOR
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Faz 2'de *"üç kat savunma"* iddiası ölçümle **çürütüldü** (SAPMA-012):
 * `types: []` Node globallerini yasaklıyordu ama imza Node tipi taşımıyorsa
 * `.d.ts` sorunsuz derleniyordu. Aynı sınıf hataya düşmemek için buradaki iddia
 * bir **kontrol deneyiyle** sınanıyor:
 * `packages/db/src/client/master-write-control.test-d.ts` bilerek master'a yazan
 * kod içeriyor ve `@ts-expect-error` ile işaretli — **derleyici o satırda hata
 * ÜRETMEZSE `pnpm typecheck` kırılır.** Yani iddia kendi kendini denetliyor.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * NE KORUNUYOR, NE KORUNMUYOR — sınır açıkça yazılıyor
 * ────────────────────────────────────────────────────────────────────────────
 *
 * K4'ün metni *"asla **kullanıcı işlemiyle** değiştirilmez"* diyor. Korunan şey
 * bu: **oyunun çalışma zamanı veri erişim yolu**. Korunmayan iki yol bilinçli
 * olarak açık ve ikisi de kullanıcı işlemi değil:
 *
 * | Yol | Durum | Neden |
 * |---|---|---|
 * | Oyun kodu (`WritableDb`) | **KAPALI** — derlenmiyor | K4'ün asıl konusu |
 * | Migration koşucusu (`SqlExecutor`) | AÇIK | Şemayı değiştirmek migration'ın **tanımı**; kapatmak migration'ı imkânsız kılardı |
 * | Seed / veri aracı (Faz 3.8, `tools/data-cli`) | AÇIK | Master veriyi **dolduran** hat; K9 gereği veri paketlerinden gelir |
 *
 * Bu ayrım olmasaydı "hiçbir şey master'a yazamaz" gibi tutulamaz bir söz
 * verilmiş olurdu — ve tutulamayan bir söz, hiç verilmemiş bir sözden kötüdür.
 * **Ham SQL ve `as` dönüşümleri tipi atlar;** onların ikinci hattı veritabanı
 * rolüdür (`docs/spec/01-database.md` §3.4.1).
 */
import type { PgTable } from 'drizzle-orm/pg-core';

/**
 * Görünmez marka.
 *
 * `unique symbol` + `declare const`: çalışma zamanında **var olmayan** bir
 * alan. Marka yalnızca tip düzeyinde yaşıyor, yani şema nesnesine hiçbir şey
 * eklemiyor ve Drizzle'ın davranışını değiştirmiyor. `is_master = true` gibi bir
 * **sütun** yerine bunun seçilme sebebi ROADMAP Faz 3'te yazılı: hiçbir şeyin
 * tüketmediği bir bayrak bir temennidir (Faz 2 §5 **D3**).
 */
declare const MASTER_BRAND: unique symbol;

/** Master World'e ait, yazılamaz bir tablo. */
export type MasterTable<T extends PgTable = PgTable> = T & {
  readonly [MASTER_BRAND]: true;
};

/**
 * Bir Drizzle tablosunu master olarak işaretler.
 *
 * Çalışma zamanında **kimlik fonksiyonu** — aynı nesneyi döner. Tek işi tipi
 * daraltmak. Şema dosyaları tabloyu bununla sararak tanımlar:
 *
 * ```ts
 * export const countries = masterTable(pgTable('countries', { … }));
 * ```
 *
 * ⚠️ **Sarmayı unutmak sessiz bir delik açar** — işaretlenmemiş bir tablo
 * yazılabilir kalır ve tip sistemi bunu göremez (görecek bir şey yoktur).
 * O boşluğu `arch:check`'in `master-table-marking` kuralı kapatıyor:
 * `packages/db/src/schema/` altındaki her `pgTable(...)` çağrısı `masterTable(...)`
 * ile sarılmış olmalı, yoksa gate kırılır.
 */
export function masterTable<T extends PgTable>(table: T): MasterTable<T> {
  return table as MasterTable<T>;
}

/**
 * Yazma imzalarında kullanılan reddedici.
 *
 * Master bir tablo verildiğinde parametre tipi `never` olur ve **hiçbir değer**
 * ona atanamaz — yani çağrı derlenmez. Master olmayan tabloda `T`'ye düşer ve
 * normal çalışır.
 */
export type RejectMaster<T> = T extends { readonly [MASTER_BRAND]: true } ? never : T;

/** Bir tablonun master olup olmadığını tip düzeyinde sorar (testler için). */
export type IsMasterTable<T> = T extends { readonly [MASTER_BRAND]: true } ? true : false;
