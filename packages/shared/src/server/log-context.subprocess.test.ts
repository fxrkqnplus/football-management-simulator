import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { beforeAll, describe, expect, it } from 'vitest';

import { createCorrelationId, isCorrelationId } from '../correlation.js';
import { serializeLogContext } from '../log-context.js';
import { REDACTED } from '../redact.js';

/**
 * ZARFIN GERÇEK SÜREÇ SINIRI TESTİ — `docs/ROADMAP.md` Faz 2 madde 2.3b, Karar 2.
 *
 * ── NEDEN SAHTE KUYRUK KULLANILMADI ──────────────────────────────────────
 * Sahte kuyruk **aynı süreçte** kalır. `AsyncLocalStorage` bağlamı zaten süreç
 * içinde taşıdığı için zincir "çalışıyor" görünür — oysa taşınan şey zarf
 * değil, **ALS'in kendisidir**. Test yeşil olur ve zarf hiç sınanmamış olur.
 * Bu dosya gerçek bir işletim sistemi süreç sınırı kuruyor: `spawnSync` ile
 * ayrı bir Node süreci başlatılıyor, zarf **argv ile** geçiyor, çocuk kendi
 * ALS'ini **zarftan** kuruyor ve pino ile JSON basıyor.
 *
 * BullMQ'ya özgü kablolama bu fazda YAPILMIYOR → BORÇ-004, Faz 16.
 *
 * ── KONTROL DENEYİ NEDEN ŞART ────────────────────────────────────────────
 * Faz 2.2a'nın dersi (günlük #16): bir deney, kanıtladığını iddia ettiği şeyi
 * gerçekten kullanmalı. "Kimlikler eşleşti" sonucu, kimliğin **zarfla**
 * geçtiğini kanıtlamaz — ortam değişkeni, çalışma dizini veya başka bir
 * kanaldan da miras kalmış olabilirdi. Bu yüzden aşağıda zarfsız bir koşu da
 * var ve ebeveynin kimliğinin çocuğun çıktısında **hiç görünmediği**
 * doğrulanıyor. Eşleşme ancak o zaman zarfa atfedilebilir.
 */

/** `packages/shared/` */
const PACKAGE_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const CHILD_SCRIPT = join(PACKAGE_ROOT, 'src', 'server', '__fixtures__', 'log-context-child.mjs');
const DIST_ENTRY = join(PACKAGE_ROOT, 'dist', 'server', 'index.js');

/** `src` altındaki en yeni değişiklik zamanı (ms). */
function newestMtimeMs(dir: string): number {
  let newest = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    newest = Math.max(newest, entry.isDirectory() ? newestMtimeMs(full) : statSync(full).mtimeMs);
  }
  return newest;
}

/**
 * Alt süreç `dist`i import ediyor; bu fonksiyon onun TAZE olmasını garanti eder.
 *
 * ── NEDEN TEST DERLEME YAPIYOR ───────────────────────────────────────────
 * Alt süreç düz `node` ile başlıyor, Vitest'in çözümleyicisi orada yok ve
 * Node 24'ün tip soyması `.js` belirtecini `.ts`ye çevirmiyor (2.3b'de
 * ölçüldü) — yani kaynak ağacı doğrudan çalıştırılamıyor. `dist` zorunlu.
 *
 * Peki neden "`pnpm build` çalıştır" diye HATA VERİLMİYOR? Çünkü CI
 * `test:coverage`i `build`den **önce** koşuyor; öyle bir test CI'da hep
 * kırmızı olurdu. Sıralamayı değiştirmek yerine test kendi kendine yeter.
 *
 * ⚠️ Ve neden sadece "dist var mı" bakılmıyor: **bayat `dist` yeşil yalan
 * üretir** (Faz 1 hata #7, SAPMA-009, SAPMA-014). Kaynak değişip dist
 * değişmediyse bu test ESKİ kodu doğrular ve hiçbir kapı ötmez. Tazelik
 * karşılaştırması tam olarak o yalanı kapatıyor.
 *
 * Turbo devre dışı, `tsc` doğrudan çağrılıyor: önbellek isabetinde turbo
 * silinmiş çıktıyı geri yükleyebiliyor (SAPMA-011) ve burada istenen şey
 * önbellek değil, gerçekten derlenmiş taze çıktı.
 */
function ensureSharedBuilt(): void {
  const newestSrc = newestMtimeMs(join(PACKAGE_ROOT, 'src'));
  const distMs = existsSync(DIST_ENTRY) ? statSync(DIST_ENTRY).mtimeMs : 0;
  if (distMs >= newestSrc) return;

  const tsc = createRequire(import.meta.url).resolve('typescript/bin/tsc');
  const built = spawnSync(
    process.execPath,
    [tsc, '-p', join(PACKAGE_ROOT, 'tsconfig.build.json')],
    {
      encoding: 'utf8',
    },
  );

  if (built.status !== 0) {
    throw new Error(
      `Alt süreç testi için @fms/shared derlenemedi (çıkış ${String(built.status)}).\n` +
        `${built.stdout}\n${built.stderr}`,
    );
  }
}

