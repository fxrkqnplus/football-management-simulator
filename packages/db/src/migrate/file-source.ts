/**
 * `MigrationSource`ın dosya sistemi uygulaması.
 *
 * Dosya düzeni:
 *   <dir>/meta/_journal.json          — sıralama (drizzle-kit üretir)
 *   <dir>/<tag>.sql                   — ileri yönlü SQL (drizzle-kit üretir)
 *   <dir>/down/<tag>.sql              — geri alma SQL'i (ELLE yazılır)
 *
 * **Geri alma dosyaları neden ayrı dizinde:** `drizzle-kit` `<dir>` altındaki
 * `.sql` dosyalarını kendi dosyaları sayıyor. `<tag>.down.sql` biçimi bugün
 * çalışsa da, aracın bir sonraki sürümünün o deseni nasıl yorumlayacağı bizim
 * kontrolümüzde değil. Ayrı dizin, sahiplik sınırını belirsizliğe bırakmıyor:
 * kök `drizzle-kit`in, `down/` bizim.
 */
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { MigrationSource } from './runner.js';

async function readOptional(file: string): Promise<string | null> {
  try {
    return await readFile(file, 'utf8');
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === 'ENOENT'
    ) {
      return null;
    }
    throw error;
  }
}

/**
 * Verilen dizin üzerinde çalışan bir kaynak üretir.
 *
 * `hashUp` SHA-256 kullanıyor: amaç kriptografik değil, **değişiklik tespiti**.
 * Uygulanmış bir migration dosyası sonradan düzenlenirse veritabanı ile depo
 * sessizce ayrışır ve `up` "yapacak bir şey yok" der (`plan.ts`
 * → `assertAppliedConsistent`).
 */
export function createFileMigrationSource(directory: string): MigrationSource {
  const upFile = (tag: string): string => path.join(directory, `${tag}.sql`);
  const downFile = (tag: string): string => path.join(directory, 'down', `${tag}.sql`);

  return {
    readJournal: async (): Promise<string> =>
      readFile(path.join(directory, 'meta', '_journal.json'), 'utf8'),

    readUp: async (tag: string): Promise<string> => readFile(upFile(tag), 'utf8'),

    readDown: async (tag: string): Promise<string | null> => readOptional(downFile(tag)),

    hashUp: async (tag: string): Promise<string> => {
      const contents = await readFile(upFile(tag), 'utf8');
      // Satır sonu normalize ediliyor: aynı dosya Windows'ta CRLF, CI'da LF ile
      // okunursa hash ayrışır ve `assertAppliedConsistent` var olmayan bir
      // "dosya değişmiş" hatası verirdi. `.gitattributes` LF'i zorluyor ama
      // hash'in buna bağımlı olması gereksiz bir kırılganlık (ADR-0004 §3).
      return createHash('sha256').update(contents.replace(/\r\n/g, '\n')).digest('hex');
    },
  };
}
