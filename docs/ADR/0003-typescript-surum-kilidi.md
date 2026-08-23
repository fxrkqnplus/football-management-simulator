# ADR-0003 — TypeScript sürüm kilidi: 6.0.3, `~` ile pinli

**Durum:** Kabul edildi
**Tarih:** 2026-08-23
**Faz:** 1 (alt görev 1.0)
**İlgili kayıt:** SAPMA-003

---

## Bağlam

`CLAUDE.md` §2.1 yığını 2024 bilgisiyle kilitlenmişti (TypeScript 5.6). Faz 1'de `pnpm install`
bu kilidi kalıcılaştıracağı için, tüm sürümler npm registry'den doğrulandı.

Doğrulama sonucu TypeScript'in kararlı sürümü **7.0.2** (8 Tem 2026) — Go ile yazılmış native
derleyici, yaklaşık 10× daha hızlı tip kontrolü. "En yeniyi al" refleksi bu projeyi kırardı.

## Karar

**`typescript@~6.0.3` kullanılır.** TypeScript 7'ye çıkılmaz.

`~` (tilde) bilinçli bir tercihtir, `^` (caret) **yasaktır**.

## Gerekçe

TypeScript 7.0 **programatik derleyici API'si olmadan** yayınlandı. O API 7.1'e bırakıldı.
Karar iki mekanik kanıta dayanır — blog yazılarına değil:

1. **`typescript-eslint@8.67.0` peer aralığı:** `typescript: ">=4.8.4 <6.1.0"`.
   Registry'den doğrulandı. TS 7 bu aralığın dışında. typescript-eslint projesi TS 7 desteği
   talebini (issue #10940) GA gününde *"not planned"* olarak kapattı; gerekçe hem programatik
   API'nin yokluğu hem de ESLint'in asenkron parser desteklememesi.
2. **`nest build`** kendi transformer'larıyla `createProgram()` ve `program.emit()` çağırır.
   Programatik API olmadan çalışmaz.

Sonuçları: TS 7'ye çıkmak **tip-farkında lint kurallarını** (K3, K5, K6 denetimlerinin bir
kısmı) ve **NestJS derlemesini** kırar. Not: Go derleyicisi `experimentalDecorators` ve
`emitDecoratorMetadata`'yı destekliyor — sorun dekoratörler değil, API'nin yokluğu.

### Neden `^` değil `~`

`^6.0.3` yazılırsa pnpm minor güncellemelerde 6.1.0'a çıkabilir ve typescript-eslint'in
`<6.1.0` peer sınırının dışına taşar. Lint zinciri o gün sessizce çöker. `~6.0.3` yalnızca
patch güncellemelerine izin verir (6.0.x), sınırın içinde kalır.

## Sonuçlar

**Olumlu**
- Tip-farkında lint kuralları çalışır → `arch:check`'in tip bilgisi isteyen kısmı ayakta kalır
- `nest build` çalışır
- TS 6.0, klasik JS derleyicisinin son ve en olgun sürümü (16 Nis 2026)

**Olumsuz**
- ~10× hızlı tip kontrolünden şimdilik feragat edilir
- TS 6.0'ın kendi kırıcı değişiklikleri üstlenilir (aşağıya bakınız)

**TS 6.0'dan gelen ve Faz 1'de uygulanan kısıtlar**
- `strict` artık varsayılan (K1.3 ile zaten uyumlu)
- Varsayılan `target` → ES2025 (Node 24 ile uyumlu)
- **`types: []` varsayılan boş** — her paketin `tsconfig.json`'ında `types` **açıkça**
  listelenir, yoksa `@types/node` görünmez. Sessiz tuzak.
- `baseUrl` kullanımdan kalktı — path alias'ları `baseUrl`siz `paths` ile yazılır
- `moduleResolution: classic` ve ES5 hedefi kaldırıldı (kullanılmıyor)

## Yeniden değerlendirme koşulu

**TypeScript 7.1 yayınlandığında** (programatik API hedefleniyor, sonbahar 2026) bu karar
yeniden açılır. Kontrol listesi:

1. `typescript-eslint` peer aralığı 7.x'i kapsıyor mu?
2. `nest build` tsgo üzerinde çalışıyor mu? (NestJS issue #15620)
3. `vitest`, `drizzle-kit`, `@vitejs/plugin-react` zinciri uyumlu mu?

Üçü de evet değilse karar korunur. Takip: `docs/DEPENDENCY-WATCH.md`.

## Kapsam dışı bırakılan alternatif

`tsgo`'yu CI'da **bloke etmeyen** ikinci bir hızlı tip kontrolü olarak koşturmak teknik olarak
mümkün. Faz 1 kapsamına alınmadı (K12) → `docs/V2-BACKLOG.md`.