interface ChildRun {
  readonly lines: readonly Record<string, unknown>[];
  readonly stdout: string;
  readonly status: number | null;
  readonly stderr: string;
}

/** Çocuğu çalıştırır ve pino'nun JSON satırlarını ayrıştırır. */
function runChild(envelope?: string): ChildRun {
  const args = envelope === undefined ? [CHILD_SCRIPT] : [CHILD_SCRIPT, envelope];
  const result = spawnSync(process.execPath, args, { encoding: 'utf8', cwd: PACKAGE_ROOT });
  const stdout = result.stdout;

  const lines = stdout
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line) as Record<string, unknown>);

  return { lines, stdout, status: result.status, stderr: result.stderr };
}

function lineWithCode(run: ChildRun, code: string): Record<string, unknown> {
  const found = run.lines.find((line) => line['code'] === code);
  if (found === undefined) {
    throw new Error(`'${code}' kodlu log satırı yok. Çıktı:\n${run.stdout}\n${run.stderr}`);
  }
  return found;
}

describe('zarf GERÇEK bir süreç sınırını geçiyor', () => {
  beforeAll(() => {
    ensureSharedBuilt();
  }, 120_000);

  it('çocuk, EBEVEYNİN correlationId ile logluyor', () => {
    const correlationId = createCorrelationId();
    const run = runChild(serializeLogContext({ correlationId, saveId: 'save-7', turnId: 3 }));

    expect(run.status).toBe(0);
    const ready = lineWithCode(run, 'child.ready');
    expect(ready['correlationId']).toBe(correlationId);
    // Zincirin diğer halkaları da geçiyor (`spec/09` §11.1).
    expect(ready['saveId']).toBe('save-7');
    expect(ready['turnId']).toBe(3);
  });

  // ── KONTROL DENEYİ ────────────────────────────────────────────────────
  // Yukarıdaki eşleşme zarfa mı atfedilebilir? Zarf verilmediğinde ebeveynin
  // kimliği çocukta HİÇ görünmemeli. Görünseydi eşleşmenin sebebi zarf
  // değil, başka bir sızıntı kanalı olurdu ve ilk test yanlış güven üretirdi.
  it('KONTROL: zarf verilmezse ebeveynin kimliği çocuğa GEÇMİYOR', () => {
    const correlationId = createCorrelationId();
    const run = runChild(); // zarf yok — ALS süreç sınırını kendiliğinden geçemez

    expect(run.status).toBe(0);
    expect(run.stdout).not.toContain(correlationId);

    const ready = lineWithCode(run, 'child.ready');
    expect(ready['correlationId']).not.toBe(correlationId);
    // Çocuk kimliksiz kalmıyor — kendi geçerli kimliğini üretiyor.
    expect(isCorrelationId(String(ready['correlationId']))).toBe(true);
  });

  it('bozuk zarf → çocuk uyarır, işi DÜŞÜRMEZ, kendi kimliğini üretir', () => {
    const run = runChild('{ bu json değil');

    expect(run.status).toBe(0); // istek/iş reddedilmiyor (2.3a kararının aynısı)
    expect(lineWithCode(run, 'logContext.unreadableEnvelope')['level']).toBe(40); // warn
    expect(isCorrelationId(String(lineWithCode(run, 'child.ready')['correlationId']))).toBe(true);
  });

  it('başka sürümden gelen zarf → aynı davranış', () => {
    const run = runChild(JSON.stringify({ v: 99, ctx: { correlationId: 'c-1' } }));

    expect(run.status).toBe(0);
    expect(run.lines.some((line) => line['code'] === 'logContext.unreadableEnvelope')).toBe(true);
    expect(lineWithCode(run, 'child.ready')['correlationId']).not.toBe('c-1');
  });

  it('hassas alan süreç sınırını REDAKTE geçiyor — argv `ps` çıktısında görünür', () => {
    const correlationId = createCorrelationId();
    const envelope = serializeLogContext({ correlationId, password: 'hunter2' });

    // Zarfın kendisi (argv'ye yazılacak dizge) sırrı zaten taşımıyor.
    expect(envelope).not.toContain('hunter2');

    const run = runChild(envelope);
    expect(run.stdout).not.toContain('hunter2');
    expect(lineWithCode(run, 'child.ready')['password']).toBe(REDACTED);
  });
});
