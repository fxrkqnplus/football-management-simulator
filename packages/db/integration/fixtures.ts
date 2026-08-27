/**
 * Entegrasyon testlerinin ORTAK fixture'ları.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * NEDEN VAR — ölçülmüş bir bedelden doğdu (Faz 3.4)
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `0001` `countries`e sekiz sütun ekledi, sekizinin altısı `NOT NULL`. O anda
 * **üç ayrı entegrasyon dosyasındaki** `INSERT INTO "countries" (…)` satırları
 * bir anda geçersizleşti ve `pnpm test:db` 14 test birden kırıldı. Satırlar
 * birbirinin kopyasıydı — yani tek bir gerçeğin üç yerde yaşayan üç kopyası.
 *
 * `PROJECT_MEMORY.md` günlük #23'ün kuralı: *"bir düzeltme, hatanın görüldüğü
 * yeri değil SINIFININ geçtiği her yeri kapsar"*. Burada bir adım öteye
 * gidiliyor: sınıf tek bir yere indiriliyor ki bir dahaki sefere üç yer
 * olmasın. `0002` yeni bir `NOT NULL` sütun eklediğinde düzeltilecek tek yer
 * bu dosya olacak.
 *
 * ⚠️ Bu dosya `.itest.ts` DEĞİL — Vitest'in `integration/**\/*.itest.ts` deseni
 * onu bir test dosyası olarak toplamaz. `tsconfig.json` `integration/**\/*`
 * kapsadığı için tip denetiminin İÇİNDE, `tsconfig.build.json` `integration`ı
 * dışladığı için `dist/`in DIŞINDA.
 */
import { createFileMigrationSource } from '../src/migrate/file-source.js';
import { orderJournalEntries, parseMigrationJournal } from '../src/migrate/journal.js';

const quote = (value: string): string => `'${value.replace(/'/g, "''")}'`;

/**
 * `countries` satırı — yalnızca sınanan alanlar dışarıdan veriliyor.
 *
 * Geri kalanı geçerli bir varsayılan alıyor: bir negatif testte reddin sebebi
 * **tek** olmalı, yoksa test kendi fixture'ının eksikliğini ölçer (3.2b
 * günlük #17).
 */
export interface CountryFixture {
  readonly key: string;
  readonly code: string;
  readonly nameKey?: string;
  readonly source?: string;
  readonly externalIds?: string;
  readonly confederation?: string;
  readonly flagAssetId?: string | null;
  readonly footballLevel?: number;
  readonly uefaCoefficient?: string;
  readonly currencyCode?: string;
  readonly workPermitRuleKey?: string;
}

/** `countries`in TÜM `NOT NULL` sütunlarını dolduran tek `INSERT` üretir. */
export function countryInsertSql(rows: readonly CountryFixture[]): string {
  const values = rows
    .map((row) =>
      [
        quote(row.key),
        quote(row.code),
        quote(row.nameKey ?? `country.${row.key}`),
        quote(row.source ?? 'pack'),
        `${quote(row.externalIds ?? '{}')}::jsonb`,
        quote(row.confederation ?? 'UEFA'),
        row.flagAssetId == null ? 'NULL' : quote(row.flagAssetId),
        String(row.footballLevel ?? 50),
        quote(row.uefaCoefficient ?? '10.000'),
        quote(row.currencyCode ?? 'EUR'),
        quote(row.workPermitRuleKey ?? 'none'),
      ].join(','),
    )
    .join('),\n      (');

  return `
    INSERT INTO "countries"
      ("key","code","name_key","source","external_ids","confederation","flag_asset_id",
       "football_level","uefa_coefficient","currency_code","work_permit_rule_key")
    VALUES
      (${values})
  `;
}

/**
 * Gerçek migration zincirinin etiketleri — journal'dan **okunuyor**.
 *
 * Koşucunun davranışını sınayan testler (`runner.itest.ts`) "hangi etiketler
 * uygulandı" diye soruyor; bunu elle yazılmış bir listeye bağlamak, her yeni
 * migration'da alakasız testleri kırar ve o kırılma hiçbir şey öğretmez.
 * Journal burada *test edilen şey* değil, **girdi**.
 *
 * ⚠️ Şema İÇERİĞİNİ sınayan testler (`round-trip`, `schema-constraints`) bunu
 * kullanmaz: orada beklenen tablo ve sütun adları AÇIKÇA yazılır, çünkü test
 * edilen şey tam olarak onlardır.
 */
export async function chainTags(drizzleDir: string): Promise<readonly string[]> {
  const source = createFileMigrationSource(drizzleDir);
  const journal = parseMigrationJournal(await source.readJournal());
  return orderJournalEntries(journal).map((entry) => entry.tag);
}
