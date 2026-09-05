/**
 * Tema CSS'ini `packages/ui/src/tokens/`ten ÜRETİR.
 *
 * Tek kaynak TypeScript; bu betik ikinci temsili bir **artefakta** indiriyor.
 * Tazeliğini `packages/ui/src/theme/css-projection.test.ts` tutuyor: yeniden
 * üretip diskle birebir karşılaştırıyor, yani bayat bir dosya `pnpm test`i
 * kırar.
 *
 * Emsal: `docs/schema/world.md`nin ER bloğu da üretilmiş bir artefakt ve
 * tazeliğini bir test tutuyor.
 *
 * ⚠️ Betik `dist`ten okuyor, kaynaktan değil — yani `pnpm build` ÖNCE koşmalı.
 * Gerekçe: `packages/ui` TypeScript ve bu betik düz Node; derlenmiş çıktıyı
 * okumak, ikinci bir derleme yolu (ts-node/tsx) eklemekten ucuz ve **üretimde
 * çalışan kodun aynısını** ölçüyor (D5'in ruhu).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST_ENTRY = join(REPO_ROOT, 'packages/ui/dist/theme/css-projection.js');

const { renderTokenCss, GENERATED_CSS_PATH } = await import(pathToFileURL(DIST_ENTRY).href);

const target = join(REPO_ROOT, GENERATED_CSS_PATH);
const next = renderTokenCss();

/**
 * ⚠️ `console` KULLANILMIYOR — `eslint.config.js`in K8 bloğu bunu adıyla
 * yazıyor: *"Bootstrap betikleri (scripts/) console kullanmaz, doğrudan
 * process.stderr'e yazar; bu yüzden onlara istisna GEREKMİYOR."* Bir muafiyet
 * açmak yerine var olan sözleşmeye uyuluyor.
 */
const say = (message) => {
  process.stdout.write(`${message}\n`);
};

let previous;
try {
  previous = readFileSync(target, 'utf8');
} catch {
  previous = undefined;
}

if (previous === next) {
  say(`theme css: guncel (${GENERATED_CSS_PATH})`);
  process.exit(0);
}

writeFileSync(target, next, 'utf8');
say(
  previous === undefined
    ? `theme css: olusturuldu (${GENERATED_CSS_PATH})`
    : `theme css: guncellendi (${GENERATED_CSS_PATH})`,
);
