/**
 * ER DİYAGRAMININ NÖBETÇİSİ — `docs/schema/world.md` gerçek şemayla aynı mı?
 *
 * ────────────────────────────────────────────────────────────────────────────
 * NEDEN VAR — 3.1'DE VERİLMİŞ BİR SÖZ
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `docs/schema/world.md` 3.1'de şu cümleyle açıldı: *"3.10'da gerçek şemadan
 * üretilecek ve tablo/FK sayısı programatik olarak karşılaştırılacak."* Bu dosya
 * o cümlenin karşılığı.
 *
 * Gerekçe 3.9'un kendi bulgusu (`PROJECT_MEMORY.md` günlük #43): şemanın zaten
 * **iki** temsili var — Drizzle TS tanımları ve migration SQL'i — ve çalışan
 * veritabanını yalnızca ikincisi kuruyor. Elle çizilmiş bir mermaid **üçüncü**
 * temsil olurdu; üçüncüsünü hiçbir şey denetlemez ve bir sonraki şema
 * değişikliğinde sessizce yalan söylemeye başlardı.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * İKİ AYRI İDDİA — ve ikisi de gerekli
 * ────────────────────────────────────────────────────────────────────────────
 *
 * **① BİREBİR METİN.** Belgedeki blok, canlı katalogdan üretilen metnin
 * **aynısı** mı. En güçlü iddia bu: bir sütunun tipi, `NOT NULL`u, bir FK'nın
 * kardinalitesi değişse belge kırılır.
 *
 * **② MUTLAK SAYI.** Belgedeki metinden **sayılan** tablo ve ilişki sayısı,
 * katalogdan okunan sayıyla ve bugünün bilinen değerleriyle (11 / 12) aynı mı.
 * ⚠️ Tek başına ① yeterli olmazdı: iki taraf da boş olsaydı o da geçerdi — kör
 * kontrol sınıfı (`docs/spec/09-quality-protocol.md` §11.5, ölçülmüş oran 16'da
 * 1). ② o kaçışı kapatıyor, çünkü boş bir diyagram `0 !== 11` verir.
 *
 * ⚠️ **Sayılar KATALOGDAN da okunuyor, yalnızca sabit yazılmıyor.** Sabitler
 * (11 / 12) bugünün ölçülmüş değeri; katalog karşılaştırması ise Faz 4 tablo
 * eklediğinde sabitlerin **güncellenmesi gerektiğini** söyleyen şey. İkisi
 * farklı soruya cevap veriyor: *"belge katalogla uyuşuyor mu"* ve *"katalog
 * beklediğimiz yerde mi"*.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * DİYAGRAM DEĞİŞTİĞİNDE NE YAPILIR
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Yeni bir migration `docs/schema/world.md`'yi bayatlatır ve bu test kırılır.
 * Doğru düzeltme belgeyi elle düzenlemek **değil**: Vitest'in fark çıktısı
 * üretilmiş metnin tamamını gösteriyor, blok o çıktıdan yenilenir. Elle
 * düzenlemek üçüncü temsili geri getirir.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { createNoopLogger } from '@fms/shared';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { SqlExecutor } from '../src/migrate/executor.js';
import { createFileMigrationSource } from '../src/migrate/file-source.js';
import { createPostgresExecutor } from '../src/migrate/postgres-executor.js';
import { migrateUp } from '../src/migrate/runner.js';
import { countErDiagram, extractMermaidBlock, renderErDiagram } from '../src/schema-state/index.js';
import { introspectSchema } from '../src/schema-state/introspect.js';

const logger = createNoopLogger();
const DRIZZLE_DIR = fileURLToPath(new URL('../drizzle', import.meta.url));
const SCHEMA_DOC = fileURLToPath(new URL('../../../docs/schema/world.md', import.meta.url));

/** Bugünün ölçülmüş şema büyüklüğü — Faz 4 bunları güncelleyecek. */
const EXPECTED_TABLE_COUNT = 11;
const EXPECTED_FOREIGN_KEY_COUNT = 12;

