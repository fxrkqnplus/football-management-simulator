import { createEventThrottle, isUserFaultError, TELEMETRY_DATA_COLLECTION } from '@fms/shared';
import { envSchema } from '@fms/shared/server';
import type { ErrorEvent, EventHint } from '@sentry/node';
import { init } from '@sentry/node';

/**
 * Sentry enstrümantasyonu — `docs/ROADMAP.md` Faz 2 madde 2.5a.
 *
 * ⚠️ BU DOSYA `main.ts`'TEN **ÖNCE** YÜKLENİR VE BU BİR ZORUNLULUKTUR (Risk R1).
 *
 * `apps/api` saf ESM. ESM'de `import` deyimleri **yükseltilir** (hoisting):
 * `main.ts`'in ilk satırına `Sentry.init()` yazsak bile, `main.ts`'in import
 * ettiği bütün modüller `init()` çalışmadan ÖNCE değerlendirilir. Sentry ise
 * enstrümantasyonunu (`import-in-the-middle`) modül yüklenirken kuruyor —
 * yani geç kalan bir `init()` sessizce eksik enstrümantasyon üretir.
 * Belirti yok: uygulama çalışır, hatalar da gider, ama otomatik enstrümantasyon
 * bağlanmamıştır.
 *
 * Çözüm Node'un `--import` bayrağı:
 *
 *     node --import ./dist/instrument.js dist/main.js
 *
 * `--import` modülü ana giriş **çözümlenmeden** yükler. Dockerfile `CMD`'si ve
 * her elle çalıştırma komutu bunu taşımak zorunda; ikisi **birlikte** güncellenir.
 *
 * ── ENSTRÜMANTASYON, UYGULAMANIN AÇILIP AÇILMAYACAĞINA KARAR VERMEZ ──────
 * Burada `loadEnv()`/`parseEnv()` **çağrılmıyor** — ikisi de geçersiz env'de
 * fırlatıyor ve bu dosya `main.ts`'ten önce koştuğu için hata mesajını o
 * belirlerdi. Oysa CI'da yazılı bir sözleşme var (*"Eksik ortam değişkeniyle
 * API AÇILMAMALI"*) ve o test `main.ts`'in **biçimlendirilmiş** teşhisini
 * arıyor (`DATABASE_URL`, `tanımlı değil`). `safeParse` kullanılıyor: env
 * geçersizse Sentry sessizce kurulmaz, `main.ts` kendi hatasını üretir.
 *
 * Aynı sebeple `import 'reflect-metadata'` burada YOK — o `main.ts`'in işi ve
 * enstrümantasyon dosyasının uygulama önyüklemesine karışmaması gerekiyor.
 */

/**
 * Olay kısıtlayıcı — Karar 4'ün son maddesi (*"aynı parmak izi N dakikada
 * tekrarlarsa düşürülür"*). 2.5b'de eklendi.
 *
 * Uygulama `@fms/shared`'da ve **tarayıcı tarafı da aynısını kullanıyor**:
 * iki ayrı kopya yazılsaydı kaçınılmaz olarak ayrışırlardı (SAPMA-013).
 *
 * Sunucuda da gerekli: bir kuyruk tüketicisi veya yeniden deneyen bir istemci
 * aynı hatayı tekrar tekrar üretebilir ve 5.000 olay/ay kotasını yakar.
 */
const throttle = createEventThrottle();

/**
 * Bir olayın parmak izi — hata tipi + mesajı.
 *
 * Yığın izi BİLEREK dışarıda: satır numaraları kaynak haritasına ve dağıtıma
 * göre kayabiliyor, aynı hata farklı parmak izleri üretir ve kısıtlama hiç
 * devreye girmezdi.
 */
export function fingerprintOf(event: ErrorEvent): string {
  const first = event.exception?.values?.[0];
  return `${first?.type ?? 'bilinmiyor'}:${first?.value ?? ''}`;
}

/**
 * Kaldırılan varsayılan entegrasyonun adı — release health oturumlarını yayan.
 *
 * Sabit olarak dışa aktarılıyor çünkü test onu doğruluyor: ad bir SDK
 * yükseltmesinde değişirse filtre **sessizce hiçbir şeyi kaldırmaz** ve yan
 * kanal geri gelir. Belirtisi olmayan bir bozulma — bu yüzden sınanıyor.
 */
export const SESSION_INTEGRATION = 'ProcessSession';

