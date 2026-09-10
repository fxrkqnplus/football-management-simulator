/**
 * `import.meta.glob` bildirimi — **dar tutulmuş**, `vite/client`ın tamamı değil.
 *
 * ⚠️ **NEDEN BU DOSYA VAR — `types: []` KORUNDU.**
 *
 * `UI_KEYS` bütünlük nöbetçisi (`i18n-keys.test.ts` ②) **diski okumak
 * zorunda**: kayıt defterinin eksik olup olmadığı ancak *"diskte ne var"*
 * sorusuyla anlaşılır. `node:fs` kullanmak `packages/ui/tsconfig.json`in
 * `"types": []` kararını **delerdi** — o karar Faz 1'de K1 için *"ilk savunma
 * hattı"* diye kilitlendi ve 6.3 (`?raw`) ile 6.4 (`react-jsx`) onu delmeden
 * geçti; bir nöbetçinin rahatlığı için açmak muafiyetin kapsamı yutması sınıfı.
 *
 * Çözüm `raw-css.d.ts`in **birebir emsali**: modülleri **paketleyici** topluyor,
 * Node API'si hiç gerekmiyor. `apps/web` bunu `types: ["vite/client"]` ile
 * alıyor; bu paket yalnızca **ihtiyaç duyduğu bildirimi** yazıyor.
 *
 * ⚠️ Bildirim `eager: true` biçimine **dar**: tembel (`() => Promise`) biçim
 * bildirilmiyor çünkü kullanılmıyor — bildirilmemiş bir yetenek, var olmayan
 * bir yetenektir (kullanılmayan bir stub'ın tersi, aynı ilke).
 *
 * ⚠️ **DESEN `string[]` DE OLABİLİR ve bu bir zorunluluk, kolaylık değil.**
 * İlk yazımda yalnızca `string` bildirilmişti ve nöbetçi `'./*.tsx'` deseniyle
 * yazıldı; ölçüm gösterdi ki bu desen **`*.test.tsx` dosyalarını da** içe
 * aktarıyor. `eager: true` onları GERÇEKTEN değerlendirdiği için her test
 * dosyasının `describe`/`it` blokları **nöbetçinin dosyasına** kaydoldu ve
 * paketin bütün testleri **iki kez** koştu (18 modül = 9 bileşen + 9 test).
 * Belirti sessizdi: sayı **büyüdü**, kırmızı olmadı. Negatif desen (`!`) ancak
 * dizi biçiminde verilebiliyor, bu yüzden imza genişletildi.
 */
interface ImportMeta {
  glob: (
    pattern: string | readonly string[],
    options: { eager: true },
  ) => Record<string, Record<string, unknown>>;
}
