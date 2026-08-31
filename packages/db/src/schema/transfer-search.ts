/**
 * TRANSFER ARAMASININ İNDEKS ZEMİNİ — `docs/ROADMAP.md` Faz 4 kabul kriteri 3.
 *
 * Bu dosya bir tablo tanımlamıyor. İki şeyi tek yerde tutuyor: transfer
 * aramasını taşıyan **indekslerin adlarını** ve yaş yükleminin **tarih
 * aralığına çevrimini**. İkisi de birden fazla yerden okunuyor (şema
 * tanımları · 4.10'un ölçümü · Faz 32'nin sorgusu) ve ayrışırlarsa
 * kimse duymuyor.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * KAPSAM SORGUDAN TÜRETİLDİ — `spec/01`'in indeks satırından DEĞİL
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `spec/01` §3.1'de `player_attributes`ın yanında bir satır duruyor:
 *
 *   INDEX: (primaryPosition, currentAbility), (finishing), (passing), (pace)
 *
 * O satır **iki tabloyu karıştırıyor** (4.0'da ölçüldü) ve §3.1'in kendi
 * düzeltme kutusu onu bir indeks listesi değil bir **niyet beyanı** ilan etti
 * (Faz 4.1 kararı). Kapsam bu yüzden **kabul kriteri 3'ün sorgusundan**
 * türetildi:
 *
 *   "20–24 yaş, sağ bek, CA>120" — 5.000 oyuncu hacminde < 50 ms
 *   (SAPMA-031: `değer<15M` yüklemi Faz 30/32'ye taşındı)
 *
 * Üç yüklemin gerçek yeri **kaynaktan sayıldı**, devir notundan alınmadı (D7):
 *
 * | Yüklem | Sütun | Tablo | Biçim |
 * |---|---|---|---|
 * | 20–24 yaş | `birth_date` | `people` | aralık |
 * | sağ bek | `primary_position` (`'DR'`) | `players` | eşitlik |
 * | CA > 120 | `current_ability` | `players` | aralık |
 *
 * ⚠️ **`current_ability` `players`ta, `player_attributes`ta DEĞİL** — ölçüldü
 * (`player-attributes.ts`te 0 eşleşme). Yani sorgu **iki tablo, bir JOIN**;
 * üç tabloya yayılmış değil. Bu, indeks dağılımının tamamını belirliyor.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * NEDEN İKİ İNDEKS VE NEDEN BU SIRA
 * ────────────────────────────────────────────────────────────────────────────
 *
 * **`players (primary_position, current_ability)`** — eşitlik yüklemi önce,
 * aralık yüklemi sonra. Bir B-tree indeksinde aralık yükleminden sonraki
 * sütunlar yalnızca filtreleme için okunabilir, arama sınırı olarak
 * kullanılamaz; sıra ters olsaydı `primary_position` eşitliği indeksin
 * kapsamına giremezdi. İki sütun **aynı tabloda** olduğu için bileşik indeks
 * mümkün — bir indeks tek bir tabloya konur.
 *
 * ℹ️ Sonuç `spec/01`'in satırının ilk yarısıyla **aynı** çıktı. Bu bir
 * kopyalama değil: sıranın gerekçesi yukarıdaki eşitlik/aralık kuralından
 * geliyor ve satırın kendisi o gerekçeyi hiç taşımıyordu.
 *
 * **`people (birth_date)`** — düz, tek sütunlu. Yaş yüklemi burada yaşıyor ve
 * JOIN'in hangi taraftan başlayacağı **seçiciliğe** bağlı (3.9'un dersi:
 * *"indeks seçiminin ayracı hacim değil seçicilik"*). Planlayıcı `people`den
 * başlarsa bu indeks aralık taramasını taşır; `players`tan başlarsa
 * `person_id` PK erişimiyle gider ve indeks kullanılmaz. **Hangisi olduğu
 * 4.10'un ölçümüdür** — bugün `players` boş ve boş bir tabloda planlayıcının
 * seçimi hiçbir şey kanıtlamaz (`reltuples = -1`, 3.9).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ YAŞ İFADESİ İNDEKSLENEMİYOR — ÖLÇÜLDÜ, VARSAYILMADI
 * ────────────────────────────────────────────────────────────────────────────
 *
 * PostgreSQL indeks ifadesinde `IMMUTABLE` olmayan fonksiyon kabul etmiyor
 * (§3.1.2 ⑨). `pg_proc.provolatile` gerçek PG 18.6'dan okundu:
 *
 * | Fonksiyon | `provolatile` |
 * |---|---|
 * | `age(timestamptz)` | **`s`** (STABLE) |
 * | `now()` | **`s`** (STABLE) |
 * | `age(timestamptz, timestamptz)` | `i` — ama ikinci argüman `now()` olur |
 * | `extract(text, date)` | `i` — doğum **yılını** verir, yaşı değil |
 *
 * ⚠️ **3.7'nin çıkışı BURADA GEÇERSİZ ve bu ayrım önemli.** Orada bir
 * `IMMUTABLE` sarmalayıcı yazıldı çünkü `unaccent` gerçekte **girdisine**
 * bağlıydı; `STABLE` işareti yalnızca sözlüğün değişebilmesinden geliyordu,
 * yani iddia *"nadiren yanlış"*tı ve bedeli bir `REINDEX`.
 *
 * Yaş **gerçekten** zamana bağlı. Bir `immutable_age()` sarmalayıcısı yazmak
 * *"nadiren yanlış"* değil **her gün yanlış** bir indeks üretirdi: dün 19 olan
 * bugün 20 ve indeks bunu bilmez. **Bir yalanı kabul etmek onu izlemeyi kabul
 * etmektir** (§3.1.2 ⑨) — ama bu yalan izlenebilir değil, her gece bozuluyor.
 *
 * **Seçilen yol:** aralık **sorgu tarafında** sabit tarihlere çevrilir
 * (`birth_date BETWEEN from AND to`) ve düz bir `birth_date` indeksi onu
 * taşır. İndeks bir ifade taşımadığı için 3.7'nin *"indeks ifadesi ile sorgu
 * ifadesi birebir aynı olmalı"* riski bu biçimde **yok**.
 *
 * ⚠️ **Ama kuralın RUHU duruyor ve bu dosyanın var olma sebebi o:** çevrimin
 * kendisi bir ifadedir ve iki yerde yazılırsa (4.10'un ölçümü, Faz 32'nin
 * sorgusu) sessizce ayrışır — sorgu **doğru cevabı vermeye devam eder**,
 * yalnızca farklı satırlar döner ve hiçbir kapı ötmez. `search.ts` deseni
 * kopyalanmadı, **uyarlandı**; farkın kendisi yukarıda yazılı.
 */

