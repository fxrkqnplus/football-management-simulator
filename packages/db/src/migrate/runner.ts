/**
 * Migration koşucusu — `up` ve `down`.
 *
 * **Neden kendi koşucumuz var:** `drizzle-orm`'un `migrate()`'i yalnızca İLERİ
 * gidiyor ve `drizzle-kit` `down` migration **üretmiyor** (Faz 3.0'da ölçüldü,
 * `docs/spec/01-database.md` §3.0). Kabul kriteri ikisini de istiyor.
 *
 * Bu dosya bilerek İNCE: karar veren her şey saf katmanda (`plan.ts`, `loss.ts`,
 * `journal.ts`). Buradaki tek iş, o kararları bir işlem içinde uygulamak.
 */
import type { Logger } from '@fms/shared';
import { DomainError } from '@fms/shared';

import type { SqlExecutor } from './executor.js';
import { isRollbackSignal, RollbackSignal } from './executor.js';
import { orderJournalEntries, parseMigrationJournal } from './journal.js';
import type { LossReport, SchemaState, TableState } from './loss.js';
import { computeLoss, summarizeLoss } from './loss.js';
import type { AppliedMigration } from './plan.js';
import { assertAppliedConsistent, planDown, planUp } from './plan.js';

/**
 * Takip tablosu KENDİ ŞEMASINDA durur — `public` değil.
 *
 * İki sebep. ① **Tavuk-yumurta:** takip tablosunu bir migration yaratamaz, çünkü o
 * migration'ın kendisi takip edilemez. Koşucu onu kendisi kurar (`IF NOT EXISTS`),
 * ve bu bir migration DEĞİLDİR — altyapıdır, şema değil. ② **3.2b'yi mümkün kılar:**
 * round-trip kanıtı `public` şemasını drizzle'ın `meta/NNNN_snapshot.json`
 * dosyasıyla karşılaştıracak. Takip tablosu `public`'te olsaydı her karşılaştırmada
 * elle dışlanması gerekirdi ve o dışlama bir gün unutulurdu.
 */
const META_SCHEMA = 'fms_meta';
const META_TABLE = 'migrations';

/** Koşucunun diskten okuduğu şeyler. Dosya sistemi buraya sızmaz. */
export interface MigrationSource {
  readJournal(): Promise<string>;
  /** İleri yönlü SQL. */
  readUp(tag: string): Promise<string>;
  /** Geri alma SQL'i. Dosya yoksa `null` — koşucu bunu HATA sayar. */
  readDown(tag: string): Promise<string | null>;
  /** İleri SQL'in SHA-256'sı; uygulanmış dosya değişti mi denetimi için. */
  hashUp(tag: string): Promise<string>;
}

export interface RunnerOptions {
  readonly executor: SqlExecutor;
  readonly source: MigrationSource;
  readonly logger: Logger;
}

export interface UpResult {
  readonly applied: readonly string[];
}

export interface DownResult {
  readonly reverted: readonly string[];
  readonly loss: LossReport;
  /** `true` ise hiçbir şey kalıcı olmadı (kuru çalıştırma). */
  readonly dryRun: boolean;
}

export interface DownOptions {
  /** Kaç migration geri alınacak. Varsayılanı YOK — niyet açıkça yazılır. */
  readonly steps: number;
  /**
   * Kuru çalıştırma: geri alma gerçekten uygulanır, etkisi ölçülür, sonra işlem
   * geri alınır. Rapor gerçek veriye dayanır, hiçbir şey kaybolmaz.
   */
  readonly dryRun?: boolean;
  /**
   * ÖLÇÜLEN veri kaybını kabul et.
   *
   * Verilmezse ve kayıp ölçülürse koşucu işlemi geri alır ve fırlatır. Kayıp
   * yoksa bu bayrağa gerek yok — boş bir tabloyu düşüren `down` engellenmez
   * (gerekçe: `loss.ts` başlığı).
   */
  readonly allowDataLoss?: boolean;
}

function quoteLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function quoteIdent(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

async function ensureMetaTable(executor: SqlExecutor): Promise<void> {
  await executor.run(`
    CREATE SCHEMA IF NOT EXISTS ${quoteIdent(META_SCHEMA)};
    CREATE TABLE IF NOT EXISTS ${quoteIdent(META_SCHEMA)}.${quoteIdent(META_TABLE)} (
      "tag"        text        PRIMARY KEY,
      "idx"        integer     NOT NULL UNIQUE,
      "hash"       text        NOT NULL,
      "applied_at" timestamptz NOT NULL DEFAULT now()
    );
  `);
}

interface AppliedRow {
  readonly tag: string;
  readonly idx: number | string;
  readonly hash: string;
}

async function readApplied(executor: SqlExecutor): Promise<readonly AppliedMigration[]> {
  const rows = await executor.rows<AppliedRow>(
    `SELECT "tag", "idx", "hash" FROM ${quoteIdent(META_SCHEMA)}.${quoteIdent(META_TABLE)} ORDER BY "idx" ASC`,
  );
  // Sayısal sütunlar sürücüden dizge olarak gelebilir — 3.2a'da ölçüldü
  // (`bigint`/`numeric` ikisinde de `string`). Çevirim tek yerde yapılır.
  return rows.map((row) => ({ tag: row.tag, idx: Number(row.idx), hash: row.hash }));
}

/**
 * Uygulanmış migration'ların ileri SQL hash'lerini toplar.
 *
 * Dosya okunamıyorsa sessizce atlanır ve `assertAppliedConsistent` bunu
 * `migration.appliedFileMissing` tipli hatasına çevirir — yani sessiz `catch`
 * değil, **sorumluluğun devri** (CLAUDE.md §1.3'ün yasakladığı şey işlenmeyen
 * hata, devredilen hata değil).
 */
async function collectHashes(
  source: MigrationSource,
  applied: readonly AppliedMigration[],
): Promise<Map<string, string>> {
  const hashes = new Map<string, string>();
  for (const record of applied) {
    try {
      hashes.set(record.tag, await source.hashUp(record.tag));
    } catch {
      hashes.delete(record.tag);
    }
  }
  return hashes;
}

/**
 * `public` şemasının o andaki hâli: tablolar, sütunlar, satır sayıları.
 *
 * Satır sayımı `count(*)` ile yapılıyor. `pg_class.reltuples` **tahmindir** ve bir
 * işlem içinde henüz `ANALYZE` görmemiş tabloda yanlış değer verir; kayıp raporu
 * tahmine dayanamaz (D1).
 */
async function captureSchemaState(executor: SqlExecutor): Promise<SchemaState> {
  const tables = await executor.rows<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name`,
  );

  const state: TableState[] = [];
  for (const { table_name: table } of tables) {
    const columns = await executor.rows<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${quoteLiteral(table)}
        ORDER BY ordinal_position`,
    );
    const counted = await executor.rows<{ n: number | string }>(
      `SELECT count(*)::bigint AS n FROM "public".${quoteIdent(table)}`,
    );
    state.push({
      table,
      columns: columns.map((column) => column.column_name),
      rowCount: Number(counted[0]?.n ?? 0),
    });
  }
  return state;
}

/** `up`/`down` öncesi ortak hazırlık: meta tablo, journal, tutarlılık. */
async function prepare({ executor, source }: Pick<RunnerOptions, 'executor' | 'source'>): Promise<{
  ordered: ReturnType<typeof orderJournalEntries>;
  applied: readonly AppliedMigration[];
}> {
  await ensureMetaTable(executor);
  const journal = parseMigrationJournal(await source.readJournal());
  const ordered = orderJournalEntries(journal);
  const applied = await readApplied(executor);
  const hashes = await collectHashes(source, applied);
  assertAppliedConsistent(applied, ordered, (tag) => hashes.get(tag));
  return { ordered, applied };
}

/**
 * Bekleyen migration'ları sırayla uygular.
 *
 * Her migration **kendi işleminde** koşar: Postgres'te DDL işlemsel olduğu için
 * yarıda kalan bir migration kısmi şema bırakmaz. Takip satırı **aynı işlemde**
 * yazılır — ayrı olsaydı "uygulandı ama kaydedilmedi" penceresi doğardı ve bir
 * sonraki `up` aynı migration'ı ikinci kez uygulamayı denerdi.
 *
 * İdempotenslik buradan gelir: uygulanmış olan `planUp` tarafından zaten elenir,
 * yani ikinci çağrı hiçbir şey yapmaz.
 */
