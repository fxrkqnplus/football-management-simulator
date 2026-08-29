/**
 * `ON DELETE` POLİTİKASI — bir LİSTE değil, bir KURAL.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * NEDEN VAR — elle yazılmış envanter İKİ KEZ kırıldı
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `integration/schema-constraints.itest.ts` on iki FK'yı adıyla sayan bir liste
 * taşıyor ve o liste iki kez güncellenmeyi unuttu: `0002` beş tablo getirdi
 * (`PROJECT_MEMORY.md` günlük #30), `0003` üç tablo getirdi (#36). Faz 4 **üç
 * ileri FK** daha ekleyecek (`federations.president_person_id` ·
 * `clubs.chairman_person_id` · `referees.person_id`) artı `people`/sözleşme/
 * personel tabloları — üçüncü kırılma zaten yolda.
 *
 * ROADMAP 3.9 *"programatik doğrulanır (gözle sayılmaz)"* diyor. ⚠️ Kaynağı
 * `pg_constraint`ten `information_schema`'ya çevirmek bunu **sağlamaz** — mevcut
 * test zaten katalogdan okuyor; değişen tek şey adres olurdu. Gerçek yükseltme
 * **beklenen davranışı kuraldan TÜRETMEK**: o zaman Faz 4'ün ekleyeceği FK'lar
 * hiçbir liste güncellenmeden denetlenir.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * SINIFLANDIRMA — `spec/01` §3.1.2 ③ + ⑧, ve HER İKİ GİRDİ DE KATALOGDAN
 * ────────────────────────────────────────────────────────────────────────────
 *
 * ③ iki sınıf tanımlıyor (uydu → CASCADE · bağımsız varlık → RESTRICT) ve
 * ayracı §3.1.0'ın `key` sütunu. ⑧ üçüncü sınıfı ekliyor: `kit_templates`
 * *"`key` taşımıyor ama hiçbir şeyin uydusu da değil — **sahipsiz** bir sözlük
 * tablosu"*.
 *
 * ⚠️ **"Sahipsiz" ölçülebilir bir şey ve bu kuralın can alıcı noktası.** Bir
 * uydunun tanımı gereği sahibine bir FK'sı vardır; sözlük tablosunun **giden
 * FK'sı yoktur**. Yani üçüncü sınıf elle bakım gerektiren bir listeden değil,
 * katalogdan çıkıyor:
 *
 *   `key` var                      → `independent`
 *   `key` yok + giden FK var       → `satellite`
 *   `key` yok + giden FK yok       → `dictionary`
 *
 * ────────────────────────────────────────────────────────────────────────────
 * FAZ 4.2 — ÜÇÜNCÜ OLGU (`SET NULL`) ve SIRANIN ÖLÇÜLMÜŞ OLMASI
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Faz 3'te kural 12 FK'da **0 uyumsuzlukla** çalıştı, ama o 12 FK'nın hepsinde
 * bir uydunun FK'sı **sahibini** gösteriyordu. Faz 4 bu tesadüfü bozuyor:
 * `players.club_id` (*"null = serbest oyuncu"*), `staff.club_id`,
 * `managers.club_id`, `people.second_nationality_country_id` — hepsi bir
 * **referans**, sahiplik değil. İki olgulu kural bunlara **CASCADE** derdi:
 * *bir kulüp silinince oyuncuları da silinirdi.*
 *
 * Ölçüldü (Faz 4.0, kâğıt üstünde, migration yazılmadan): bugünkü kural Faz 4'ün
 * 20 planlanan FK'sında **7 veri kaybettiren cevap** üretiyor. Üçüncü olgu
 * (`allSourceColumnsNullable`) eklenince **20/20**, 0 veri kaybı.
 *
 * ⚠️ **SIRA BİR TERCİH DEĞİL, ÖLÇÜM SONUCU:**
 *
 *   ① hedef `dictionary`              → RESTRICT
 *   ② kaynak `independent`            → RESTRICT      ← ③'TEN ÖNCE
 *   ③ FK'nın bütün sütunları nullable → SET NULL
 *   ④ kaynak `satellite` (NOT NULL)   → CASCADE
 *
 * ③'ü ①'in hemen ardına koymak (planda **V1**) Faz 3'ün **üç** FK'sını bozuyor
 * (`competitions.country_id`, `clubs.competition_id`, `clubs.stadium_id` —
 * üçü de nullable, üçü de gerçekte RESTRICT): 12/12 → **9/12**. Regresyon kümesi
 * `fk-policy.test.ts` ve `schema-constraints.itest.ts`te; sıra değişirse ikisi
 * de kırılır. **Erken dönüşlerin sırası bu yüzden okunabilirlik için yeniden
 * düzenlenmez.**
 *
 * ⚠️ **Nullability tanımı BURADA DEĞİL** — `schema-state/foreign-key-nullability.ts`
 * tek yerde türetiyor ve iki tüketicisi var (ER kardinalitesi *"herhangi biri"*,
 * bu kural *"hepsi"* okur). Bu modül onu **önceden hesaplanmış bir olgu** olarak
 * alıyor ve katalogdan hiçbir şey okumuyor — saf kalıyor.
 *
 * **Ölçüldü (PG 18.6, 11 tablo):** `key` yok + giden FK yok koşulunu sağlayan
 * **tek** tablo `kit_templates`. Yani türetme, ⑧'in elle adlandırdığı tabloyu
 * hiçbir yerde adı geçmeden buluyor.
 *
 * ⚠️ **DÜZELTME (Faz 4.1):** bu paragraf *"Faz 4'ün `injury_types` /
 * `staff_roles` tabloları aynı koşulu sağlayacak"* diyordu ve **yarısı yanlış
 * çıktı**. `staff_roles` **açılmıyor** — `spec/01` `staff.role`u 12 değerlik
 * satır içi kapalı küme yazıyor, yani §3.1.2 ②'nin **CHECK**'i yeter; satırları
 * yalnızca bir etiket taşıyor. `injury_types` ise satırlarında **veri** taşıyor
 * (süre aralığı, ciddiyet) → gerçek sözlük tablosu, ama **Faz 12**'ye taşındı:
 * tek FK kaynağı `injuries` ve o save-scoped, yani bu kuralın söyleyecek bir
 * şeyi ancak orada oluyor. Yeni ayraç: *"kapalı küme **etiket** mi, **veri
 * taşıyan satır** mı?"* (SAPMA-030; desen **F3** — bir kuralın örneklerinden
 * çıkarılan genelleme, ölçülene kadar bir tahmindir.)
 *
 * ⚠️ **Bu bir liste DEĞİL ama listeyi de SİLMİYOR.** İkisi farklı şey söylüyor:
 * liste *"bugün şunlar var"*, kural *"olması gereken bu"*. Yalnızca kural
 * kalsaydı, kuralın kendisi yanlış olduğunda hiçbir şey ötmezdi — 3.3'te birim
 * testi + `arch:check` kanaryası için verilen kararın aynısı.
 */