/**
 * Transfer aramasını taşıyan indekslerin adları.
 *
 * Şema tanımları (`players.ts` · `people.ts`) ve entegrasyon testleri buradan
 * okuyor; elle yazılan `down` (`drizzle/down/0011_transfer_search_indexes.sql`)
 * aynı adları taşıyor ve o eşleşme `round-trip.itest.ts`te iddia ediliyor.
 */
export const TRANSFER_SEARCH_INDEXES = {
  /** `players (primary_position, current_ability)` — eşitlik + aralık. */
  playersPositionAbility: 'players_primary_position_current_ability_idx',
  /** `people (birth_date)` — yaş yükleminin tarih aralığı. */
  peopleBirthDate: 'people_birth_date_idx',
} as const;

/**
 * Bir yaş aralığının karşılığı olan doğum tarihi aralığı. İki uç da **dahil**
 * (`birth_date BETWEEN from AND to`).
 */
export interface BirthDateRange {
  /** En erken doğum tarihi (`YYYY-MM-DD`), **dahil**. */
  readonly from: string;
  /** En geç doğum tarihi (`YYYY-MM-DD`), **dahil**. */
  readonly to: string;
}

/** `YYYY-MM-DD` — `people.birth_date` `mode: 'string'` ile bu biçimde dönüyor. */
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const isoDate = (utcMillis: number): string => new Date(utcMillis).toISOString().slice(0, 10);

