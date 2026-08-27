/**
 * §3.1.0 VERİ PAKETİ SÜTUN SÖZLEŞMESİ — tek yerde.
 *
 * `docs/spec/01-database.md` §3.1.0 üç sütun istiyor ve sözleşmeyi bilerek
 * **her tabloda tekrarlamıyor**:
 *
 * | Sütun | Tip | Kural |
 * |---|---|---|
 * | `key` | `text NOT NULL` | Paket eşleme anahtarı (slug). Benzersizlik **TABLO BAŞINA** |
 * | `source` | `text NOT NULL` | **CHECK kısıtlı**, serbest metin değil |
 * | `external_ids` | `jsonb NOT NULL DEFAULT '{}'` | Zod ile doğrulanır |
 *
 * **Bu üç sütunu TAŞIYAN tablolar** (pakette kendi kaydı olarak görünen
 * varlıklar): `countries` · `competitions` · `clubs` · `stadiums` · `referees`.
 * **TAŞIMAYAN** (bir sahibine 1:1 bağlı uydular): `club_facilities` ·
 * `club_finances_base` · `club_kits` · `rivalries` · `federations` ·
 * `kit_templates`.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * NEDEN ORTAK BİR MODÜL — beş tabloya kopyalamak yerine
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Sözleşme beş tabloya yayılıyor ve `source`un izinli değer listesi **iki yerde
 * birden** yaşamak zorunda: veritabanı CHECK kısıtında ve TypeScript tipinde.
 * Kopyalansaydı, listeye altıncı bir değer eklendiği gün beş CHECK'in dördü
 * güncellenip biri unutulabilirdi — ve `arch:check` ⑧'in doğuş sebebi tam olarak
 * bu sınıftı (bir kural bir TABLO okuyorsa, tablonun her girdisi kapsanmalı;
 * `PROJECT_MEMORY.md` günlük #54).
 *
 * Burada tek bir `DATA_SOURCES` dizisi hem CHECK ifadesini hem `DataSource`
 * tipini üretiyor: **ayrışamazlar**, çünkü aynı satırdan geliyorlar. Ayrıca
 * entegrasyon testi kısıtın gerçek tanımını `pg_get_constraintdef` ile okuyup bu
 * diziyle karşılaştırıyor — yani eşitlik varsayılmıyor, veritabanından ölçülüyor.
 */
import { sql } from 'drizzle-orm';
import type { AnyPgColumn, CheckBuilder } from 'drizzle-orm/pg-core';
import { check, jsonb, text } from 'drizzle-orm/pg-core';
import { z } from 'zod';

/**
 * Bir varlığın verisinin NEREDEN geldiği.
 *
 * `docs/spec/12-data-packs.md` §17.1: *"her varlık kaydında `source` alanı
 * tutulur"*. Liste kapalıdır — serbest metin olsaydı `'Pack'`, `'packs'`,
 * `'manual'` gibi değerler sessizce girer ve kökeni sorgulanamaz hale getirirdi.
 */
export const DATA_SOURCES = ['pack', 'api', 'wikidata', 'openfootball', 'procedural'] as const;

/** `as const` nesne/dizi tercih edilir, `enum` değil (CLAUDE.md §1.3). */
export type DataSource = (typeof DATA_SOURCES)[number];

/**
 * Dış kimlik eşlemeleri — `docs/spec/12-data-packs.md` §17.3'ün `explicit`
 * stratejisinin taşıyıcısı.
 *
 * ⚠️ **`strictObject` bilinçli.** Gevşek bir nesne `wikidatta` gibi bir yazım
 * hatasını sessizce kabul eder; varlık o sağlayıcıya **hiç bağlanmaz** ve kimse
 * fark etmez. `spec/12` §17.3 bunun bedelini yazıyor: *"yanlış eşleşme =
 * Galatasaray armasının Fenerbahçe'de görünmesi"*. Yeni bir sağlayıcı eklemek
 * buraya tek satır; bir yazım hatasını fark etmek ise imkânsıza yakın.
 */
export const externalIdsSchema = z.strictObject({
  /** Wikidata varlık kimliği: `Q170084`. */
  wikidata: z.string().min(2).optional(),
  /** api-football sayısal kimliği: `645`. */
  apiFootball: z.int().positive().optional(),
  /** Yalnızca eşleme referansı — veri kaynağı değil (`spec/12` §17.3). */
  transfermarkt: z.int().positive().optional(),
});

export type ExternalIds = z.infer<typeof externalIdsSchema>;

/**
 * §3.1.0'ın üç sütununu üretir.
 *
 * **Neden fabrika, paylaşılan bir nesne değil:** Drizzle sütun kurucuları
 * durumludur (`pgTable` onları tabloya bağlar). Aynı nesneyi iki tabloya vermek
 * ikinci tabloda sessiz bir bağlanma hatası doğururdu; her çağrı taze kurucu
 * döndürüyor.
 *
 * `key` `.unique()` alıyor — Drizzle kısıtı `<tablo>_key_unique` diye
 * adlandırıyor, yani benzersizlik **tablo başına** oluyor. Bu, §3.1.0'ın
 * ölçülmüş kararı: arama her zaman *"key'i X olan KULÜBÜ bul"* biçiminde,
 * hiçbir zaman *"key'i X olan ŞEYİ bul"* değil.
 */
export function dataPackColumns() {
  return {
    /** Veri paketi eşleme anahtarı (slug). Benzersizlik TABLO BAŞINA. */
    key: text('key').notNull().unique(),
    /** Kökeni. CHECK kısıtı `sourceCheck()` ile tablo tanımına eklenir. */
    source: text('source').$type<DataSource>().notNull(),
    /** `spec/12` §17.3 eşleme kimlikleri. Boş nesne = eşleme yok. */
    externalIds: jsonb('external_ids').$type<ExternalIds>().notNull().default({}),
  };
}

/**
 * `source` sütununun CHECK kısıtını üretir.
 *
 * İfade `DATA_SOURCES`ten **türetiliyor**, elle yazılmıyor. `sql.raw` burada
 * güvenli: değerler bizim `as const` dizimizden geliyor, dışarıdan gelen hiçbir
 * girdi yok — ve `drizzle-kit generate`in ürettiği SQL'e gömülü **literal**
 * olarak girmesi gerekiyor (parametre yer tutucusu bir DDL dosyasına yazılamaz).
 */
export function sourceCheck(constraintName: string, column: AnyPgColumn): CheckBuilder {
  const literals = DATA_SOURCES.map((value) => `'${value}'`).join(', ');
  return check(constraintName, sql`${column} IN (${sql.raw(literals)})`);
}
