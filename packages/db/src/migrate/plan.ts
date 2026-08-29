/**
 * Migration planlaması — SAF katman.
 *
 * "Hangi migration'lar bekliyor", "geriye kaç adım gidilecek", "uygulanmış olanlar
 * hâlâ journal'la tutarlı mı" sorularının tamamı burada, veritabanına dokunmadan
 * cevaplanır. Sebep D5: bu mantığın hatası ancak gerçek bir veritabanına karşı
 * koşulunca görünürse, her denemesi bir konteyner açılışı (ölçüldü: 5.592 ms) eder
 * ve dallanmaların çoğu hiç sınanmaz.
 *
 * Koşucunun I/O yapan kısmı (`runner.ts`) mümkün olduğunca ince tutuldu; karar
 * verme burada.
 */
import { DomainError, ValidationError } from '@fms/shared';

import type { MigrationJournalEntry } from './journal.js';

/** Veritabanındaki takip tablosunda duran bir kayıt. */
export interface AppliedMigration {
  readonly tag: string;
  readonly idx: number;
  /** Uygulandığı andaki ileri SQL'in SHA-256'sı. */
  readonly hash: string;
}

/** Uygulanmayı bekleyen bir migration. */
export interface PendingMigration {
  readonly tag: string;
  readonly idx: number;
}

/**
 * Uygulanmış migration'ların journal ile hâlâ tutarlı olduğunu denetler.
 *
 * **Neden hash tutuluyor:** uygulanmış bir migration dosyası sonradan düzenlenirse
 * veritabanı ile depo sessizce ayrışır — `up` "yapacak bir şey yok" der, oysa şema
 * artık şemanın tanımını karşılamıyor. Bu, `dist` bayatlığının (Faz 1 hata #7)
 * veritabanı sürümüdür ve aynı sınıf sessizliği taşır.
 *
 * `hashOf` çağıranın verdiği bir fonksiyon: hash hesabı I/O ister (dosya okuma),
 * bu katman saf kalmalı.
 */
export function assertAppliedConsistent(
  applied: readonly AppliedMigration[],
  ordered: readonly MigrationJournalEntry[],
  hashOf: (tag: string) => string | undefined,
): void {
  const byTag = new Map(ordered.map((entry) => [entry.tag, entry]));

  for (const record of applied) {
    const entry = byTag.get(record.tag);
    if (entry === undefined) {
      throw new DomainError({
        message: 'Uygulanmış bir migration journal’da yok',
        code: 'migration.appliedMissingFromJournal',
        context: { tag: record.tag },
      });
    }
    if (entry.idx !== record.idx) {
      throw new DomainError({
        message: 'Uygulanmış migration’ın sırası journal ile uyuşmuyor',
        code: 'migration.appliedIdxMismatch',
        context: { tag: record.tag, veritabani: record.idx, journal: entry.idx },
      });
    }
    const currentHash = hashOf(record.tag);
    if (currentHash === undefined) {
      throw new DomainError({
        message: 'Uygulanmış migration’ın SQL dosyası bulunamıyor',
        code: 'migration.appliedFileMissing',
        context: { tag: record.tag },
      });
    }
    if (currentHash !== record.hash) {
      throw new DomainError({
        message: 'Uygulanmış migration dosyası sonradan değiştirilmiş',
        code: 'migration.appliedHashMismatch',
        context: { tag: record.tag },
      });
    }
  }
}

/**
 * Uygulanacak migration'ları sırayla döner.
 *
 * **Boşluk kabul edilmez.** Journal `[0,1,2]` iken yalnızca `[0,2]` uygulanmışsa
 * `1` sessizce atlanmış demektir; bu durumda `up` çalıştırmak `1`'i `2`'den SONRA
 * uygulardı ve şema tanımdan sapardı. `idx` sıralı olduğu için kontrol basit:
 * uygulananlar journal'ın bir **ön eki** olmalı.
 */
export function planUp(
  ordered: readonly MigrationJournalEntry[],
  applied: readonly AppliedMigration[],
): readonly PendingMigration[] {
  const appliedIdx = new Set(applied.map((record) => record.idx));

  for (let i = 0; i < appliedIdx.size; i += 1) {
    if (!appliedIdx.has(i)) {
      throw new DomainError({
        message: 'Uygulanmış migration dizisinde boşluk var',
        code: 'migration.appliedGap',
        context: { eksikIdx: i, uygulananSayisi: appliedIdx.size },
      });
    }
  }

  return ordered
    .filter((entry) => !appliedIdx.has(entry.idx))
    .map((entry) => ({ tag: entry.tag, idx: entry.idx }));
}

/**
 * Geri alınacak migration'ları sırayla (en yeniden en eskiye) döner.
 *
 * **`steps` ZORUNLU ve varsayılanı yok.** Çıplak bir "hepsini geri al" çağrısı,
 * yanlışlıkla koşulduğunda veritabanını boşaltır; niyetin açıkça yazılması
 * ucuz, kazayla tetiklenmesi pahalıdır.
 */
export function planDown(
  applied: readonly AppliedMigration[],
  steps: number,
): readonly AppliedMigration[] {
  if (!Number.isInteger(steps) || steps < 1) {
    throw new ValidationError({
      message: 'Geri alma adım sayısı 1 veya daha büyük bir tamsayı olmalı',
      code: 'migration.downStepsInvalid',
      context: { steps },
    });
  }
  if (steps > applied.length) {
    throw new ValidationError({
      message: 'Geri alma adım sayısı uygulanmış migration sayısını aşıyor',
      code: 'migration.downStepsTooMany',
      context: { steps, uygulanan: applied.length },
    });
  }

  return [...applied].sort((a, b) => b.idx - a.idx).slice(0, steps);
}
