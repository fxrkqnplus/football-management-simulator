/**
 * Oyunun veritabanı istemcileri — K4'ün uygulanışı.
 *
 * **İKİ İSTEMCİ, TEK BAĞLANTI.** Ayrım tip düzeyinde, çalışma zamanında değil:
 * altta aynı Drizzle örneği duruyor. Sebep, iki ayrı bağlantı havuzunun
 * kazandıracağından fazlasını götürmesi — havuz sayısı ikiye çıkar, işlem
 * (`transaction`) iki istemci arasında paylaşılamaz ve *"hangi istemciyle
 * açıldı?"* sorusu her `transaction` çağrısına eklenirdi.
 *
 * | İstemci | Ne yapabilir | Ne yapamaz |
 * |---|---|---|
 * | `master` | `select` | `insert`/`update`/`delete` — **tipte yok** |
 * | `writable` | `select` · `insert`/`update`/`delete` **master OLMAYAN tablolarda** | Master tabloya yazmak — **derlenmez** |
 *
 * İkisi birlikte iki ayrı kaçış yolunu kapatıyor:
 * ① Yanlış istemciyi seçmek → `master`da yazma metodu **yok**
 * ② Doğru istemciyle yanlış tabloya yazmak → parametre tipi `never`
 *
 * Yalnızca ① yapılsaydı, yazılabilir istemciyi alıp master tabloya yazmak
 * derlenirdi — ve K4'ün metni istemciyi değil **tabloyu** koruyor.
 */
import type { PgTable } from 'drizzle-orm/pg-core';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import type { RejectMaster } from './master.js';

/** Ham Drizzle örneği — dışarı **verilmez**, iki sarmalayıcının kaynağıdır. */
type RawDb = PostgresJsDatabase;

/**
 * Master World okuma istemcisi.
 *
 * Yazma metotları tipte **hiç yok** — gevşetilmiş değil, yok. `Pick` ile
 * türetiliyor, elle yazılmıyor: Drizzle `select`in imzasını değiştirirse bu tip
 * onunla birlikte değişir ve elle yazılmış bir kopya gibi sessizce eskimez.
 */
export type MasterDb = Pick<RawDb, 'select' | 'selectDistinct' | 'with' | '$with' | 'execute'>;

/**
 * Yazılabilir istemci — master tabloları **tip düzeyinde reddeder**.
 *
 * `insert`/`update`/`delete` imzaları Drizzle'ınkinden türetiliyor ama tablo
 * parametresi `RejectMaster<T>` ile daraltılıyor. Master bir tablo verildiğinde
 * parametre tipi `never` olur ve çağrı derlenmez.
 */
export interface WritableDb extends MasterDb {
  insert<T extends PgTable>(table: RejectMaster<T>): ReturnType<RawDb['insert']>;
  update<T extends PgTable>(table: RejectMaster<T>): ReturnType<RawDb['update']>;
  delete<T extends PgTable>(table: RejectMaster<T>): ReturnType<RawDb['delete']>;
}

export interface WorldDbHandle {
  /** Master World — salt okunur. */
  readonly master: MasterDb;
  /**
   * Save katmanı — master OLMAYAN tablolara yazabilir.
   *
   * ⚠️ Faz 3'te yazılabilir tablo **henüz yok**: 11 master tablonun hepsi
   * işaretli. Bu istemci bugün yalnızca `select` için kullanılabilir ve asıl
   * tüketicisi Faz 12'de gelen `save_deltas`. Şimdiden tanımlanmasının sebebi
   * K12'ye rağmen tasarım değil **kanıt**: master reddinin gerçekten çalıştığını
   * göstermek için karşı örnek gerekiyor (`master-write-control.test-d.ts`).
   */
  readonly writable: WritableDb;
  close(): Promise<void>;
}

export interface WorldDbOptions {
  /** Bağlantı havuzu üst sınırı. */
  readonly maxConnections?: number;
}

/**
 * Bağlantıyı açar ve iki istemciyi döner.
 *
 * Ham Drizzle örneği **dışarı verilmiyor**: verilseydi `handle.raw.insert(countries)`
 * her iki korumayı da atlardı ve tip zorlaması dekoratif kalırdı.
 */
export function createWorldDb(connectionUrl: string, options: WorldDbOptions = {}): WorldDbHandle {
  const sql = postgres(connectionUrl, {
    max: options.maxConnections ?? 10,
    onnotice: () => undefined,
  });
  const raw: RawDb = drizzle(sql);

  return {
    master: raw,
    // `as` YOK — ölçüldü: `RawDb` zaten `WritableDb`ye atanabiliyor
    // (ESLint `no-unnecessary-type-assertion` ile yakalandı). Koruma atamadan
    // değil, ALANIN BİLDİRİLEN TİPİNDEN geliyor: çağıran `writable`ı `WritableDb`
    // olarak görüyor ve dar imzayla karşılaşıyor. Gereksiz bir `as` yazmak,
    // korumanın kaynağı hakkında yanlış bir izlenim bırakırdı.
    writable: raw,
    close: async (): Promise<void> => {
      await sql.end();
    },
  };
}