/** Bir tablonun `ON DELETE` sınıfı. `spec/01` §3.1.2 ③ + ⑧. */
export const TABLE_CLASSES = ['independent', 'satellite', 'dictionary'] as const;

export type TableClass = (typeof TABLE_CLASSES)[number];

/** Bir `ON DELETE` davranışı. */
export const DELETE_ACTIONS = ['CASCADE', 'RESTRICT', 'SET NULL', 'NO ACTION'] as const;

export type DeleteAction = (typeof DELETE_ACTIONS)[number];

/**
 * Sınıflandırma için katalogdan okunan iki olgu.
 *
 * ⚠️ Ad `TableFacts` DEĞİL: `schema-state/types.ts` o adı introspection
 * olguları için kullanıyor ve `@fms/db` barrel'ı ikisini birden dışa aktarıyor
 * — çakışma `pnpm typecheck`i **TS2308** ile kırdı. İki farklı kavram, iki
 * farklı ad.
 */
export interface TableClassFacts {
  /** §3.1.0'ın paket eşleme anahtarı — `key` sütunu var mı. */
  readonly hasKeyColumn: boolean;
  /** Bu tablodan ÇIKAN yabancı anahtar var mı ("sahibi var mı"). */
  readonly hasOutgoingForeignKey: boolean;
}

/** Bir yabancı anahtarın kaynak ve hedef tablosu. */
export interface ForeignKeyFacts {
  readonly name: string;
  readonly sourceTable: string;
  readonly targetTable: string;
  /**
   * Kaynak sütunların **hepsi** nullable mı — yani `ON DELETE SET NULL`
   * uygulanabilir mi (Faz 4.2'de eklendi, ÜÇÜNCÜ olgu).
   *
   * ⚠️ *"Herhangi biri nullable"* DEĞİL. PostgreSQL `SET NULL`da FK'nın
   * **bütün** sütunlarını `NULL` yapar; biri `NOT NULL` ise silme çalışma
   * zamanında reddedilir. Ayrım ve tek tanım:
   * `schema-state/foreign-key-nullability.ts` → `allNullable`.
   *
   * ⚠️ Bu modül katalogdan **okumaz** — `hasKeyColumn` ve
   * `hasOutgoingForeignKey` gibi bu da **önceden hesaplanmış bir olgudur**.
   * Kural saf kalıyor; okumayı çağıran taraf yapıyor.
   */
  readonly allSourceColumnsNullable: boolean;
}

