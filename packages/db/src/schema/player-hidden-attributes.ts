/**
 * `player_hidden_attributes` — 10 GİZLİ nitelik. `docs/spec/01-database.md` §3.1.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * 10 SAYISI ROADMAP'TEN ALINMADI — VE BU TABLO SAPMA-001'İN KENDİ VAKASI
 * ────────────────────────────────────────────────────────────────────────────
 *
 * SAPMA-001: yol haritası **8** gizli nitelik diyordu; `spec/02` §4.5 spesifikasyon
 * yazımı sırasında `adaptability` (Faz 34 yabancı lig uyumu) ve `temperament`
 * (Faz 44 diyalog tepkileri) ekledi → **10**. ROADMAP iki yerde **adıyla** sekiz
 * sayıyordu ve tutarsızlık Faz 3.0'a kadar düzeltilmedi.
 *
 * Yani bu tablonun sütun sayısı, projede *"ROADMAP'ten alma, kaynaktan say"*
 * kuralını doğuran vakanın ta kendisi. Sayı `spec/02` §4.1'in gizli nitelik
 * satırından **sayılarak** alındı (10 ad, 10'u da benzersiz) ve envanter burada
 * bir sayı olarak değil bir **liste** olarak yaşıyor (`HIDDEN_ATTRIBUTES`);
 * `player-hidden-attributes.test.ts` onu tablonun gerçek sütunlarıyla
 * **birebir** karşılaştırıyor.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * `player_id` PK + FK — AYRAÇ AYRICA KOŞTURULDU (kardeş tablodan KOPYALANMADI)
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Ayraç 4.3'te ölçülebilir hâle geldi: **tabloya GELEN yabancı anahtar sayısı.**
 * `player_attributes` ile aynı cevaba varıyor ama soru **ayrı** soruldu — iki
 * tablo, iki ölçüm:
 *
 * | Tablo | Ona bakan FK | Ölçüm |
 * |---|---|---|
 * | `player_attributes` | **0** | `spec/01` tamamında `attributesId` / `attribute_id` → 0 eşleşme |
 * | **`player_hidden_attributes`** | **0** | aynı arama; ayrıca `spec/01`'de tablo yalnızca **kendi tanımında** geçiyor (2 satır) |
 *
 * → **PK = FK** (3.5 deseni). Ayrı bir `serial id` ikinci bir kimlik yolu açar
 * ve aynı oyuncu için iki gizli nitelik satırı mümkün olurdu.
 *
 * ⚠️ **İkinci bir gerekçe bu tabloya ÖZGÜ ve `player_attributes`ta yok:** gizli
 * nitelikler kullanıcıya **asla sayı olarak gösterilmiyor** (`spec/02` §4.1) ve
 * tek okuyucuları motor fonksiyonları — `derivePersonality(hidden)` (§4.6),
 * gelişim ve sakatlık hesapları. Bu okuyucuların hepsi **oyuncudan** yola
 * çıkıyor (*"bu oyuncunun gizli nitelikleri"*), hiçbiri satırın kendi kimliğini
 * taşımıyor. Yani burada ayrı bir `serial` yalnızca fazlalık değil, **hiçbir
 * zaman kullanılmayacak** bir kimlik olurdu.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ON SÜTUNUN HİÇBİRİ CHECK ALMIYOR (SAPMA-028) — VE BURADA DAHA DA NET
 * ────────────────────────────────────────────────────────────────────────────
 *
 * §3.1.2 ②: sayısal aralık **kalibrasyondur**. Gizli niteliklerde bu, görünür
 * niteliklerden bile daha belirgin: `spec/02` §4.5 onları **türetiyor**
 * (`p2a(pct(...))`, standart sapma, yüzdelik) ve türetme fonksiyonlarının
 * ölçeği Faz 10'un kalibrasyonu. Veri yoksa `clamp(1, 20, round(10 + rng.normal(0, 3.5)))`
 * — yani üretim yolu bile bir dağılım parametresi taşıyor.
 *
 * Aralık denetiminin yeri **Faz 11** (`pnpm validate:world`).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * KİŞİLİK BURADA YOK — VE OLMAMASI BİR TASARIM YASAĞI
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `spec/02` §4.6: *"Kişilik **saklanmaz, türetilir**"* — `derivePersonality(hidden)`.
 * Bu tablo o türetmenin **girdisidir**; çıktısı hiçbir yerde saklanmaz.
 * `player_personalities` tablosu bu yüzden **açılmadı** (SAPMA-030) — bir
 * *"tüketici bulunamadı"* kararı değil, spec'in aktif yasağı.
 *
 * ⚠️ Açık boşluk **G-15**: ROADMAP Faz 11 Veri Editörü kişiliği *"düzenlenebilir"*
 * sayıyor ve bu §4.6 ile çelişiyor. Karar Faz 11'in.
 */
import { integer, pgTable, smallint, timestamp } from 'drizzle-orm/pg-core';

import { masterTable } from '../client/master.js';
import { players } from './players.js';

/**
 * 10 gizli niteliğin envanteri — `spec/02` §4.1'in gizli nitelik satırından
 * **sayılarak** alındı, ROADMAP'ten değil (SAPMA-001 bu sınıftı).
 *
 * Sıra `spec/02`'nin yazdığı sıra. Kod adları camelCase; veritabanı sütun adları
 * snake_case ve onlar **ayrı** bir iddiada katalogdan okunarak sınanıyor.
 */
export const HIDDEN_ATTRIBUTES = [
  'consistency',
  'importantMatches',
  'injuryProneness',
  'dirtiness',
  'pressure',
  'professionalism',
  'ambition',
  'loyalty',
  'adaptability',
  'temperament',
] as const;

export type HiddenAttribute = (typeof HIDDEN_ATTRIBUTES)[number];

export const playerHiddenAttributes = masterTable(
  pgTable('player_hidden_attributes', {
    /** 1:1 — PK **ve** FK. Ayraç ve iki gerekçe dosya başlığında. */
    playerId: integer('player_id')
      .primaryKey()
      .references(() => players.id, { onDelete: 'cascade' }),

    /** Maç reytinglerinin standart sapmasının tersi (`spec/02` §4.5). */
    consistency: smallint('consistency').notNull(),
    /** Derbi/kupa/Avrupa reytingi − genel reyting ortalaması. */
    importantMatches: smallint('important_matches').notNull(),
    /** Son 3 sezondaki sakatlık günü sayısı. Faz 39'un girdisi. */
    injuryProneness: smallint('injury_proneness').notNull(),
    /** Faul + kart sıklığı. Faz 23 müdahale çözümlemesinin girdisi. */
    dirtiness: smallint('dirtiness').notNull(),
    /** Penaltı dönüşümü + son 15 dakika performansı. */
    pressure: smallint('pressure').notNull(),
    /** Kart disiplini + kariyer istikrarı + gelişim eğimi. */
    professionalism: smallint('professionalism').notNull(),
    /** Kulüp değiştirme yönü + genç yaşta üst lig. */
    ambition: smallint('ambition').notNull(),
    /** Aynı kulüpteki ortalama yıl sayısı. */
    loyalty: smallint('loyalty').notNull(),
    /** SAPMA-001'in ilk yeni niteliği — Faz 34 yabancı lig uyum süreci. */
    adaptability: smallint('adaptability').notNull(),
    /** SAPMA-001'in ikinci yeni niteliği — Faz 44 diyalog tepkileri. */
    temperament: smallint('temperament').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  }),
);
