# Dünya Çekirdeği Şeması — Master World

> **Durum: İSKELET (Faz 3.1).** Tablo envanteri kesinleşti; sütun tanımları
> 3.4–3.6'da, **ER diyagramı 3.10'da** eklenecek.
>
> **Diyagram neden şimdi çizilmiyor:** şemadan önce çizilen bir diyagram bir
> *iddiadır*, ölçüm değil — ve şema değiştikçe sessizce ayrışır. 3.10'da gerçek
> şemadan üretilecek ve tablo/FK sayısı programatik olarak karşılaştırılacak.
>
> **Otorite sırası:** `docs/spec/01-database.md` (sütun tanımları) →
> `docs/ROADMAP.md` Faz 3 tablo envanteri (kapsam kararları) → bu dosya (özet).
> Çelişki olursa spec kazanır.

## Kapsam

Faz 3 **11 master tablo** tanımlar. Bunlar tüm kayıtlar tarafından paylaşılır ve
**asla kullanıcı işlemiyle değiştirilmez** (K4) — kullanıcıya özel her değişiklik
`save_deltas`'a yazılır (Faz 12).

Sayı üç farklı yerde üç farklı şekilde yazılıydı ve Faz 3.1'de mutabakata bağlandı:
ROADMAP **15** diyordu, `spec/01` §3.1 bu kapsam için **11** tanımlıyordu,
`PROJECT_MEMORY.md` Faz 2 kaydı §11 **"16 master tablo"** diyordu. Karar tablosu ve
her satırın gerekçesi `docs/ROADMAP.md` → *Faz 3 — Tablo envanteri*'nde (SAPMA-021).

## Tablolar (11)

| # | Tablo | Alt görev | `key`/`source`/`externalIds` | Not |
|---|---|---|---|---|
| 1 | `countries` | 3.2b / 3.4 | ✅ | İlk migration ve round-trip kanıtı bunun üzerinde |
| 2 | `federations` | 3.4 | — | `presidentPersonId` **Faz 4'te** |
| 3 | `competitions` | 3.4 | ✅ | `rules jsonb` (Zod: `CompetitionRules`), ayrı tablo değil |
| 4 | `clubs` | 3.5 | ✅ | `reputation` ve üç renk **sütun** olarak burada; `chairmanPersonId` **Faz 4'te** |
| 5 | `club_facilities` | 3.5 | — | `clubId` 1:1 |
| 6 | `club_finances_base` | 3.5 | — | `clubId` 1:1 · başlangıç değerleri master, değişimi delta |
| 7 | `stadiums` | 3.5 | ✅ | |
| 8 | `rivalries` | 3.5 | — | `clubAId` / `clubBId` |
| 9 | `kit_templates` | 3.6 | — | Oyunun kendi 20 SVG şablonu, pakette değil — `code` kimliği taşıyor |
| 10 | `club_kits` | 3.6 | — | `clubId` + `kitType` |
| 11 | `referees` | 3.6 | ✅ | `personId` **Faz 4'te** → Faz 4'e kadar **isimsiz** |

## Faz 3'te bilerek YAPILMAYANLAR

| Ne | Neden | Nereye |
|---|---|---|
| `confederations`, `competition_rules`, `club_reputations`, `club_colors` tabloları | Hepsi 1:1 sütun; ayrı tablo her sorguya JOIN ekler, hiçbir sorgu onlardan geçmez (K12) | — (sütun olarak `spec/01`'de) |
| `competition_seasons` | **Hiçbir tüketicisi yok** — `spec/01`, `spec/12`, ROADMAP Faz 8/46/47 tarandı. Sezon bu spec'te **skaler `seasonYear`**, puan durumu `matches`'tan türetiliyor | — · ürün fikri `docs/V2-BACKLOG.md`'ye |
| `asset_index` | `spec/12` §17.5 istiyor ama tabloyu **dolduran hat** Faz 7'de. Hiçbir şeyin yazmadığı tablo, tüketicisi olmayan sütunla aynı sınıf | **Faz 7** (G-09) |
| `federations.presidentPersonId`, `clubs.chairmanPersonId`, `referees.personId` | `people` Faz 4'te. Kısıtsız sütun, *"tüm FK'lar tanımlı"* kriterini görünürde sağlayıp gerçekte delerdi | **Faz 4** — sütun ve FK **birlikte** eklenecek |

## Kararların dayanağı

- **Salt-okunurluk (K4)** tip seviyesinde zorlanır, `is_master` gibi bir bayrak
  sütunuyla değil — hiçbir şeyin tüketmediği bir bayrak bir temennidir. Uygulama 3.3.
- **Veri paketi sütunları** (`key` · `source` · `externalIds`) ve `key`'in
  **tablo başına** benzersizliği: `docs/spec/01-database.md` **§3.1.0**.
- **Migration `up`/`down` disiplini** ve `drizzle-kit`in `down` üretmediği ölçümü:
  `docs/spec/01-database.md` **§3.0**.
- **Collation ve arama:** veritabanı `builtin`/`C.UTF-8`; sıralama sorgu başına
  `COLLATE "tr-TR-x-icu"`. Türkçe arama için `unaccent` **şart** ve `IMMUTABLE`
  sarmalayıcı istiyor — ölçüm ROADMAP Faz 3.7 ve Faz 8 maddelerinde.