export async function migrateUp({ executor, source, logger }: RunnerOptions): Promise<UpResult> {
  const { ordered, applied } = await prepare({ executor, source });

  const pending = planUp(ordered, applied);
  if (pending.length === 0) {
    logger.info({ bekleyen: 0 }, 'migration.upNoop');
    return { applied: [] };
  }

  const done: string[] = [];
  for (const migration of pending) {
    const sql = await source.readUp(migration.tag);
    const hash = await source.hashUp(migration.tag);

    await executor.transaction(async (tx) => {
      await tx.run(sql);
      await tx.run(
        `INSERT INTO ${quoteIdent(META_SCHEMA)}.${quoteIdent(META_TABLE)} ("tag", "idx", "hash")
         VALUES (${quoteLiteral(migration.tag)}, ${String(migration.idx)}, ${quoteLiteral(hash)})`,
      );
    });

    done.push(migration.tag);
    logger.info({ tag: migration.tag, idx: migration.idx }, 'migration.upApplied');
  }

  return { applied: done };
}

/**
 * En yeniden başlayarak `steps` kadar migration'ı geri alır.
 *
 * **Tüm adımlar TEK işlemde.** `up`'tan farklı olması bilinçli: "üç adım geri al"
 * denildiğinde ikisinin geri alınıp üçüncüsünün patlaması, istenmeyen bir ara
 * duruma bırakır — kullanıcının hiç talep etmediği bir şema. Ayrıca kuru
 * çalıştırma ancak böyle anlamlı olur: adımlar ayrı işlemlerde olsaydı, ilk adım
 * geri alındıktan sonra ikincisi **uygulanmamış** bir şemaya karşı koşardı ve
 * rapor gerçeği yansıtmazdı.
 *
 * Karar sırası her koşuda aynı: öncesini ölç → geri almaları uygula → sonrasını
 * ölç → kaybı **hesapla** → `allowDataLoss`'a bak. Dosyadaki bir etikete değil
 * (gerekçe: `loss.ts` başlığı).
 */
export async function migrateDown(
  { executor, source, logger }: RunnerOptions,
  options: DownOptions,
): Promise<DownResult> {
  const { applied } = await prepare({ executor, source });

  const targets = planDown(applied, options.steps);
  const dryRun = options.dryRun ?? false;

  // Geri alma SQL'lerini ÖNCE oku: biri eksikse veritabanına hiç dokunmadan dur.
  // Yarısı geri alınmış bir zincir, hiç geri alınmamış bir zincirden kötüdür.
  const scripts: { readonly tag: string; readonly sql: string }[] = [];
  for (const target of targets) {
    const sql = await source.readDown(target.tag);
    if (sql === null) {
      throw new DomainError({
        message: 'Geri alma dosyası yok — migration geri alınamaz',
        code: 'migration.downScriptMissing',
        context: { tag: target.tag },
      });
    }
    scripts.push({ tag: target.tag, sql });
  }

  let loss: LossReport = { items: [], totalRowsAtRisk: 0, hasStructuralLoss: false };

  try {
    await executor.transaction(async (tx) => {
      const before = await captureSchemaState(tx);

      for (const script of scripts) {
        await tx.run(script.sql);
        await tx.run(
          `DELETE FROM ${quoteIdent(META_SCHEMA)}.${quoteIdent(META_TABLE)} WHERE "tag" = ${quoteLiteral(script.tag)}`,
        );
      }

      const after = await captureSchemaState(tx);
      loss = computeLoss(before, after);

      if (loss.hasStructuralLoss && options.allowDataLoss !== true) {
        throw new DomainError({
          message: 'Geri alma veri kaybettirir — açıkça izin verilmedi',
          code: 'migration.downWouldLoseData',
          context: {
            adimlar: scripts.map((script) => script.tag),
            ozet: summarizeLoss(loss),
            etkilenenSatir: loss.totalRowsAtRisk,
          },
        });
      }

      if (dryRun) throw new RollbackSignal();
    });
  } catch (error) {
    if (!isRollbackSignal(error)) throw error;
    // Kuru çalıştırma: işlem geri alındı, ölçüm elimizde.
  }

  const reverted = scripts.map((script) => script.tag);
  logger.info(
    { adimlar: reverted, kuru: dryRun, kayip: summarizeLoss(loss) },
    dryRun ? 'migration.downDryRun' : 'migration.downReverted',
  );

  return { reverted, loss, dryRun };
}
