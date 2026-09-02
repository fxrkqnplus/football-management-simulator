/**
 * `player_traits` ENVANTER TESTİ.
 *
 * ⚠️ **BU DOSYANIN ASIL İDDİASI BİR YOKLUK HAKKINDA: `trait_code` CHECK ALMIYOR.**
 * Ve *"kısıt eklemeyi unuttuk"* ile *"kısıt bilerek konmadı"* **aynı şemayı
 * üretir** — ayıran tek şey koşan bir iddiadır (4.5'in kriter 4 kararı).
 *
 * Kısıtın gerçekten yok olduğu **katalogdan** okunuyor
 * (`schema-constraints.itest.ts`, `pg_constraint`); birim testi Postgres'e
 * sormaz (2.3b). Burada sabitlenen şey kararın **gerekçesi**: kümenin
 * sayılabilir olmadığı. Gerekçe kırılırsa (biri `spec/02`'ye 30 kodu yazarsa)
 * kararın yeniden verilmesi gerekir ve bu test o anı görünür kılıyor.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getTableColumns } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { playerTraits } from './player-traits.js';

const columns = getTableColumns(playerTraits);

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const readDoc = (relative: string): string => readFileSync(path.join(REPO_ROOT, relative), 'utf8');

describe('player_traits tablosu', () => {
  it('dört sütun, TAM SIRASIYLA', () => {
    expect(Object.keys(columns)).toEqual(['playerId', 'traitCode', 'createdAt', 'updatedAt']);
  });

  it('sütunlar snake_case adlarını taşıyor', () => {
    expect(columns.playerId.name).toBe('player_id');
    expect(columns.traitCode.name).toBe('trait_code');
  });

  it('iki veri sütunu da `NOT NULL` — ikisi de bileşik PK parçası', () => {
    expect(columns.playerId.notNull).toBe(true);
    expect(columns.traitCode.notNull).toBe(true);
  });

  it('`trait_code` düz `text` — sabit bir kümeye BAĞLANMIYOR', () => {
    expect(columns.traitCode.getSQLType()).toBe('text');
  });

  it('ayrı bir `id` sütunu YOK — bileşik PK aynı yeteneğin tekrarını engelliyor', () => {
    expect(Object.keys(columns)).not.toContain('id');
  });
});

describe('CHECK YOKLUĞUNUN GEREKÇESİ — küme SAYILAMIYOR, ölçüldü', () => {
  /**
   * §3.1.2 ②'nin ayracı *"kapalı küme mi, açık uçlu mu"*. Bir kümenin kapalı
   * olduğunu iddia edebilmek için sayılabilir olması gerekiyor. `spec/02`
   * nitelik sisteminin kaynağı ve özel yeteneklerden **hiç söz etmiyor** —
   * yani sayılacak bir liste bugün yok.
   *
   * ⚠️ Bu test bir belgeyi okuyor ve bu bilinçli: karar o belgenin **durumuna**
   * dayanıyor. Belge değişirse karar da değişmeli, ve o an burada görünür olmalı
   * — 4.1'in doğrulama betiğiyle aynı desen (günlük #6: iddia, iddianın yaşadığı
   * yapıda aranır).
   */
  it('`spec/02` özel yeteneklerden HİÇ söz etmiyor — küme orada tanımlı değil', () => {
    const spec = readDoc('docs/spec/02-attributes.md');
    expect(spec).not.toMatch(/\btrait/i);
    expect(spec).not.toMatch(/\bPPM\b/);
  });

  /**
   * ROADMAP'in kendi ifadesi *"~30 özellik"* — bir **tahmin**, bir sözleşme
   * değil. Tilde kaybolursa (biri *"30 özellik"* yazarsa) küme kapanmaya
   * aday hâle gelir ve bu karar yeniden sorulmalıdır.
   */
  it('ROADMAP Faz 10 sayıyı YAKLAŞIK veriyor — kapalı bir küme iddia etmiyor', () => {
    const roadmap = readDoc('docs/ROADMAP.md');
    expect(roadmap).toContain('**Özel yetenekler (traits/PPM):** ~30 özellik');
  });

  /**
   * ⚠️ **KARŞI ÖRNEK — AYRAÇ AYNI FAZDA İKİ FARKLI CEVAP ÜRETTİ.**
   * `player_positions.position` sayılabilir bir kümeydi ve CHECK aldı; burada
   * sayılamıyor ve almadı. Bu iddia olmasaydı *"4.6 CHECK koymayı unuttu"*
   * okuması mümkün olurdu.
   */
  it('KARŞI ÖRNEK — aynı fazın `player_positions` kümesi spec`te SAYILI', () => {
    const spec = readDoc('docs/spec/01-database.md');
    // Biçim spec'ten OKUNDU, hatırlanmadı: küme bir tip birleşimi olarak değil,
    // `text` sütununun yanındaki bir yorum olarak yazılı — ilk yazımda birleşim
    // sanıldı ve test reddetti.
    expect(spec).toContain(
      "primaryPosition: text          // 'GK','DC','DL','DR','DM','MC','ML','MR','AMC','AML','AMR','ST'",
    );
  });
});
