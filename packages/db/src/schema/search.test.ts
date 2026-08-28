/**
 * `search.ts` — normalleştirme ifadesinin SÖZLEŞMESİ.
 *
 * ⚠️ **BU BİR "IMPORT TESTİ" DEĞİL — ayrım önemli.** `docs/ROADMAP.md` Faz 3
 * şunu yasaklıyor: *"bir testin onları import etmesi kapsamı %100 yapar,
 * hiçbir iddia doğrulanmadan."* Drizzle tablo dosyaları için doğru; burada
 * durum başka: `searchNormalizedSql` **saf bir fonksiyon** ve çıktısı iki ayrı
 * yerde birden kullanılıyor —
 *
 * - `clubs.ts` içindeki GIN indeksinin **ifadesi**,
 * - `search-index.itest.ts` içindeki **sorgunun** ifadesi.
 *
 * İkisi bir karakter ayrışırsa PostgreSQL indeksi **seçmez**: sorgu doğru cevabı
 * vermeye devam eder, yalnızca ardışık taramaya düşer ve **hiçbir kapı ötmez**
 * (D3). Entegrasyon testi bunu gerçek planla yakalıyor; bu birim testi ise
 * ifadeyi **yazılı bir sözleşme** hâline getiriyor, yani değişiklik kasıtlı
 * olmak zorunda.
 */
import { describe, expect, it } from 'vitest';

import { IMMUTABLE_UNACCENT_FN, REQUIRED_EXTENSIONS, searchNormalizedSql } from './search.js';

describe('searchNormalizedSql', () => {
  it('ifade BİREBİR sabit — indeks ve sorgu tarafı bundan üretiliyor', () => {
    expect(searchNormalizedSql('"name"')).toBe('immutable_unaccent(lower("name"))');
  });

  /**
   * `lower()` **içeride** olmak zorunda: `unaccent(lower(x))` ile
   * `lower(unaccent(x))` farklı ifadelerdir ve ikincisi indeksi kullanamaz.
   * Sıra bir tercih değil, indeksin tanımı.
   */
  it('lower() unaccent’in İÇİNDE — sıra indeks tanımının parçası', () => {
    const expression = searchNormalizedSql('x');
    expect(expression.indexOf(IMMUTABLE_UNACCENT_FN)).toBeLessThan(expression.indexOf('lower('));
  });

  it('sarmalayıcı adı migration ile aynı sabitten geliyor', () => {
    expect(IMMUTABLE_UNACCENT_FN).toBe('immutable_unaccent');
    expect(searchNormalizedSql('c')).toContain(`${IMMUTABLE_UNACCENT_FN}(`);
  });

  it('iki uzantı da isteniyor — biri eksikse indeks kurulamaz', () => {
    expect([...REQUIRED_EXTENSIONS]).toEqual(['pg_trgm', 'unaccent']);
  });
});
