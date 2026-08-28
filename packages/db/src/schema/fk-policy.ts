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
 * **Ölçüldü (PG 18.6, 11 tablo):** `key` yok + giden FK yok koşulunu sağlayan
 * **tek** tablo `kit_templates`. Yani türetme, ⑧'in elle adlandırdığı tabloyu
 * hiçbir yerde adı geçmeden buluyor. Faz 4'ün `injury_types` / `staff_roles`
 * tabloları aynı koşulu sağlayacak.
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
  if (classOf(foreignKey.targetTable) === 'dictionary') return 'RESTRICT';

  switch (classOf(foreignKey.sourceTable)) {
    case 'independent':
      return 'RESTRICT';
    case 'satellite':
      return 'CASCADE';
    case 'dictionary':
      // Ulaşılamaz olması BEKLENEN durum, ama sessizce bir davranış uydurmak
      // yerine en kısıtlayıcı olanı dönüyoruz: bir sözlük tablosundan çıkan FK
      // ortaya çıkarsa, sınıflandırmanın kendisi gözden geçirilmelidir.
      return 'RESTRICT';
  }
}
