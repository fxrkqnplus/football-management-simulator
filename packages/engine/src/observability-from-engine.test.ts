import {
  assertInvariant,
  createDebugTrace,
  type DebugTrace,
  EngineError,
  isDebugTrace,
  traceToLogContext,
} from '@fms/shared';
import { describe, expect, it } from 'vitest';

/**
 * MOTOR GÖZLEMLENEBİLİRLİK MODÜLLERİNİ KULLANABİLİYOR MU? — K3 kanıtı (2.7).
 *
 * `errors-from-engine.test.ts` ile aynı gerekçe, aynı desen: `debug-trace.ts`
 * ve `assert.ts` için "saf yazdım" demek bir **iddiadır**, kanıt değildir.
 * Motorun kısıtları `packages/shared`'ınkinden sert — `tsconfig.json`
 * `types: []` (Node tipleri YOK) ve `lib: ["ES2024"]` (DOM YOK). Bir gün
 * bu modüllere `process`, `Buffer`, `document` ya da `node:` bir import
 * sızarsa `packages/shared` kendi içinde derlenmeye devam eder ve testleri de
 * geçer; kırılan **yalnızca burası** olur.
 *
 * Import `@fms/shared` üzerinden, yani **yayımlanan yüzeyden**
 * (`packages/shared/dist`) geliyor: barrel'dan dışa aktarım unutulursa da
 * burası kırılır.
 *
 * ⚠️ TERS YÖNÜ `arch:check` ÖLÇÜYOR. Bu dosya İZİNLİ olanın gerçekten
 * çalıştığını gösterir; `arch:check` YASAK olanın (`measure`,
 * `configureAssertions`) alınamadığını gösterir. İkisi ters yönlerden aynı
 * sınırı ölçüyor ve tek başına hiçbiri yeterli değil.
 */

describe('motor — debugTrace (K3, K7)', () => {
  it('motor içinde iz üretilip döndürülebiliyor', () => {
    // Motorun asıl deseni bu: LOG YAZMAZ, iz DÖNDÜRÜR (2.2a kararı).
    const decideBid = (): DebugTrace<{ decision: string; amount: number }> =>
      createDebugTrace<{ decision: string; amount: number }>({
        module: 'ai.transferTarget',
        input: { clubId: 42, budget: 12_000_000 },
        seed: 'a3f9:412:2871',
      })
        .step('positionNeed', 0.71, 'Derinlik 2/4, yaş riski yüksek')
        .step('affordability', 0.35, 'Bonservis 7,8 mn / bütçe 12 mn')
        .done({ decision: 'bid', amount: 7_800_000 }, 'Stoper ihtiyacı yüksek; bütçe yetiyor.');

    const trace = decideBid();

    expect(isDebugTrace(trace)).toBe(true);
    expect(trace.output.decision).toBe('bid');
    expect(trace.steps).toHaveLength(2);
    expect(trace.summary).toContain('Stoper');
  });

  it('iz motor tarafında da düz log bağlamına çevrilebiliyor', () => {
    // Çevirme saf; loglamayı motorun DIŞINDAKİ çağıran yapacak.
    const trace = createDebugTrace<number>({ module: 'm', input: { clubId: 7 } })
      .step('a', 1)
      .done(1, 'özet');

    expect(traceToLogContext(trace)['input.clubId']).toBe(7);
  });
});

describe('motor — assertInvariant (K3, spec/09 §11.3)', () => {
  it('motorda varsayılan kip FIRLATMA — tur geri alınabilsin diye', () => {
    // ⚠️ Motor `configureAssertions`ı IMPORT EDEMEZ (arch:check
    // `ENGINE_FORBIDDEN_SHARED_EXPORTS`), yani gördüğü kip her zaman
    // varsayılandır. Bu test o garantinin çalışma zamanı yüzü: motor kendi
    // değişmez kontrolünü gevşetemez.
    const validateSquad = (goalkeepers: number): void => {
      assertInvariant(goalkeepers >= 2, {
        code: 'engine.notEnoughGoalkeepers',
        message: 'Her kulüpte en az 2 kaleci olmalı',
        context: { goalkeepers, required: 2 },
      });
    };

    expect(() => {
      validateSquad(2);
    }).not.toThrow();

    expect(() => {
      validateSquad(0);
    }).toThrow(EngineError);
  });

  it('fırlatılan hata Faz 16 tur geri alma için tiplenmiş geliyor', () => {
    try {
      assertInvariant(false, {
        code: 'engine.orphanDelta',
        message: 'Silinmiş varlığa referans veren delta var',
        context: { deltaId: 991 },
      });
      expect.unreachable('fırlatmalıydı');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(EngineError);
      expect((error as EngineError).kind).toBe('engine');
      expect((error as EngineError).context).toEqual({ deltaId: 991 });
    }
  });
});
