import { describe, expect, it } from 'vitest';

import {
  AppError,
  DataProviderError,
  DomainError,
  EngineError,
  ERROR_KINDS,
  ForbiddenError,
  isAppError,
  isUserFaultError,
  NotFoundError,
  USER_FAULT_ERROR_KINDS,
  ValidationError,
} from './errors.js';

/**
 * Hata sınıflarının sözleşme testleri.
 *
 * Buradaki testlerin çoğu "davranışı" değil **tuzakları** sınıyor: `Error`
 * alt sınıflamasında sessizce kırılan üç şey var (prototip zinciri, JSON
 * serileştirme, sebep zinciri) ve üçü de yakalanmazsa hata ancak üretimde,
 * log satırı boş çıktığında fark edilir.
 */

/** Her somut sınıf ve beklenen türü — testlerin tek doğruluk kaynağı. */
const CASES = [
  { Ctor: DomainError, kind: ERROR_KINDS.domain, name: 'DomainError' },
  { Ctor: ValidationError, kind: ERROR_KINDS.validation, name: 'ValidationError' },
  { Ctor: EngineError, kind: ERROR_KINDS.engine, name: 'EngineError' },
  { Ctor: DataProviderError, kind: ERROR_KINDS.dataProvider, name: 'DataProviderError' },
  { Ctor: NotFoundError, kind: ERROR_KINDS.notFound, name: 'NotFoundError' },
  { Ctor: ForbiddenError, kind: ERROR_KINDS.forbidden, name: 'ForbiddenError' },
] as const;

describe('hata sınıfları — ortak sözleşme', () => {
  it.each(CASES)('$name: Error ve AppError zincirinde', ({ Ctor, kind, name }) => {
    const error = new Ctor({ code: 'test.case', message: 'deneme' });

    // Prototip tuzağı: sınıflar ES5'e indirilirse bu üçü sessizce false olur.
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(Ctor);

    expect(error.name).toBe(name);
    expect(error.kind).toBe(kind);
    expect(isAppError(error)).toBe(true);
  });

  it.each(CASES)('$name: kardeş sınıfla KARIŞMAZ', ({ Ctor }) => {
    const error = new Ctor({ code: 'test.case', message: 'deneme' });
    const others = CASES.filter((c) => c.Ctor !== Ctor);

    for (const other of others) {
      expect(error).not.toBeInstanceOf(other.Ctor);
    }
  });

  it('AppError doğrudan örneklenemez — abstract (tip seviyesinde)', () => {
    // Çalışma zamanında `abstract` bir kısıt bırakmaz; garanti tip
    // seviyesindedir. Burada yalnızca tabanın gerçekten paylaşıldığını
    // doğruluyoruz: altı sınıfın hepsi aynı prototipi paylaşır.
    for (const { Ctor } of CASES) {
      expect(Object.getPrototypeOf(Ctor.prototype)).toBe(AppError.prototype);
    }
  });

  it('isAppError yabancı değerleri reddeder', () => {
    expect(isAppError(new Error('düz hata'))).toBe(false);
    expect(isAppError(new TypeError('tip hatası'))).toBe(false);
    expect(isAppError('metin')).toBe(false);
    expect(isAppError(null)).toBe(false);
    expect(isAppError(undefined)).toBe(false);
    expect(isAppError({ kind: 'domain', code: 'sahte' })).toBe(false);
  });
});

describe('hata sınıfları — alanlar', () => {
  it('code ve message olduğu gibi taşınır', () => {
    const error = new DomainError({
      code: 'transfer.budgetExceeded',
      message: 'Transfer bütçesi aşıldı',
    });

    expect(error.code).toBe('transfer.budgetExceeded');
    expect(error.message).toBe('Transfer bütçesi aşıldı');
  });

  it('context verilmezse boş nesne olur — undefined DEĞİL', () => {
    // Çağıran taraf `error.context` üzerinde koşulsuz gezinebilmeli;
    // undefined olsaydı her kullanım yerinde bir kontrol gerekirdi.
    const error = new NotFoundError({ code: 'player.notFound', message: 'Oyuncu yok' });
    expect(error.context).toEqual({});
  });

  it('context yapısal veriyi taşır — mesaj metni değil', () => {
    const error = new DomainError({
      code: 'transfer.budgetExceeded',
      message: 'Transfer bütçesi aşıldı',
      context: { budget: 12_400_000, offer: 18_000_000, currency: 'EUR', negotiable: false },
    });

    // Kullanıcıya gösterilecek cümle Faz 5'te bu değerlerden üretilecek;
    // bugün dizgi olarak gömülmemesi o günü ucuzlatıyor.
    expect(error.context).toEqual({
      budget: 12_400_000,
      offer: 18_000_000,
      currency: 'EUR',
      negotiable: false,
    });
  });

  it('context sığ dizi kabul eder — eksik alan listeleri için', () => {
    const error = new ValidationError({
      code: 'env.missing',
      message: 'Eksik ortam değişkeni',
      context: { missing: ['DATABASE_URL', 'JWT_SECRET'] },
    });

    expect(error.context['missing']).toEqual(['DATABASE_URL', 'JWT_SECRET']);
  });
});

