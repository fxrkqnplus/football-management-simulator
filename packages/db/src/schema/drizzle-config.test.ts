/**
 * `drizzle.config.ts` ŞEMA DESENİNİN KAPSAM DENETİMİ — Faz 3.5.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * NEDEN BİR TEST, YALNIZCA BİR YORUM DEĞİL
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Desen `'./src/schema/*.ts'` iken `drizzle-kit generate` test dosyalarını da
 * **çalıştırmaya** kalkıyordu ve `Vitest cannot be imported in a CommonJS
 * module` ile kırılıyordu. 3.4'te görünmemesinin sebebi sıraydı: migration,
 * testler yazılmadan önce üretilmişti.
 *
 * Düzeltme bir extglob (`!(*.test|*.test-d)`) ve **bir sonraki oturum bunu
 * kolayca geri alabilir** — `*.ts` daha basit görünüyor ve hata ancak `generate`
 * çağrıldığında, yani ayda bir, ortaya çıkıyor. `spec/09` §11.4'ün kuralı tam
 * bu sınıf için: *"kapsamı yazılı olmayan bir kapı sessizce daralabilir"* — ve
 * §11.5'in eklediği: **bir kuralın yazılı olması, sınandığı anlamına gelmez.**
 *
 * ⚠️ **BU TEST NE KANITLAR, NE KANITLAMAZ.** Node'un `fs.globSync`i ile
 * `drizzle-kit`in kullandığı `glob` paketi **ayrı uygulamalar**; bu test
 * desenin *niyetini* (test dosyalarını dışla, geri kalanını al) Node'un
 * globuyla doğruluyor. `drizzle-kit`in aynı fikirde olduğunun kanıtı ayrı ve
 * ölçülmüş: üretilen `0002_club_core.sql` **8 tablo** içeriyor ve
 * `round-trip.itest.ts` tablo listesini gerçek veritabanından okuyup adıyla
 * iddia ediyor. İki araç, iki kanıt.
 */
import { globSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import drizzleConfig from '../../drizzle.config.js';

const PACKAGE_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SCHEMA_DIR = fileURLToPath(new URL('./', import.meta.url));

/** `drizzle-kit` bir dosyayı ÇALIŞTIRARAK okuduğu için dışlanması gereken sonekler. */
const TEST_SUFFIXES = ['.test.ts', '.test-d.ts'] as const;

const isTestFile = (name: string): boolean => TEST_SUFFIXES.some((suffix) => name.endsWith(suffix));

function patternMatches(): string[] {
  const pattern = drizzleConfig.schema;
  if (typeof pattern !== 'string') {
    throw new TypeError('drizzle.config.ts `schema` tek bir desen olmalı');
  }
  return globSync(pattern, { cwd: PACKAGE_ROOT })
    .map((entry) => entry.replace(/\\/g, '/').split('/').pop() ?? '')
    .sort();
}

describe('drizzle.config.ts — şema deseni', () => {
  it('çıktı dizini migration koşucusunun okuduğu yer', () => {
    expect(drizzleConfig.out).toBe('./drizzle');
    expect(drizzleConfig.dialect).toBe('postgresql');
  });

  /**
   * ⚠️ NÖBETÇİNİN KENDİSİ — bu iddia olmadan aşağıdaki test BOŞ geçerdi.
   *
   * Dışlanacak dosya kalmasaydı "test dosyası seçilmedi" iddiası bedavaya
   * sağlanırdı: boş bir kümeyi boş bir kümeyle karşılaştıran bir test de
   * "fark yok" der (§11.5, `comparedFacts` dersinin aynısı).
   */
  it('dizinde GERÇEKTEN dışlanacak bir dosya var', () => {
    const excluded = readdirSync(SCHEMA_DIR).filter(isTestFile);
    expect(excluded.length).toBeGreaterThan(0);
  });

  it('hiçbir test dosyası seçilmiyor', () => {
    expect(patternMatches().filter(isTestFile)).toEqual([]);
  });

  /**
   * Desen dışlamayı yaparken **fazla da dışlamamalı**: yeni bir tablo dosyası
   * sessizce kapsam dışında kalırsa migration'a hiç girmez. İddia bir eşitlik,
   * bir alt küme değil.
   */
  it('test olmayan HER `.ts` dosyası seçiliyor — eksiksiz', () => {
    const expected = readdirSync(SCHEMA_DIR)
      .filter((name) => name.endsWith('.ts') && !isTestFile(name))
      .sort();

    expect(patternMatches()).toEqual(expected);
  });
});