/**
 * Bir tabloyu `spec/01` §3.1.2 ③ + ⑧'e göre sınıflandırır.
 *
 * Sıra bağlayıcı: `key` denetimi **önce** gelir. `key` taşıyan bir tablonun
 * giden FK'sı olması onu uydu yapmaz — `clubs` üç FK taşıyor ve yine de
 * bağımsız bir varlık (pakette kendi kaydı var).
 */
export function classifyTable(facts: TableClassFacts): TableClass {
  if (facts.hasKeyColumn) return 'independent';
  return facts.hasOutgoingForeignKey ? 'satellite' : 'dictionary';
}

/**
 * Bir yabancı anahtarın taşıması GEREKEN `ON DELETE` davranışını türetir.
 *
 * ⚠️ **Hedef denetimi ÖNCE gelir ve bu ⑧'in tam olarak var olma sebebi.**
 * `club_kits` bir uydu (kaynak sınıfı `satellite`) — ③ körlemesine
 * uygulansaydı `club_kits.template_id` **CASCADE** alırdı ve bir forma şablonu
 * silindiğinde kulübün forma satırı **alakasız bir sebeple** yok olurdu. Hedef
 * bir sözlük tablosuysa davranış kaynağın sınıfından bağımsız **RESTRICT**'tir.
 *
 * `dictionary` bir **kaynak** olarak gelemez: sözlük tablosunun tanımı gereği
 * giden FK'sı yoktur, yani ondan çıkan bir FK yoktur. Yine de sessiz bir
 * varsayılana düşülmüyor — vaka açıkça yazılıyor ve birim testi onu sabitliyor.
 */
export function expectedDeleteAction(
  foreignKey: ForeignKeyFacts,
  classOf: (table: string) => TableClass,
): DeleteAction {
  // ① HEDEF SÖZLÜK → RESTRICT. Kaynağın sınıfından bağımsız (⑧).
  if (classOf(foreignKey.targetTable) === 'dictionary') return 'RESTRICT';

  const sourceClass = classOf(foreignKey.sourceTable);

  // ② KAYNAK BAĞIMSIZ VARLIK → RESTRICT.
  //
  // ⚠️ BU DENETİM ③'TEN ÖNCE GELMEK ZORUNDA VE SIRA ÖLÇÜLEREK BULUNDU (4.0).
  // ③'ü buraya, ①'in hemen ardına koyan varyant (planda "V1") Faz 3'ün ÜÇ
  // gerçek FK'sını bozuyor — üçü de nullable ve üçü de bağımsız bir varlıktan
  // çıkıyor, yani `SET NULL` alırlardı:
  //     competitions.country_id · clubs.competition_id · clubs.stadium_id
  // Gerçek davranışları RESTRICT. Ölçüm: V1 → 9/12, V3 (bu sıra) → 12/12.
  //
  // Sezgi tersini söylüyor ("nullable ise SET NULL"), ve bu F3'ün ölçülmüş bir
  // örneği: bir kural örneklerinden geriye okunursa yanlış öğrenilir. Bağımsız
  // bir varlığın nullable FK'sı "sahiplik" değil "isteğe bağlı referans"tır ve
  // silen tarafın onu ELE ALMASI beklenir — sessizce boşaltılması değil.
  if (sourceClass === 'independent') return 'RESTRICT';

  // ③ FK'NIN BÜTÜN SÜTUNLARI NULLABLE → SET NULL (Faz 4.2'de eklendi).
  //
  // Buraya ulaşan FK bir UYDUDAN çıkıyor ve nullable — yani bağ "sahiplik"
  // değil bir REFERANS. `spec/01` bunu açıkça yazıyor: `players.clubId` için
  // *"null = serbest oyuncu"*. CASCADE verilseydi bir kulüp silindiğinde
  // oyuncuları da silinirdi; doğru davranış onları serbest bırakmak.
  if (foreignKey.allSourceColumnsNullable) return 'SET NULL';

  // ⚠️ `independent` burada ARTIK TİPTE YOK — ②'nin erken dönüşü onu daralttı
  // ve `case 'independent'` yazmak TS2678 veriyor. Yani sıranın bağlayıcılığı
  // yalnızca yorumda değil, TİP SEVİYESİNDE de görünür: ②'yi ③'ün altına
  // taşımak derlemeyi kırar. Ücretsiz gelen bir nöbetçi.
  switch (sourceClass) {
    // ④ KAYNAK UYDU + NOT NULL → CASCADE. Kimliği sahibinin kimliğidir.
    case 'satellite':
      return 'CASCADE';
    case 'dictionary':
      // Ulaşılamaz olması BEKLENEN durum, ama sessizce bir davranış uydurmak
      // yerine en kısıtlayıcı olanı dönüyoruz: bir sözlük tablosundan çıkan FK
      // ortaya çıkarsa, sınıflandırmanın kendisi gözden geçirilmelidir.
      return 'RESTRICT';
  }
}
