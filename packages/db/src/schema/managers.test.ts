/**
 * `managers` TESTİ — iki kapalı küme, bir açık uçlu küme, bir aralık.
 *
 * ⚠️ **BU DOSYANIN EN DEĞERLİ İDDİASI BİR YOKLUK HAKKINDA: `user_id` SÜTUNU
 * YAZILMADI.** *"Sütunu eklemeyi unuttuk"* ile *"sütun bilerek yazılmadı"*
 * aynı şemayı üretir — ayıran tek şey koşan bir iddiadır. Faz 13 sütunu
 * eklediğinde bu test **kırılacak** ve o an kararın bilinçli olduğu görünecek
 * (4.5'in kriter 4 kararının biçimi, tersine çevrilmişi).
 *
 * İkinci iddia §3.1.2 ②'nin ayracının **aynı dosyada iki farklı cevap**
 * üretmesi: `coaching_badge` ve `experience_level` CHECK alıyor, `philosophy`
 * ve `reputation` almıyor. Kısıtların gerçek varlığı/yokluğu **katalogdan**
 * okunuyor (`schema-constraints.itest.ts`); burada sabitlenen şey kararın
 * **gerekçesi**.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getTableColumns } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { COACHING_BADGES, MANAGER_EXPERIENCE_LEVELS, managers } from './managers.js';

const columns = getTableColumns(managers);
const badges = [...COACHING_BADGES];
const levels = [...MANAGER_EXPERIENCE_LEVELS];

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const readDoc = (relative: string): string => readFileSync(path.join(REPO_ROOT, relative), 'utf8');

describe('managers tablosu', () => {
  it('on iki sütun, TAM SIRASIYLA', () => {
    expect(Object.keys(columns)).toEqual([
      'id',
      'personId',
      'clubId',
      'isUserManager',
      'coachingBadge',
      'experienceLevel',
      'philosophy',
      'reputation',
      'experiencePoints',
      'spokenLanguages',
      'createdAt',
      'updatedAt',
    ]);
  });

  it('sütunlar snake_case adlarını taşıyor', () => {
    expect(columns.personId.name).toBe('person_id');
    expect(columns.clubId.name).toBe('club_id');
    expect(columns.isUserManager.name).toBe('is_user_manager');
    expect(columns.coachingBadge.name).toBe('coaching_badge');
    expect(columns.experienceLevel.name).toBe('experience_level');
    expect(columns.experiencePoints.name).toBe('experience_points');
    expect(columns.spokenLanguages.name).toBe('spoken_languages');
  });

  it('`person_id` NOT NULL, `club_id` NULLABLE — işsiz menajer geçerli', () => {
    expect(columns.personId.notNull).toBe(true);
    expect(columns.clubId.notNull).toBe(false);
  });

  /**
   * ⚠️ **DEFAULT YOK — `clubs.is_national` ve `source` ile aynı ilke.**
   * Bir varsayılan, kimsenin belirtmediği satıra *"bu bir AI menajeri"* bilgisini
   * **uydururdu** (SAPMA-026). Unutulursa `INSERT` gürültülü patlar.
   */
  it('`is_user_manager` VARSAYILAN ALMIYOR', () => {
    expect(columns.isUserManager.notNull).toBe(true);
    expect(columns.isUserManager.hasDefault).toBe(false);
  });

  /**
   * ⚠️ **KARŞI KONTROL — yukarıdaki iddia onsuz hiçbir şey ölçmez (D3).**
   * `hasDefault` yanlış yazılmış bir alan adı olsaydı `undefined` dönerdi ve
   * `toBe(false)` **kırılırdı** — ama `false` dönen bir sabit de aynı sonucu
   * verirdi. `created_at` `defaultNow()` taşıyor: bu satır alanın gerçekten
   * değiştiğini gösteriyor.
   */
  it('KARŞI KONTROL — `created_at` VARSAYILAN TAŞIYOR, yani alan gerçekten okunuyor', () => {
    expect(columns.createdAt.hasDefault).toBe(true);
  });

  it('`experience_points` `integer` — `smallint` değil, üst sınırı yok', () => {
    expect(columns.experiencePoints.getSQLType()).toBe('integer');
    expect(columns.reputation.getSQLType()).toBe('smallint');
  });

  it('`spoken_languages` bir DİZİ sütunu — şemanın ikincisi', () => {
    expect(columns.spokenLanguages.getSQLType()).toBe('text[]');
    expect(columns.spokenLanguages.notNull).toBe(true);
  });
});

