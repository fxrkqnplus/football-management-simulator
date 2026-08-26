/**
 * Şemanın DERİN durumu — round-trip kanıtının karşılaştırdığı şey.
 *
 * `runner.ts`'teki `captureSchemaState` bilerek SIĞ: kayıp ölçümü için
 * tablo + sütun adı + satır sayısı yetiyordu. Round-trip bundan fazlasını ister —
 * `down`/`up` çevrimi tabloyu geri getirip **tipini** değiştirebilir, `NOT NULL`ı
 * düşürebilir, `ON DELETE` davranışını kaybedebilir. Sığ bir karşılaştırma bunların
 * hiçbirini görmez ve yeşil kalır (D3).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * KARAR (Faz 3.2b): SEQUENCE TANIMI ŞEMADIR, SEQUENCE KONUMU VERİDİR.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `serial` bir sütun tipi değil, kısayol: Postgres `integer NOT NULL DEFAULT
 * nextval('<tablo>_<sütun>_seq')` üretir **ve ayrı bir sequence yaratır**.
 * `DROP TABLE` o sequence'ı da düşürür, `CREATE TABLE` yenisini kurar.
 *
 * Ölçüldü (Faz 3.2b, gerçek PG 18.6): üç satır yazıldıktan sonra
 *
 *   çevrim öncesi:  last_value = 3, is_called = t
 *   çevrim sonrası: last_value = 1, is_called = f
 *
 * ama sequence'ın **tanımı** (ad, tip, start, min, max, increment, cycle)
 * **birebir aynı** kaldı.
 *
 * **Bu yüzden `last_value`/`is_called` karşılaştırmaya GİRMİYOR.** Sebep tercih
 * değil sınıflandırma: bu iki alan her `INSERT`te değişiyor, yani DDL'in değil
 * **verinin** fonksiyonu. Kabul kriteri migration doğruluğunu soruyor ve satır
 * kaybını zaten kabul ediyoruz (`loss.ts`); sequence konumu tam olarak aynı sınıf.
 *
 * Karşılaştırmaya sokulsaydı test **yalnızca hiç veri yazılmamışken** geçerdi —
 * yani kriterin *"veri yaz"* adımını sabote ederdi. Kayıp bir kanıt değil, yanlış
 * bir kanıt üretirdi.
 *
 * ⚠️ Dışlama **sessiz değil**: `SequenceFacts` konumu taşımıyor ama entegrasyon
 * testi çevrim öncesi/sonrası `last_value`ı **okuyup raporluyor**. Dışlanan şeyin
 * ölçülmemesi ile ölçülüp karşılaştırılmaması ayrı şeyler.
 */

export interface ColumnFacts {
  readonly name: string;
  readonly position: number;
  /** `information_schema.columns.data_type` — `serial` değil, `integer`. */
  readonly dataType: string;
  readonly maxLength: string | null;
  readonly numericPrecision: string | null;
  readonly numericScale: string | null;
  readonly nullable: boolean;
  /** `nextval('countries_id_seq'::regclass)`, `now()`, veya `null`. */
  readonly columnDefault: string | null;
}

/**
 * Bir kısıt — `pg_get_constraintdef()` çıktısıyla birlikte.
 *
 * Tanımı elle parçalamak yerine Postgres'in kendi metinsel gösterimi kullanılıyor:
 * `FOREIGN KEY (x) REFERENCES y(z) ON DELETE CASCADE` tek dizgede hem sütunları
 * hem **`ON DELETE` davranışını** taşıyor. Kabul kriteri 3 (*"tüm yabancı anahtarlar
 * ve `ON DELETE` davranışları tanımlı"*) 3.9'da bu alan üzerinden doğrulanacak.
 *
 * ⚠️ PostgreSQL 17+ `NOT NULL` kısıtlarını da `pg_constraint`te tutuyor
 * (`contype = 'n'`) — ölçüldü. Yani bu liste `countries_key_not_null` gibi
 * girdiler de içeriyor ve bu istenen bir şey: `NOT NULL` kaybı ayrıca aranmadan
 * yakalanıyor.
 */
export interface ConstraintFacts {
  readonly name: string;
  /** `p` birincil, `f` yabancı, `u` benzersiz, `c` check, `n` not-null. */
  readonly type: string;
  readonly definition: string;
}

export interface IndexFacts {
  readonly name: string;
  /** `pg_get_indexdef()` — ifade indeksleri ve `COLLATE` dahil. */
  readonly definition: string;
}

export interface TableFacts {
  readonly name: string;
  readonly columns: readonly ColumnFacts[];
  readonly constraints: readonly ConstraintFacts[];
  readonly indexes: readonly IndexFacts[];
}

/** Sequence'ın TANIMI — konumu (`last_value`) bilerek yok, başlıktaki karar. */
export interface SequenceFacts {
  readonly name: string;
  readonly dataType: string;
  readonly startValue: string;
  readonly minimumValue: string;
  readonly maximumValue: string;
  readonly increment: string;
  readonly cycle: string;
}

export interface SchemaFacts {
  readonly tables: readonly TableFacts[];
  readonly sequences: readonly SequenceFacts[];
}

/** Tek bir fark. `path` insan tarafından okunacak kadar açık tutulur. */
export interface SchemaDifference {
  readonly path: string;
  readonly before: string | null;
  readonly after: string | null;
}
