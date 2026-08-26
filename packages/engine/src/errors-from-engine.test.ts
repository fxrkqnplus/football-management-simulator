import { EngineError, isAppError, ValidationError } from '@fms/shared';
import { describe, expect, it } from 'vitest';

/**
 * MOTOR HATA SINIFLARINI KULLANABİLİYOR MU? — K3 kanıtı.
 *
 * NEDEN AYRI BİR TESTTE: `packages/shared/src/errors.ts`'i "saf yazdım" demek
 * bir iddiadır, kanıt değildir. Motorun kısıtları `packages/shared`'ınkinden
 * sert: `tsconfig.json` `types: []` (Node tipleri YOK) ve `lib: ["ES2024"]`
 * (DOM YOK). Bir gün `errors.ts`'e `process`, `Buffer` ya da `node:` bir import
 * sızarsa, `packages/shared` kendi içinde derlenmeye devam eder ve testleri de
 * geçer — kırılan **yalnızca burası** olur.
 *
 * Ayrıca bu test yayımlanan yüzeyi sınıyor: import `@fms/shared` üzerinden,
 * yani `packages/shared/dist`'ten geliyor. Sınıflar `index.ts`'ten dışa
 * aktarılmayı unutulursa da burası kırılır.
 *
 * `arch:check` tamamlayıcıdır: o, motorun YASAK bir şey import etmediğini
 * denetler; bu test ise İZİNLİ olanın gerçekten çalıştığını gösterir. İkisi
 * ters yönlerden aynı sınırı ölçüyor.
 */
describe('motor — @fms/shared hata sınıfları (K3)', () => {
  it('motor içinde EngineError fırlatılıp yakalanabiliyor', () => {
    const throwFromEngine = (): never => {
      throw new EngineError({
        code: 'engine.invariantBroken',
        message: 'Kadroda kaleci yok',
        context: { clubId: 42, goalkeepers: 0 },
      });
    };

    expect(throwFromEngine).toThrow(EngineError);

    try {
      throwFromEngine();
    } catch (error: unknown) {
      expect(isAppError(error)).toBe(true);
      expect((error as EngineError).kind).toBe('engine');
      expect((error as EngineError).context).toEqual({ clubId: 42, goalkeepers: 0 });
    }
  });

  it('prototip zinciri paket sınırını geçince de bozulmuyor', () => {
    // `instanceof`, sınıfın TEK bir modül örneğinden gelmesine bağlıdır.
    // pnpm'in sıkı düzeninde `@fms/shared` iki kez çözümlenirse iki ayrı
    // `EngineError` doğar ve bu kontrol sessizce false döner.
    const error = new EngineError({ code: 'engine.x', message: 'x' });
    expect(error).toBeInstanceOf(EngineError);
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(ValidationError);
  });

  it('serileştirme motor tarafında da mesajı koruyor', () => {
    const error = new EngineError({ code: 'engine.x', message: 'değişmez kırıldı' });
    const serialized = JSON.parse(JSON.stringify(error)) as Record<string, unknown>;
    expect(serialized['message']).toBe('değişmez kırıldı');
    expect(serialized['code']).toBe('engine.x');
  });
});
