/**
 * `pnpm --filter @fms/data-cli seed` — dünya çekirdeğini veritabanına yazar.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ BU DOSYA BİLEREK İNCE — ve bunun ölçülebilir bir sebebi var
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Burada yalnızca **kabuk işi** var: ortamı oku, bağlantıyı aç, `seedWorld`ü
 * çağır, kapat. Tek satır iş mantığı yok. Sebep kapsam kapısı: bu dosya bir
 * veritabanı bağlantısı kurduğu için birim testinde koşturulamaz, yani kapsam
 * raporunda **%0** görünecek. `tools` altındaki paketlerin `src` ağacı kapsam
 * paydasına dahil (ölçüldü — `vitest.config.ts` `coverage.include` üçüncü
 * deseni), dolayısıyla buraya yazılan her kapsanmamış satır global eşiği
 * aşağı çeker.
 *
 * Çözüm dosyayı dışlamak **değil** (o, kapsamı kapıya uydurmak olurdu — 3.4
 * günlük #27'nin reddettiği hamle), mantığı buradan **çıkarmak**: `seed-world.ts`
 * `SqlExecutor` alıyor ve gerçek Postgres'e karşı entegrasyon testinde
 * koşuyor, `seed-sql.ts` ve `world-seed-data.ts` ise tamamen saf ve birim
 * testli.
 *
 * ⚠️ **`packages/db` kapsamının KANIT SAYILMAMASIYLA aynı sınıf** (ROADMAP
 * Faz 3): burada %0 görünen kod test edilmemiş değil, **başka bir koşumda**
 * test ediliyor. Fark şu ki bu dosya o koşumda da yalnızca `pnpm test:db`in
 * D5 adımıyla, yani derlenmiş `dist/seed.js` düz `node` ile çalıştırılarak
 * kanıtlanıyor.
 *
 * ⚠️ K8: `console` yok. `no-console` bu repoda **global** `error` (eslint
 * bölüm 7), `tools/` muaf değil.
 */
import { createPostgresExecutor } from '@fms/db';
import { createServerLogger, loadEnv } from '@fms/shared/server';

import { seedWorld } from './seed/index.js';

/**
 * ⚠️ `.env` DOSYASINI KİMSE OKUMUYOR — ölçüldü (Faz 3.8 D5 adımı).
 *
 * `loadEnv()` yalnızca `process.env`e bakıyor; `apps/api` bu değerleri Docker'ın
 * `-e` bayraklarından alıyor, yani repoda `.env` → `process.env` taşıyan bir
 * mekanizma **yoktu**. İlk D5 koşusu tam bu yüzden patladı ve hata mesajı
 * doğruydu ama yanıltıcıydı: eksik olan `REDIS_URL`/`JWT_SECRET` değil, onları
 * yükleyecek adımdı.
 *
 * Çözüm `package.json`'daki `seed` betiğinde: Node 24'ün yerleşik
 * `--env-file-if-exists` bayrağı. Bağımlılık eklemiyor (`dotenv` yasak listesine
 * girmeden reddedildi: yerleşik varken paket eklemek §2.1'in ilkesine aykırı) ve
 * `-if-exists` biçimi seçildi çünkü `.env`siz ortamlarda (CI, Docker) çıplak
 * `--env-file` **hata verir** — orada değerler zaten ortamdan geliyor.
 *
 * ⚠️ **`loadEnv()` TÜM şemayı doğruluyor, yalnızca kullandığımız üç alanı değil.**
 * Seed'in ihtiyacı `DATABASE_URL` + iki log alanı; ama `JWT_SECRET` veya
 * `REDIS_URL` eksikse bu araç da açılmıyor. Bilerek daraltılmadı: tek bir ortam
 * sözleşmesi olması, aracın kendi mini şemasını taşımasından iyi — iki şema
 * kaçınılmaz olarak ayrışır ve hangisinin doğru olduğu bilinmez
 * (`data-pack-columns.ts`in `DATA_SOURCES` gerekçesiyle aynı sınıf).
 */
async function main(): Promise<void> {
  // Ortam doğrulaması Zod'dan geçiyor; `DATABASE_URL` eksikse burada,
  // bağlantı denenmeden önce, Türkçe ve eyleme dönüştürülebilir bir hata çıkar.
  const env = loadEnv();
  const logger = createServerLogger({
    level: env.LOG_LEVEL,
    format: env.LOG_FORMAT,
    name: '@fms/data-cli',
  });

  const handle = createPostgresExecutor(env.DATABASE_URL);
  try {
    await seedWorld({ executor: handle.executor, logger });
  } finally {
    // `close()` çağrılmazsa süreç kapanmaz (`postgres-executor.ts` sözleşmesi).
    await handle.close();
  }
}

// Hata yutulmuyor: `main` fırlatırsa süreç sıfırdan farklı kodla ölür ve CI
// bunu görür. Sessiz bir `catch` bu repoda yasak (CLAUDE.md §1.3).
await main();
