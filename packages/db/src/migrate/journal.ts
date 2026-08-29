/**
 * Drizzle migration journal'ının okunması ve doğrulanması.
 *
 * `drizzle-kit generate` her migration için üç şey üretir (Faz 3.0'da ölçüldü,
 * `docs/spec/01-database.md` §3.0):
 *   drizzle/NNNN_<tag>.sql        — ileri yönlü SQL
 *   drizzle/meta/NNNN_snapshot.json — o adımdan SONRAKİ tam şema durumu
 *   drizzle/meta/_journal.json      — sıralama
 *
 * Sıralamanın tek doğruluk kaynağı journal'dır: dosya adları alfabetik sıralanabilir
 * görünse de bunu varsaymak, `NNNN` biçimi değiştiğinde (drizzle `--prefix` ile
 * `timestamp`/`unix`/`none` da üretebiliyor) sessizce yanlış sıraya düşer.
 *
 * Journal DIŞ GİRDİDİR — diskten okunan, elle düzenlenebilen bir dosya. CLAUDE.md
 * §1.3 gereği Zod ile doğrulanır ve tip şemadan türetilir.
 */
import { ValidationError } from '@fms/shared';
import { z } from 'zod';

/**
 * `tag` biçimi DAR tutuluyor: `0000_snake_case`.
 *
 * İki iş görüyor. ① `drizzle-kit`in ürettiği biçimi sabitler — `--prefix` başka bir
 * şey üretmeye başlarsa journal doğrulaması **kırılır** ve bunu sessizce kabul
 * etmek yerine yüksek sesle durmuş oluruz. ② `tag` takip tablosuna yazılırken SQL
 * dizgesine giriyor; harf/rakam/alt çizgi dışına çıkamayan bir değerin
 * enterpolasyonu güvenlidir. Bu, doğrulamanın **yan** faydası değil, ikinci sebebi:
 * "dış girdi Zod ile doğrulanır" (CLAUDE.md §1.3) tam olarak bunun içindir.
 */
const MIGRATION_TAG_PATTERN = /^[0-9]+_[a-z0-9_]+$/;

const journalEntrySchema = z.object({
  idx: z.number().int().nonnegative(),
  version: z.string().min(1),
  when: z.number().int().nonnegative(),
  tag: z.string().regex(MIGRATION_TAG_PATTERN),
  breakpoints: z.boolean(),
});

const journalSchema = z.object({
  version: z.string().min(1),
  dialect: z.literal('postgresql'),
  entries: z.array(journalEntrySchema),
});

export type MigrationJournalEntry = z.infer<typeof journalEntrySchema>;
export type MigrationJournal = z.infer<typeof journalSchema>;

/**
 * Ham journal metnini ayrıştırır ve doğrular.
 *
 * `idx` sürekliliği ve benzersizliği BURADA denetlenir, koşucuda değil: journal
 * bozuksa sıralama da bozuktur ve o hatayı migration uygulanırken bulmak çok geç
 * olur. `dialect` `postgresql` literal'i olarak sabitlendi — başka bir lehçenin
 * journal'ı buraya girerse üretilen SQL de bize ait değildir.
 */
export function parseMigrationJournal(raw: string): MigrationJournal {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (cause) {
    throw new ValidationError({
      message: 'Migration journal geçerli JSON değil',
      code: 'migration.journalNotJson',
      cause,
    });
  }

  const result = journalSchema.safeParse(json);
  if (!result.success) {
    throw new ValidationError({
      message: 'Migration journal şemaya uymuyor',
      code: 'migration.journalInvalid',
      context: { issue: result.error.issues[0]?.message ?? 'bilinmeyen' },
    });
  }

  const journal = result.data;
  const seenIdx = new Set<number>();
  const seenTag = new Set<string>();

  for (const entry of journal.entries) {
    if (seenIdx.has(entry.idx)) {
      throw new ValidationError({
        message: 'Migration journal aynı idx değerini iki kez taşıyor',
        code: 'migration.journalDuplicateIdx',
        context: { idx: entry.idx },
      });
    }
    if (seenTag.has(entry.tag)) {
      throw new ValidationError({
        message: 'Migration journal aynı tag değerini iki kez taşıyor',
        code: 'migration.journalDuplicateTag',
        context: { tag: entry.tag },
      });
    }
    seenIdx.add(entry.idx);
    seenTag.add(entry.tag);
  }

  return journal;
}

/**
 * Journal girdilerini uygulama sırasına dizer.
 *
 * Dosyadaki sıraya güvenilmez: JSON dizisi elle düzenlenmiş olabilir. `idx`
 * sayısal olarak sıralanır ve **boşluk denetlenir** — 0,1,3 dizisi bir migration'ın
 * silindiğini gösterir ve o durumda `down` zinciri de kopuktur.
 */
export function orderJournalEntries(journal: MigrationJournal): readonly MigrationJournalEntry[] {
  const ordered = [...journal.entries].sort((a, b) => a.idx - b.idx);

  for (const [position, entry] of ordered.entries()) {
    if (entry.idx !== position) {
      throw new ValidationError({
        message: 'Migration journal idx dizisinde boşluk var',
        code: 'migration.journalIdxGap',
        context: { beklenen: position, bulunan: entry.idx, tag: entry.tag },
      });
    }
  }

  return ordered;
}
