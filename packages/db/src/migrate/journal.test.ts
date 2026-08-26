import { describe, expect, it } from 'vitest';

import { orderJournalEntries, parseMigrationJournal } from './journal.js';

const entry = (idx: number, tag: string): Record<string, unknown> => ({
  idx,
  version: '7',
  when: 1787754340213 + idx,
  tag,
  breakpoints: true,
});

const journal = (...entries: Record<string, unknown>[]): string =>
  JSON.stringify({ version: '7', dialect: 'postgresql', entries });

describe('parseMigrationJournal', () => {
  it('geçerli journal’ı ayrıştırır', () => {
    const parsed = parseMigrationJournal(journal(entry(0, '0000_countries_initial')));
    expect(parsed.entries).toHaveLength(1);
    expect(parsed.entries[0]?.tag).toBe('0000_countries_initial');
  });

  it('JSON olmayan girdiyi tipli hatayla reddeder', () => {
    expect(() => parseMigrationJournal('{ bozuk')).toThrow(
      expect.objectContaining({ code: 'migration.journalNotJson' }),
    );
  });

  it('şemaya uymayan journal’ı reddeder', () => {
    expect(() => parseMigrationJournal('{"version":"7"}')).toThrow(
      expect.objectContaining({ code: 'migration.journalInvalid' }),
    );
  });

  it('postgresql olmayan lehçeyi reddeder', () => {
    const foreign = JSON.stringify({ version: '7', dialect: 'mysql', entries: [] });
    expect(() => parseMigrationJournal(foreign)).toThrow(
      expect.objectContaining({ code: 'migration.journalInvalid' }),
    );
  });

  // Biçim kısıtı iki iş görüyor: drizzle'ın çıktısını sabitlemek ve `tag`in SQL
  // dizgesine güvenle enterpolasyonunu mümkün kılmak (journal.ts başlığı).
  it.each([
    ['boşluk taşıyan tag', '0000 countries'],
    ['tırnak taşıyan tag', "0000_a'; DROP TABLE x; --"],
    ['sayı öneki olmayan tag', 'countries_initial'],
    ['büyük harf taşıyan tag', '0000_Countries'],
  ])('%s reddedilir', (_name, tag) => {
    expect(() => parseMigrationJournal(journal(entry(0, tag)))).toThrow(
      expect.objectContaining({ code: 'migration.journalInvalid' }),
    );
  });

  it('aynı idx iki kez geçerse reddeder', () => {
    expect(() => parseMigrationJournal(journal(entry(0, '0000_a'), entry(0, '0001_b')))).toThrow(
      expect.objectContaining({ code: 'migration.journalDuplicateIdx' }),
    );
  });

  it('aynı tag iki kez geçerse reddeder', () => {
    expect(() => parseMigrationJournal(journal(entry(0, '0000_a'), entry(1, '0000_a')))).toThrow(
      expect.objectContaining({ code: 'migration.journalDuplicateTag' }),
    );
  });
});

describe('orderJournalEntries', () => {
  it('dosyadaki sıradan bağımsız olarak idx’e göre sıralar', () => {
    const parsed = parseMigrationJournal(
      journal(entry(2, '0002_c'), entry(0, '0000_a'), entry(1, '0001_b')),
    );
    expect(orderJournalEntries(parsed).map((item) => item.tag)).toEqual([
      '0000_a',
      '0001_b',
      '0002_c',
    ]);
  });

  it('idx dizisindeki boşluğu yakalar', () => {
    const parsed = parseMigrationJournal(journal(entry(0, '0000_a'), entry(2, '0002_c')));
    expect(() => orderJournalEntries(parsed)).toThrow(
      expect.objectContaining({ code: 'migration.journalIdxGap' }),
    );
  });

  it('boş journal’ı kabul eder', () => {
    expect(orderJournalEntries(parseMigrationJournal(journal()))).toEqual([]);
  });
});
