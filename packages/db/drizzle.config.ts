import { defineConfig } from 'drizzle-kit';

/**
 * ⚠️ `schema` DESENİ TEST DOSYALARINI DIŞLAMAK ZORUNDA — Faz 3.5'te ölçüldü.
 *
 * Desen `'./src/schema/*.ts'` idi ve `drizzle-kit generate` **kırıldı**:
 *
 *   Error: Vitest cannot be imported in a CommonJS module using require().
 *     at … drizzle-kit/bin.cjs (transformer)
 *     at … src/schema/competition-rules.test.ts
 *
 * Sebep: `drizzle-kit` şema dosyalarını **çalıştırarak** okuyor
 * (`prepareFilenames` → `glob.sync` → CommonJS `require`) ve glob test
 * dosyalarını da topluyordu. 3.4'te fark edilmedi çünkü migration, testler
 * yazılmadan **önce** üretilmişti — yani tuzak baştan beri vardı, yalnızca
 * sırası gizliyordu.
 *
 * **Negatif desen ÇALIŞMIYOR — kaynaktan okundu, denenip bırakılmadı.**
 * `prepareFilenames` desenleri `reduce` ile **birleştiriyor** (`glob.sync`
 * sonuçlarını bir `Set`e ekliyor); `'!./src/schema/*.test.ts'` hiçbir şeyle
 * eşleşmediği için **sessizce hiçbir şey yapmıyor** — dışlama değil, boş bir
 * katkı. Ölçüldü: desen eklendikten sonra da aynı hata.
 *
 * Çalışan yol **extglob**: `!(*.test|*.test-d)`. Ölçüm — dizindeki 13 `.ts`
 * dosyasından 11'i alınıyor, `competition-rules.test.ts` ve
 * `data-pack-columns.test.ts` dışarıda; `drizzle-kit` **8 tablo** buluyor.
 *
 * **`*.test-d` neden ayrıca dışlanıyor** (bugün `src/schema/` altında öyle bir
 * dosya yokken): `.test-d.ts` bu repoda **iki kez** ısırdı (günlük #20 — `dist/`e
 * sızdı ve kapsamı düşürdü) ve `*.test` deseniyle **eşleşmiyor**. Buradaki
 * bedeli daha ağır olurdu: tip-seviyesi kontrol deneyleri gerçek `pgTable(...)`
 * çağrıları içeriyor (`src/client/master-write-control.test-d.ts` bunu yapıyor),
 * yani böyle bir dosya `src/schema/` altına düşseydi migration'a **hayalet bir
 * tablo** girerdi — sessiz ve pahalı.
 *
 * Bu dosya `docs/spec/09-quality-protocol.md` §11.4'teki **uzantı/desen listesi
 * envanterinin 11. satırı**: yeni bir dosya soneki repoya girdiğinde burası da
 * gözden geçirilir. Desen `src/schema/drizzle-config.test.ts` tarafından
 * denetleniyor — yazılı bir kural, sınanmadığı sürece bir temennidir.
 */
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/!(*.test|*.test-d).ts',
  out: './drizzle',
});