describe('⚠️ `user_id` YAZILMADI — SAPMA-032 / G-16, Faz 13', () => {
  /**
   * `spec/01` §3.1 `managers`ı `userId FK nullable` ile yazıyor. Sütun bilerek
   * **eklenmedi**: `users` §3.2 save katmanında ve Faz 13'te doğuyor; kısıtsız
   * bir sütun *"tüm yabancı anahtarlar tanımlı"* kriterini görünürde sağlayıp
   * gerçekte delerdi — Faz 3'ün üç ileri FK'sıyla aynı sınıf.
   */
  it('tabloda `userId` sütunu YOK', () => {
    expect(Object.keys(columns)).not.toContain('userId');
  });

  it('`spec/01` sütunu HÂLÂ istiyor — yani bu bir eksiklik değil, ERTELEME', () => {
    const spec = readDoc('docs/spec/01-database.md');
    expect(spec).toContain('userId FK nullable');
  });

  it('`is_user_manager` onun yerini TUTMUYOR — iki ayrı soru', () => {
    // Biri "bir insan mı oynuyor", diğeri "hangi insan". İkincisi Faz 13'te.
    expect(Object.keys(columns)).toContain('isUserManager');
    expect(Object.keys(columns)).not.toContain('userId');
  });
});

describe('COACHING_BADGES / MANAGER_EXPERIENCE_LEVELS — kapalı kümeler', () => {
  it('BEŞ antrenörlük lisansı — spec sırasıyla', () => {
    expect(badges).toEqual(['none', 'c', 'b', 'a', 'pro']);
    expect(new Set(badges).size).toBe(5);
  });

  it('BEŞ deneyim seviyesi — spec sırasıyla', () => {
    expect(levels).toEqual([
      'amateur',
      'former_player_lower',
      'former_player_mid',
      'former_player_top',
      'professional',
    ]);
    expect(new Set(levels).size).toBe(5);
  });

  it('iki kümenin elemanları da `spec/01` metninde GEÇİYOR', () => {
    const spec = readDoc('docs/spec/01-database.md');
    const missing = [...badges, ...levels].filter((value) => !spec.includes(`'${value}'`));
    expect(missing).toEqual([]);
  });
});

describe('CHECK ALMAYANLARIN GEREKÇESİ — §3.1.2 ② aynı dosyada İKİ CEVAP verdi', () => {
  /**
   * ⚠️ **`philosophy` — küme `...` ile bitiyor, yani SAYILAMIYOR.**
   *
   * 4.6'nın `player_traits.trait_code` gerekçesinin birebir aynısı; aradaki tek
   * fark orada kümenin **hiç**, burada **eksik** tanımlı olması. Bir kümenin
   * kapalı olduğunu iddia edebilmek için sayılabilir olması gerekiyor.
   *
   * Bu test belgenin **durumunu** okuyor: biri bir gün kümeyi tamamlarsa karar
   * yeniden verilmeli ve o an burada görünmeli.
   */
  it('`spec/01` felsefe kümesini `...` ile AÇIK UÇLU bırakıyor', () => {
    const spec = readDoc('docs/spec/01-database.md');
    expect(spec).toContain("'attacking'|'control'|'balanced'|...");
  });

  it('`philosophy` düz `text` — sabit bir kümeye BAĞLANMIYOR', () => {
    expect(columns.philosophy.getSQLType()).toBe('text');
    expect(columns.philosophy.notNull).toBe(true);
  });

  /**
   * `reputation` (0-200) bir **aralık**, yani §3.1.2 ②'ye göre kalibrasyon —
   * `competitions.reputation` ve `stadiums.pitch_quality` ile aynı sınıf.
   * Denetimin yeri Faz 11 (`pnpm validate:world`).
   */
  it('`reputation` bir ARALIK — kalibrasyon, denetimi Faz 11', () => {
    const spec = readDoc('docs/spec/01-database.md');
    // Aralık yorumu spec'te duruyor; kapalı bir küme DEĞİL, yani CHECK yok.
    expect(spec).toMatch(/reputation:\s*smallint,\s*\/\/ 0-200/);
  });
});
