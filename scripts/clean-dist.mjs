/**
 * `dist/` temizleyici — her `tsc` derlemesinden ÖNCE çalışır.
 *
 * NEDEN VAR (Faz 2.2a'da ölçüldü):
 * `tsc -p tsconfig.build.json` çıktıyı **üzerine yazar, silmez**. Bir kaynak
 * dosya taşındığında veya silindiğinde eski `.js`/`.d.ts` `dist/` içinde
 * öksüz kalır. Tek başına bu bile kötü; Turborepo ile birleşince daha kötü
 * oluyor:
 *
 *   1. `turbo.json` `build` görevinin çıktısı `dist/**` olarak tanımlı.
 *   2. Önbellek girdisi, dosya HÂLÂ VARKEN alınmış olabilir.
 *   3. Kaynak silinip önbellek isabet ettiğinde (`>>> FULL TURBO`), turbo
 *      **önbellekteki dizinin tamamını geri yükler** ve silinmiş dosya
 *      `dist/`e geri gelir.
 *
 * ÖLÇÜM: 2.2a'da `packages/shared/src/env.ts` → `src/server/env.ts` taşındı.
 * `rm -rf dist && pnpm build` sonrası `dist/env.js` **yine oradaydı**. Aynı
 * ağaçta `tsc`'yi doğrudan çalıştırınca dist temiz çıktı — yani dosyayı üreten
 * derleyici değil, önbellekti.
 *
 * Belirti sinsi: hiçbir kapı ötmez. Öksüz modül `exports` haritası sayesinde
 * paket dışından erişilemez ama `dist/` üzerinde yapılan her ölçüm (paket
 * içeriği taraması, sızıntı denetimi, boyut karşılaştırması) yanlış cevap
 * verir. Faz 1 hata #7'nin ("bayat dist yeşil yalanı üretir") önbellek
 * kaynaklı akrabası.
 *
 * ⚠️ `apps/web` DE BU BETİĞİ KULLANIR — ilk yazımda "Vite `outDir`'i zaten
 * boşaltıyor" diye muaf tutulmuştu ve bu ÖLÇÜMLE ÇÜRÜTÜLDÜ. Vite gerçekten
 * boşaltıyor, ama turbo önbellek isabetinde **Vite hiç çalışmıyor**; turbo
 * önbellekteki çıktıyı mevcut `dist/`in ÜZERİNE yazıyor ve iki farklı derlemenin
 * varlıkları yan yana kalıyor.
 *
 * ÖLÇÜM (2.2a kontrol deneyi): `App.tsx`'e kasıtlı sunucu importu konup derlendi
 * (`index-DV5Sgexl.js`, 299 kB, içinde `JWT_SECRET`). Import geri alınıp yeniden
 * derlendiğinde turbo önbellekten temiz varlığı (`index-rtVlQQVC.js`, 229 kB)
 * geri yükledi ama **kirli olanı silmedi**. `dist/assets/` içinde ikisi birden
 * duruyordu ve sızıntı taraması hâlâ `JWT_SECRET` buluyordu — yani kanıtın
 * kendisi bozulmuştu. Paket sızıntı denetimi ancak `dist/` garantili temizse
 * bir şey kanıtlar.
 *
 * Bootstrap betiği: logger yok, console yok (K8), doğrudan stderr/stdout.
 */
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const distPath = join(process.cwd(), 'dist');

if (existsSync(distPath)) {
  try {
    rmSync(distPath, { recursive: true, force: true });
  } catch (cause) {
    process.stderr.write(
      `\n  ✖ dist/ temizlenemedi: ${distPath}\n` +
        `    Sebep: ${cause instanceof Error ? cause.message : String(cause)}\n` +
        `    Bir süreç dosyayı açık tutuyor olabilir (dev sunucusu, editör).\n\n`,
    );
    process.exit(1);
  }
}
