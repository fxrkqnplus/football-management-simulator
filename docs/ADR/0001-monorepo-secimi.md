# ADR-0001 — Monorepo: pnpm workspaces + Turborepo

**Durum:** Kabul edildi
**Tarih:** 2026-08-24 *(karar Faz 1 boyunca uygulandı, kayıt faz kapanışında yazıldı)*
**Faz:** 1

---

## Bağlam

Proje dört çalıştırılabilir uygulama (`web`, `api`, `worker`, `data-cli`) ve
dört paylaşılan kütüphane (`shared`, `engine`, `db`, `ui`) içeriyor. Bunların
arasında **tek yönlü** bir bağımlılık disiplini var (CLAUDE.md §2.4) ve bu
disiplin projenin en sert kurallarından ikisini taşıyor:

- **K3 — motor saftır:** `packages/engine` veritabanına, ağa, dosya sistemine
  dokunamaz.
- **K1 — sunucu otoritesi:** oyun mantığı istemciye sızmaz.

Bu kısıtlar "aynı kodu iki yerde tutmamak" meselesinden daha derin: sınırın
kendisi bir güvenlik özelliği.

## Karar

**Tek depo, pnpm workspaces + Turborepo 2.**

```
apps/{web,api,worker}   packages/{shared,engine,db,ui}   tools/{data-cli,...}
```

## Gerekçe

**Neden tek depo (çoklu depo değil):** Motor ile API arasındaki tip sözleşmesi
sürekli değişecek (50 faz boyunca). Ayrı depolarda her değişiklik sürüm
yayınlama + güncelleme turu ister; tek depoda tek commit. Ölçek 1–5 kullanıcı,
ekip bir kişi — çoklu deponun çözdüğü sorunlar (ekip izolasyonu, bağımsız
sürümleme) burada yok, maliyeti var.

**Neden pnpm:** Sıkı `node_modules` düzeni. Bir paket, `package.json`'ında
yazmadığı bir bağımlılığı **göremez**. npm/yarn'ın hoisting davranışı bu
kazayı mümkün kılar; pnpm'de kaza derleme hatası olur. Katman kurallarının
ilk savunma hattı budur.

**Neden Turborepo:** Görev bağımlılık grafiği (`dependsOn: ["^build"]`) ve
içerik tabanlı önbellek. Ölçüldü: ikinci `pnpm build` 8/8 önbellekten, **37 ms**.

## Sınırlar — Turbo'nun yönetmediği işler

Faz 1 boyunca ölçtük ve iki görevi bilinçli olarak Turbo'dan **çıkardık**:

| Görev | Nerede | Neden |
|---|---|---|
| `build`, `typecheck` | Turbo | Paket başına, bağımlılık sırası önemli, çıktı önbelleklenebilir |
| `lint` | Kök, tek süreç | Tek `eslint.config.js` + tek `projectService`. Paket başına fan-out ayrı TS programı açar, daha yavaş. |
| `test` | Kök, tek süreç | Vitest `projects[]` zaten çoklu paket koşuyor; kapsam eşikleri **global** hesaplanmalı |
| `arch:check` | Kök, tek süreç | Paket sınırlarını denetliyor — paket içinden bakınca göremez |

Kural: Turbo, **paket başına anlamlı ve çıktısı önbelleklenebilir** işleri
yönetir. Kapsamı depo geneli olan işler kökte tek süreçte koşar.

## Sonuçlar

**Olumlu**
- Katman ihlali üç yerde birden yakalanır: pnpm çözümlemesi → TypeScript → `arch:check`
- Tek `pnpm install`, tek lockfile, tek CI koşusu
- `packages/shared` sürüm yayınlamadan tüketilir

**Olumsuz**
- Konteyner imajı üretmek düz bir depodan zor: `pnpm deploy --legacy`
  gerekiyor (ADR-0004 ve `apps/api/Dockerfile`'daki nota bakınız)
- Sıkı `node_modules`, hoisting varsayan bazı araçları kırabilir
- Turbo önbellek `outputs` tanımı yanlışsa ya bayat çıktı servis edilir ya
  önbellek hiç tutmaz — her yeni görev için açıkça yazılır

## Uygulanış (Faz 1)

- `pnpm-workspace.yaml` + **sürüm kataloğu**: `typescript` ve `@types/node` tek
  yerde tutulur, sekiz `package.json`'a dağılmaz
- `.npmrc`: `engine-strict=true`, `strict-peer-dependencies=true`
- Katman haritası tek kaynakta: `tools/arch-check/index.mjs` → `LAYER_RULES`
- `packages/shared` `sideEffects: false` — yoksa sunucu kodu tarayıcı paketine
  girer (Faz 1.8'de ölçüldü)

## Yeniden değerlendirme koşulu

Depo, tek makinede `pnpm install` süresi kabul edilemez hale gelirse veya
`packages/engine` bağımsız dağıtılması gereken bir ürüne dönüşürse. İkisi de
v1 kapsamında beklenmiyor.