let container: StartedPostgreSqlContainer;
let close: () => Promise<void>;
let executor: SqlExecutor;

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:18')
    .withDatabase('fms_test')
    .withUsername('fms')
    .withPassword('fms')
    .start();
  const handle = createPostgresExecutor(container.getConnectionUri());
  executor = handle.executor;
  close = async (): Promise<void> => {
    await handle.close();
  };
  await migrateUp({ executor, source: createFileMigrationSource(DRIZZLE_DIR), logger });
}, 180_000);

afterAll(async () => {
  await close();
  await container.stop();
}, 60_000);

/**
 * Belgeyi okur ve satır sonlarını normalleştirir.
 *
 * ⚠️ Normalleştirme bir gevşetme değil, **kapsam ayrımı**: satır sonu disiplini
 * `.gitattributes`in işi (`* text=auto eol=lf` — gerekçesi orada yazılı) ve
 * hiçbir kural iki yerde denetlenmez (`spec/09` §11.5). Bu testin konusu
 * diyagramın **içeriği**; CRLF'li bir çalışma kopyasında yanlış sebeple
 * kırılması, gerçek bir bozulmayı gizlerdi.
 */
function readSchemaDocument(): string {
  return readFileSync(SCHEMA_DOC, 'utf8').replace(/\r\n/g, '\n');
}

describe('KRİTER 5: `docs/schema/world.md` diyagramı gerçek şemadan üretilmiş', () => {
  it('① belgedeki mermaid bloğu, canlı katalogdan üretilen metnin BİREBİR aynısı', async () => {
    const facts = await introspectSchema(executor);
    const generated = renderErDiagram(facts);
    const documented = extractMermaidBlock(readSchemaDocument());

    expect(documented).toBe(generated);
  });

  it('② belgedeki tablo ve ilişki SAYISI katalogla ve bugünün değerleriyle aynı', async () => {
    const [tableRow] = await executor.rows<{ n: number }>(`
      SELECT count(*)::int AS n
        FROM pg_class c
        JOIN pg_namespace ns ON ns.oid = c.relnamespace
       WHERE ns.nspname = 'public' AND c.relkind = 'r'
    `);
    const [foreignKeyRow] = await executor.rows<{ n: number }>(`
      SELECT count(*)::int AS n
        FROM pg_constraint
       WHERE contype = 'f' AND connamespace = 'public'::regnamespace
    `);

    const catalogTables = tableRow?.n ?? 0;
    const catalogForeignKeys = foreignKeyRow?.n ?? 0;

    // Katalog beklediğimiz yerde mi — boş bir sonucun "uyum" gibi okunmaması için.
    expect(catalogTables).toBe(EXPECTED_TABLE_COUNT);
    expect(catalogForeignKeys).toBe(EXPECTED_FOREIGN_KEY_COUNT);

    // Belge katalogla uyuşuyor mu — sayım BELGE METNİNDEN yapılıyor.
    const counts = countErDiagram(extractMermaidBlock(readSchemaDocument()));
    expect(counts).toEqual({
      entities: catalogTables,
      relationships: catalogForeignKeys,
    });
  });

  /**
   * ⚠️ **NEGATİF TEST — nöbetçinin gerçekten baktığını gösteren tek şey.**
   * Karar ①'in şartı: *"diyagramdan bir tablo sil → test kırılmalı"*. Elle
   * yapılan bir mutasyon bir kez ölçülür ve bir daha koşmaz; burada aynı
   * mutasyon **belgenin gerçek metni üzerinde** ve her koşuda uygulanıyor.
   */
  it('③ belgeden bir tablo silinirse KARŞILAŞTIRMA KIRILIR (kontrol deneyi)', async () => {
    const facts = await introspectSchema(executor);
    const generated = renderErDiagram(facts);
    const documented = extractMermaidBlock(readSchemaDocument());

    const mutated = documented
      .split('\n')
      .filter((line) => !/^ {4}referees \{$/.test(line))
      .join('\n');

    expect(mutated).not.toBe(generated);
    expect(countErDiagram(mutated).entities).toBe(EXPECTED_TABLE_COUNT - 1);

    // Karşı örnek: mutasyonsuz hâli hâlâ geçiyor — nöbetçi "her şeyi reddeden"
    // bir kontrol değil (iki yönlü doğrulama, `spec/09` §11.5b ③).
    expect(documented).toBe(generated);
  });
});