describe('hata sınıfları — sebep zinciri', () => {
  it('cause taşınır', () => {
    const root = new Error('bağlantı reddedildi');
    const error = new DataProviderError({
      code: 'provider.unreachable',
      message: 'Veri sağlayıcıya ulaşılamadı',
      cause: root,
    });

    expect(error.cause).toBe(root);
  });

  it('cause verilmezse undefined kalır — boş nesne uydurulmaz', () => {
    const error = new DataProviderError({ code: 'provider.x', message: 'x' });
    expect(error.cause).toBeUndefined();
  });

  it('Error olmayan bir cause da kabul edilir', () => {
    const error = new DataProviderError({
      code: 'provider.x',
      message: 'x',
      cause: { status: 503 },
    });
    expect(error.cause).toEqual({ status: 503 });
  });
});

describe('hata sınıfları — JSON serileştirme', () => {
  it('DÜZ Error JSON.stringify ile boşalır — bu testin var olma sebebi', () => {
    // Kontrol deneyi. `message` ve `name` Error üzerinde numaralandırılamaz
    // alanlardır, bu yüzden varsayılan serileştirme onları atar.
    expect(JSON.parse(JSON.stringify(new Error('kaybolur')))).toEqual({});
  });

  it('AppError message ve code dahil serileşir', () => {
    const error = new EngineError({
      code: 'engine.invariantBroken',
      message: 'Kadroda kaleci yok',
      context: { clubId: 42, goalkeepers: 0 },
    });

    expect(JSON.parse(JSON.stringify(error))).toEqual({
      name: 'EngineError',
      kind: 'engine',
      code: 'engine.invariantBroken',
      message: 'Kadroda kaleci yok',
      context: { clubId: 42, goalkeepers: 0 },
    });
  });

  it('stack serileştirmeye GİRMEZ — sunucu yolu sızdırmaz', () => {
    const error = new ForbiddenError({ code: 'save.notOwner', message: 'Bu kayıt sizin değil' });
    const serialized = JSON.parse(JSON.stringify(error)) as Record<string, unknown>;

    expect(error.stack).toBeDefined();
    expect(serialized['stack']).toBeUndefined();
  });

  it('cause SIĞ özetlenir — sarmalanan hatanın bağlamı dışarı taşınmaz', () => {
    const root = new DomainError({
      code: 'inner.secretive',
      message: 'iç hata',
      context: { apiKeyTail: 'xyz' },
    });
    const error = new DataProviderError({
      code: 'provider.failed',
      message: 'sağlayıcı hatası',
      cause: root,
    });

    const serialized = JSON.parse(JSON.stringify(error)) as { cause?: Record<string, unknown> };
    expect(serialized.cause).toEqual({ name: 'DomainError', message: 'iç hata' });
    // İç hatanın kendi bağlamı DIŞARIDA kalmalı.
    expect(serialized.cause?.['context']).toBeUndefined();
  });

  it('Error olmayan cause serileştirmede yok sayılır', () => {
    const error = new DataProviderError({ code: 'p.x', message: 'x', cause: 'düz metin' });
    const serialized = JSON.parse(JSON.stringify(error)) as { cause?: unknown };
    expect(serialized.cause).toBeUndefined();
  });
});

describe('isUserFaultError — Sentry filtresinin paylaşılan kuralı (2.5b)', () => {
  it('ValidationError ve DomainError kullanıcı hatası', () => {
    expect(isUserFaultError(new ValidationError({ code: 'a.b', message: 'm' }))).toBe(true);
    expect(isUserFaultError(new DomainError({ code: 'a.b', message: 'm' }))).toBe(true);
  });

  it('sistem hataları kullanıcı hatası DEĞİL', () => {
    expect(isUserFaultError(new EngineError({ code: 'a.b', message: 'm' }))).toBe(false);
    expect(isUserFaultError(new DataProviderError({ code: 'a.b', message: 'm' }))).toBe(false);
  });

  it('4xx olan NotFound/Forbidden de kullanıcı hatası SAYILMIYOR', () => {
    // Bilinçli: beklenmedik bir 404/403 çoğu zaman yönlendirme veya yetki
    // hatasının belirtisi, yani bakmak isteriz.
    expect(isUserFaultError(new NotFoundError({ code: 'a.b', message: 'm' }))).toBe(false);
    expect(isUserFaultError(new ForbiddenError({ code: 'a.b', message: 'm' }))).toBe(false);
  });

  it('bizim olmayan değerler kullanıcı hatası SAYILMIYOR — susturulmuyor', () => {
    expect(isUserFaultError(new TypeError('x'))).toBe(false);
    expect(isUserFaultError('metin')).toBe(false);
    expect(isUserFaultError(null)).toBe(false);
    expect(isUserFaultError(undefined)).toBe(false);
  });

  it('liste yalnızca GEÇERLİ ErrorKind değerlerinden oluşuyor', () => {
    // Yazım hatası olsaydı filtre sessizce hiçbir şeyi susturmazdı.
    for (const kind of USER_FAULT_ERROR_KINDS) {
      expect(Object.values(ERROR_KINDS)).toContain(kind);
    }
  });
});
