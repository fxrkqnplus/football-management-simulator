/**
 * `*.css?raw` importunun tip bildirimi.
 *
 * ⚠️ **NEDEN BU DOSYA VAR — `types: []` KORUNDU.**
 *
 * Üretilmiş CSS'in tazeliğini sınayan test, dosyayı **okumak** zorunda. İlk
 * yazımda `node:fs` kullanıldı ve bu `packages/ui/tsconfig.json`in
 * `"types": []` kararını **delerdi** — o karar Faz 1'de K1 (sunucu otoritesi)
 * için *"ilk savunma hattı"* diye kilitlendi: *"Sunucu API'si sızarsa derleme
 * kırılır."* Bir testin rahatlığı için anayasal bir savunmayı açmak, muafiyetin
 * kapsamı yutması sınıfı.
 *
 * Çözüm Vite'ın `?raw` içe aktarımı: dosya **paketleyici** tarafından okunuyor,
 * Node API'si hiç gerekmiyor. `apps/web` bunu `types: ["vite/client"]` ile
 * alıyor; bu paket `vite/client`ın tamamını (ve `import.meta.env`i) çekmek
 * yerine **yalnızca ihtiyaç duyduğu bildirimi** yazıyor — muafiyet dar kalıyor.
 */
declare module '*.css?raw' {
  const content: string;
  export default content;
}
