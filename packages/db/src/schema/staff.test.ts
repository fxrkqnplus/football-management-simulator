/**
 * `staff` ENVANTER TESTİ — 12 rol `spec/01` §3.1'den SAYILDI, ROADMAP'ten değil.
 *
 * ⚠️ **İKİ AYRI İDDİA VAR VE İKİSİ DE GEREKLİ:**
 * ① küme **kapalı ve on iki değerli** (liste iddiası — sayı iddiası değil;
 *    *"özetler körlenebilir, envanterler kör kalmaz"*)
 * ② `staff_roles` **tablosu açılmadı** ve o kararın gerekçesi bugün de geçerli.
 *
 * ②'nin gerekçesi bir **belgenin durumuna** dayanıyor (`spec/01` rolleri satır
 * içi yazıyor ve `staff_roles` için hiçbir sütun tanımlamıyor). Belge değişirse
 * karar da değişmeli ve o an burada görünür olmalı — `player-traits.test.ts`in
 * deseni, ters yönde: orada küme sayılamadığı için CHECK **yoktu**, burada
 * sayılabildiği için **var**.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getTableColumns } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { players } from './players.js';
import { staff, STAFF_ROLES } from './staff.js';

const columns = getTableColumns(staff);
const roles = [...STAFF_ROLES];

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const readDoc = (relative: string): string => readFileSync(path.join(REPO_ROOT, relative), 'utf8');

describe('STAFF_ROLES — `spec/01` §3.1 envanteri', () => {
  it('ON İKİ rol — spec sırasıyla, EKSİKSİZ', () => {
    expect(roles).toEqual([
      'assistant_manager',
      'attacking_coach',
      'defending_coach',
      'fitness_coach',
      'gk_coach',
      'technical_coach',
      'physio',
      'sports_scientist',
      'scout',
      'data_analyst',
      'youth_manager',
      'youth_coach',
    ]);
  });

  it('sayı 12 ve 12`sinin de adı BENZERSİZ', () => {
    expect(roles).toHaveLength(12);
    expect(new Set(roles).size).toBe(12);
  });

  /**
   * ⚠️ **KÜMENİN KAYNAĞI BELGEDEN DOĞRULANIYOR — SAPMA-001'in çaresi.**
   *
   * Sayı ROADMAP'te de 12 yazıyor ve **oradan alınmadı**. Bu test kümenin her
   * elemanını `spec/01`'de arıyor: biri spec'te yokken sabite eklenirse (ya da
   * spec'ten silinip sabitte kalırsa) burada görünür.
   */
  it('on iki rolün on ikisi de `spec/01` §3.1 metninde GEÇİYOR', () => {
    const spec = readDoc('docs/spec/01-database.md');
    const missing = roles.filter((role) => !spec.includes(`'${role}'`));
    expect(missing).toEqual([]);
  });
});

describe('staff tablosu', () => {
  it('altı sütun, TAM SIRASIYLA', () => {
    expect(Object.keys(columns)).toEqual([
      'id',
      'personId',
      'clubId',
      'role',
      'createdAt',
      'updatedAt',
    ]);
  });

  it('sütunlar snake_case adlarını taşıyor', () => {
    expect(columns.personId.name).toBe('person_id');
    expect(columns.clubId.name).toBe('club_id');
    expect(columns.role.name).toBe('role');
  });

  /**
   * ⚠️ **`person_id` UNIQUE DEĞİL — VE BU `players` İLE ÖLÇÜLMÜŞ BİR FARK.**
   *
   * `spec/01` `players`ı `personId: FK UNIQUE`, `staff`ı yalnızca `personId FK`
   * diye yazıyor. Aynı kişi bir kulüpte kondisyon antrenörü, başkasında
   * gözlemci olabilir. Bu iddia yazılmasaydı bir gün *"tutarlılık"* gerekçesiyle
   * UNIQUE eklenebilir ve hiçbir şey ötmezdi.
   */
  it('`person_id` UNIQUE DEĞİL — bir kişi birden çok personel satırı taşıyabilir', () => {
    expect(columns.personId.isUnique).toBeFalsy();
  });

  /**
   * ⚠️ **KARŞI KONTROL — YUKARIDAKİ İDDİA ONSUZ HİÇBİR ŞEY ÖLÇMEZ (D3).**
   *
   * `isUnique` var olmayan bir alan olsaydı `undefined` dönerdi ve
   * `toBeFalsy()` yine geçerdi — yani test kör bir kontrolle de yeşil kalırdı.
   * `players.person_id` UNIQUE ve bu satır alanın gerçekten okunduğunu
   * gösteriyor. *"Bakacak bir şey bulamayan kapı onay değildir."*
   */
  it('KARŞI KONTROL — `players.person_id` UNIQUE, yani alan gerçekten okunuyor', () => {
    expect(getTableColumns(players).personId.isUnique).toBe(true);
  });

  it('`person_id` NOT NULL, `club_id` NULLABLE — işsiz personel geçerli', () => {
    expect(columns.personId.notNull).toBe(true);
    expect(columns.clubId.notNull).toBe(false);
  });

  it('`role` düz `text` — küme CHECK ile, tip ile değil', () => {
    expect(columns.role.getSQLType()).toBe('text');
    expect(columns.role.notNull).toBe(true);
  });

  /**
   * §3.1.0 sütunları TAŞINMIYOR — ve karar bir karşı-ölçümle verildi:
   * `key` taşımak `staff.club_id`i `SET NULL` yerine RESTRICT yapardı
   * (`fk-policy.ts` ② kaynağın `independent` olmasına bakıyor). Gerekçenin
   * tamamı `staff.ts` başlığında.
   */
  it('`key` / `source` / `external_ids` TAŞIMIYOR — kimliği kişiden geliyor', () => {
    const names = Object.keys(columns);
    expect(names).not.toContain('key');
    expect(names).not.toContain('source');
    expect(names).not.toContain('externalIds');
  });
});

describe('`staff_roles` TABLOSU AÇILMADI — gerekçe bugün de geçerli mi', () => {
  /**
   * 4.1 `staff_roles`ü `injury_types`tan **ayırdı**: ayraç *"kapalı küme
   * ETİKET mi, VERİ TAŞIYAN SATIR mı?"*. Bu test ayracın girdisini denetliyor:
   * `spec/01` rolleri hâlâ satır içi bir küme olarak yazıyor mu?
   *
   * ⚠️ Bir kararı kopyalamadan önce gerekçesinin hâlâ geçerli olduğu sorulur —
   * ve bu soru bir temenni değil, koşan bir adım olmalı (SAPMA-033).
   */
  it('`spec/01` rolleri hâlâ SATIR İÇİ kapalı küme olarak yazıyor', () => {
    const spec = readDoc('docs/spec/01-database.md');
    expect(spec).toContain("role: 'assistant_manager'");
  });

  it('`spec/01` `staff_roles` için HİÇBİR sütun tanımı taşımıyor', () => {
    const spec = readDoc('docs/spec/01-database.md');
    expect(spec).not.toContain('staff_roles: {');
  });
});
