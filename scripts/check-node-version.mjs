/**
 * Node sürüm kapısı — `pnpm install` öncesinde çalışır (kök `preinstall`).
 *
 * NEDEN VAR: `.npmrc` içindeki `engine-strict=true`, pnpm'de yalnızca
 * BAĞIMLILIKLARIN `engines` alanını zorlar; kök projenin kendi `engines.node`
 * alanı için sadece [WARN] basar ve kuruluma devam eder. Yani tek başına koruma
 * değildir. Bu betik o boşluğu kapatır ve yanlış runtime'da kurulumu DURDURUR.
 *
 * Tek doğruluk kaynağı `.nvmrc`'dir.
 *
 * NOT: Bu bir önyükleme (bootstrap) betiğidir — `packages/shared/logger` daha
 * kurulmamışken çalışır, bu yüzden logger kullanamaz. `console` da kullanmaz
 * (K8); doğrudan stderr'e yazar. `scripts/` klasörü `arch:check` kapsamı
 * dışındadır (bkz. alt görev 1.6).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const wanted = readFileSync(join(root, '.nvmrc'), 'utf8').trim();
const current = process.versions.node;

const major = (v) => Number.parseInt(v.split('.')[0], 10);

if (major(current) !== major(wanted)) {
  process.stderr.write(
    `\n  ✖ Yanlış Node sürümü.\n\n` +
      `    Gereken : v${wanted}  (.nvmrc)\n` +
      `    Bulunan : v${current}\n\n` +
      `    Üretim Oracle Ampere A1 (ARM64) üzerinde Node ${major(wanted)} LTS ile çalışır.\n` +
      `    Farklı bir majör sürümde kurulan bağımlılıklar yerelde çalışıp üretimde patlar.\n\n` +
      `    Çözüm:\n` +
      `      fnm install ${wanted} && fnm use ${wanted}\n` +
      `      nvm install ${wanted} && nvm use ${wanted}\n\n`,
  );
  process.exit(1);
}