/**
 * Bir tarihten `years` yıl çıkarır ve **ay taşmasını kelepçeler**.
 *
 * ⚠️ Kelepçe olmadan sessiz bir gün kayması doğuyor: `Date.UTC(1979, 1, 29)`
 * 1979-02-29 diye bir gün olmadığı için **1979-03-01** üretir, yani sonuç bir
 * sonraki aya taşar. Kelepçe taşmayı algılayıp ayın son gününe çekiyor
 * (1979-02-28) ve aşağıdaki iki sınır o zaman doğru çıkıyor — vakanın kendisi
 * `transfer-search.test.ts`te iddia ediliyor.
 */
const subtractYearsUtc = (year: number, month: number, day: number, years: number): number => {
  const targetYear = year - years;
  const candidate = Date.UTC(targetYear, month - 1, day);
  // Taşma denetimi: gün korunmadıysa ay bir ileri kaymıştır.
  if (new Date(candidate).getUTCMonth() !== month - 1) {
    // Ayın son günü = bir sonraki ayın 0. günü.
    return Date.UTC(targetYear, month, 0);
  }
  return candidate;
};

const DAY_MS = 86_400_000;

/**
 * `minAge`–`maxAge` yaş aralığını, `referenceDate` gününde o yaşta olan
 * kişilerin doğum tarihi aralığına çevirir.
 *
 * **Tanım.** Bir kişi `referenceDate` gününde `age` yaşındadır ancak ve ancak
 * `birthDate + age yıl <= referenceDate < birthDate + (age + 1) yıl`. Aralığın
 * iki ucu buradan çıkıyor:
 *
 * - `to = referenceDate - minAge yıl` — o gün **tam** `minAge` olan dahil
 * - `from = referenceDate - (maxAge + 1) yıl + 1 gün` — o gün `maxAge + 1`
 *   olan **hariç**
 *
 * ⚠️ **`referenceDate` PARAMETRE, `Date.now()` DEĞİL.** Çağrı anına bağlı bir
 * varsayılan, aynı girdiyle farklı çıktı üreten bir fonksiyon yapardı; 4.10'un
 * ölçümü ve Faz 32'nin sorgusu ikisi de tekrarlanabilir olmak zorunda (K2'nin
 * ruhu — bu paket motor değil ama aynı disiplin geçerli).
 *
 * @param minAge Aralığın alt ucu, dahil (tam yıl).
 * @param maxAge Aralığın üst ucu, dahil (tam yıl).
 * @param referenceDate Yaşın hangi gün hesaplandığı (`YYYY-MM-DD`).
 * @throws {RangeError} Biçim bozuksa, yaşlar negatifse veya `minAge > maxAge` ise.
 */
export function ageRangeToBirthDateRange(
  minAge: number,
  maxAge: number,
  referenceDate: string,
): BirthDateRange {
  if (!Number.isInteger(minAge) || !Number.isInteger(maxAge)) {
    throw new RangeError(`Yaş tam sayı olmalı: minAge=${String(minAge)}, maxAge=${String(maxAge)}`);
  }
  if (minAge < 0) {
    throw new RangeError(`Yaş negatif olamaz: minAge=${String(minAge)}`);
  }
  if (minAge > maxAge) {
    throw new RangeError(
      `minAge maxAge'i aşamaz: minAge=${String(minAge)}, maxAge=${String(maxAge)}`,
    );
  }

  const match = ISO_DATE.exec(referenceDate);
  if (match === null) {
    throw new RangeError(`referenceDate YYYY-MM-DD biçiminde olmalı: ${referenceDate}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  // Takvimde olmayan bir gün (`2026-02-30`) `Date.UTC` tarafından sessizce
  // kaydırılır — reddedilmesi gerekiyor, yoksa aralık sessizce kayar.
  if (isoDate(Date.UTC(year, month - 1, day)) !== referenceDate) {
    throw new RangeError(`referenceDate takvimde yok: ${referenceDate}`);
  }

  return {
    from: isoDate(subtractYearsUtc(year, month, day, maxAge + 1) + DAY_MS),
    to: isoDate(subtractYearsUtc(year, month, day, minAge)),
  };
}
