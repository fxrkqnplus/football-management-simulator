/**
 * `SqlExecutor`ın `postgres.js` uygulaması.
 *
 * **Sürücü kararı (Faz 3.2a): `postgres@3.4.9`, `pg` değil.** İkisi de kuruldu ve
 * gerçek PostgreSQL 18.6'ya karşı ölçüldü; dört boyutta da **birebir aynı**
 * davrandılar: `bigint` → `string` (hassasiyet kaybı yok), `numeric` → `string`,
 * çok-ifadeli SQL çalışıyor, işlemsel DDL geri alınıyor. Davranış eşit olunca karar
 * ölçülen tek gerçek farka düştü — kurulan paket sayısı: **`pg` 13, `postgres.js` 1**.
 * CLAUDE.md §1.5 (public repo) ve §2.1'in "lodash'in tamamı yasak, yalnızca gereken
 * fonksiyon" ilkesi aynı yöne işaret ediyor.
 *
 * **Geri dönüş maliyeti düşük ve bu bilinçli:** koşucu `SqlExecutor` arayüzünü
 * görüyor, sürücüyü değil. `pg`'ye dönmek bu dosyayı değiştirmek demek — koşucuya,
 * teste veya şemaya dokunulmaz.
 */
import type { Sql, TransactionSql } from 'postgres';
import postgres from 'postgres';

import type { SqlExecutor } from './executor.js';

export interface PostgresExecutorHandle {
  readonly executor: SqlExecutor;
  /** Bağlantıyı kapatır. Çağrılmazsa süreç kapanmaz. */
  close(): Promise<void>;
}

/**
 * Çok ifadeli SQL `postgres.js`'te `unsafe()` ister.
 *
 * Etiketli şablon (`sql\`…\``) genişletilmiş protokolü kullanır ve tek ifade
 * bekler; migration dosyaları birden çok ifade taşır. `unsafe()` adı yerinde:
 * buradan geçen her şey **ham SQL**'dir ve `grep`lenebilir olması iyidir. Migration
 * içerikleri parametreleştirilebilir değil zaten — DDL'in parametresi olmaz.
 */
function wrap(sql: Sql): SqlExecutor {
  const executor: SqlExecutor = {
    async run(statement: string): Promise<void> {
      await sql.unsafe(statement);
    },
    async rows<T>(statement: string): Promise<readonly T[]> {
      const result = await sql.unsafe(statement);
      return result as unknown as readonly T[];
    },
    async transaction<T>(fn: (tx: SqlExecutor) => Promise<T>): Promise<T> {
      return (await sql.begin(async (tx) => fn(wrapTransaction(tx)))) as T;
    },
  };
  return executor;
}

function wrapTransaction(tx: TransactionSql): SqlExecutor {
  return {
    async run(statement: string): Promise<void> {
      await tx.unsafe(statement);
    },
    async rows<T>(statement: string): Promise<readonly T[]> {
      const result = await tx.unsafe(statement);
      return result as unknown as readonly T[];
    },
    // İç içe işlem `SAVEPOINT`e düşer; koşucu bunu kullanmıyor ama sözleşme
    // eksik kalmasın diye bağlandı.
    async transaction<T>(fn: (nested: SqlExecutor) => Promise<T>): Promise<T> {
      return (await tx.savepoint(async (sp) => fn(wrapTransaction(sp)))) as T;
    },
  };
}

/**
 * Bir bağlantı açar ve `SqlExecutor` döner.
 *
 * `max: 1` bilinçli: migration koşucusu tek bir bağlantı üzerinde sıralı çalışır.
 * Havuz, eşzamanlı iki migration'ın birbirine girmesini mümkün kılardı ve migration
 * eşzamanlılığı istenen bir şey değil.
 */
export function createPostgresExecutor(connectionUrl: string): PostgresExecutorHandle {
  const sql = postgres(connectionUrl, { max: 1, onnotice: () => undefined });
  return {
    executor: wrap(sql),
    close: async (): Promise<void> => {
      await sql.end();
    },
  };
}