/**
 * Bir olay Sentry'ye gönderilmeli mi?
 *
 * ⚠️ TEK KARAR NOKTASI. Exception filter yakaladığı **her** hatayı
 * `captureException`a veriyor; neyin düşürüleceğine yalnızca burası karar
 * veriyor. İki yerde filtreleme kaçınılmaz olarak ayrışır — SAPMA-013'ün
 * ("hiçbir kural iki yerde tanımlanmaz") aynı dersi.
 *
 * İKİ ELEME VAR VE SIRASI ANLAMLI:
 *   ① **Kullanıcı hatası mı** (`isUserFaultError`, `@fms/shared`) — hiç
 *      gönderilmez ve kısıtlayıcıya **uğramaz**. Sıra bu yüzden önemli:
 *      uğrasaydı bir kullanıcı hatası, gerçek bir arızanın kısıtlama
 *      penceresini işgal edebilirdi.
 *   ② **Kısıtlama** — sistem hatası, ama aynı parmak izi pencere içinde
 *      zaten gönderilmişse düşürülür.
 *
 * Karar listesi 2.5b'de `@fms/shared`'a taşındı: `apps/web` `apps/api`'yi
 * import edemez (CLAUDE.md §2.4), yani tarayıcı aynı kuralı ancak paylaşılan
 * paketten alabilirdi.
 *
 * Dışa aktarılıyor çünkü `beforeSend` bir kapanış (closure) içinde saklı
 * kalsaydı test edilemezdi ve kuralın kablolaması sınanamazdı
 * (`spec/09` §11.5).
 */
export function shouldReport(event: ErrorEvent, hint: EventHint | undefined, now: number): boolean {
  if (isUserFaultError(hint?.originalException)) return false;
  return throttle.shouldAllow(fingerprintOf(event), now);
}

/**
 * Sentry'yi kurar. Modül yüklenirken **bir kez** çağrılır.
 *
 * DSN boşsa hiçbir şey yapmaz — kota yanmasın ve geliştirme ortamı ağa
 * çıkmasın diye. `enabled: false` ile kurmak yerine **hiç kurmamak** tercih
 * edildi: kurulmamış bir SDK'nın `captureException`ı zaten sessiz bir no-op ve
 * bu, "DSN yokken ağ isteği gitmiyor" iddiasının en dolaysız hâli.
 */
export function setupSentry(source: Readonly<Record<string, string | undefined>>): boolean {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) return false;

  const dsn = parsed.data.SENTRY_DSN ?? '';
  if (dsn === '') return false;

  init({
    dsn,
    // ⚠️ `NODE_ENV` KOKLANMIYOR (Faz 1 hata #10). Ortam adı açık bir
    // bayraktan geliyor; Vite'ın derleme sırasında NODE_ENV'i değiştirmesi
    // gibi sürprizler bu projede bir kez bedel ödetti.
    environment: parsed.data.SERVER_MODE,
    ...(parsed.data.SENTRY_RELEASE === undefined ? {} : { release: parsed.data.SENTRY_RELEASE }),

    // Karar 4 — kota disiplini (`spec/10` §13.5: 5.000 olay/ay).
    // Performans izleme 1–5 kullanıcı için kotaya değmez; ölçüm ihtiyacını
    // 2.7'nin `measure()`ı karşılayacak.
    tracesSampleRate: 0,
    // Hataların HEPSİ gönderilir — örnekleme yapılmaz. Az kullanıcılı bir
    // sistemde bir hatayı kaçırmak, kota tasarrufundan pahalı.
    sampleRate: 1.0,
    // ⚠️ KARAR 17 — `sendDefaultPii` DEĞİL, açık politika (2.5b'de ölçüldü).
    // `sendDefaultPii: false` "hiçbir şey toplama" DEMİYOR: çerez, başlık ve
    // sorgu dizesi yine toplanıyor, yalnızca IP'yle ilgili birkaç anahtar
    // eleniyor. Ayrıca seçenek v10'da kullanımdan kaldırıldı, v11'de silinecek
    // ve o an varsayılanlar yürürlüğe girerdi. Politika tek yerde:
    // `@fms/shared` — tarayıcı tarafı da aynısını kullanıyor.
    dataCollection: { ...TELEMETRY_DATA_COLLECTION, httpBodies: [] },

    // ⚠️ OTURUM İZLEME KAPALI — ÖLÇÜMLE BULUNAN YAN KANAL (2.5a).
    // `release` ayarlanınca SDK, hata zarfının YANINDA bir `session` zarfı
    // daha gönderiyor (release health). Ölçüldü, tahmin değil:
    //   release yok                    → 1 zarf  ["event"]
    //   release var                    → 2 zarf  ["session","event"]
    //   ProcessSession kaldırıldı      → 1 zarf  ["event"]
    // `release`ı Karar 7 (kaynak haritası adlandırması) için koyduk; release
    // health hiçbir yerde istenmedi. Karar 4'ün tüm gerekçesi kota disiplini
    // ("performans izleme 1–5 kullanıcı için kotaya değmez") — ölçülmemiş,
    // istenmemiş bir giden kanal bırakmak o kararla çelişirdi.
    //
    // `autoSessionTracking: false` v10'da ETKİSİZ (ölçüldü — seçenek
    // kaldırılmış, sessizce yok sayılıyor). Tek çalışan yol varsayılan
    // entegrasyon listesinden `ProcessSession`ı çıkarmak.
    integrations: (defaults) =>
      defaults.filter((integration) => integration.name !== SESSION_INTEGRATION),

    beforeSend: (event: ErrorEvent, hint: EventHint): ErrorEvent | null =>
      shouldReport(event, hint, Date.now()) ? event : null,
  });

  return true;
}

// Modül yüklendiği anda kurulum. `--import` bunu ana girişten önce çalıştırır.
setupSentry(process.env);
