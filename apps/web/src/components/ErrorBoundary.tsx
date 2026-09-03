import { captureException } from '@sentry/react';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { type WithTranslation, withTranslation } from 'react-i18next';

import { currentCorrelationId } from '../lib/correlation-context.js';
import { CRASH_TAG } from '../lib/sentry.js';

/**
 * Derleme zamanında Vite tarafından yerine konur (`vite.config.ts` `define`).
 *
 * ⚠️ `NODE_ENV` KOKLANMIYOR (Karar 20, Faz 1 hata #9). Değer Vite'ın **açık
 * `mode` girdisinden** türetilip pakete gömülüyor; çalışma zamanında hiçbir
 * ortam değişkeni okunmuyor. Faz 1'in tuzağı tam tersiydi: Vite derleme
 * sırasında `process.env.NODE_ENV`'i kendisi değiştiriyordu ve ona bakan kapı
 * yanlış şeyi ölçüyordu.
 */
declare const __FMS_DEV__: boolean;

/**
 * Hata sınırı — `docs/ROADMAP.md` Faz 2 madde 2.6.
 *
 * ── NEDEN KENDİ SINIFIMIZ, `@sentry/react`'inki DEĞİL ────────────────────
 * `@sentry/react` bir `ErrorBoundary` sağlıyor ve yakalama işini yapıyor.
 * Ama bizim üç ek şartımız var ve üçü de onun sözleşmesinin dışında:
 *   ① Yakalanan hata **`crash` etiketiyle** verilmeli (Karar 18) — yoksa bir
 *      `DomainError` çökmesi Sentry'den sessizce düşerdi.
 *   ② Yedek arayüz **`correlationId`** göstermeli ve "Hata bildir" o kimliği
 *      taşımalı (Karar 19).
 *   ③ Yığın izi **yalnızca** geliştirmede görünmeli (Karar 20).
 * Bunları Sentry'nin bileşenini sarmalayarak da yapabilirdik; o zaman iki
 * katman `componentDidCatch` çalıştırırdı ve hangisinin ne raporladığı
 * belirsizleşirdi. Tek katman, tek karar noktası.
 *
 * ── `getDerivedStateFromError` İLE `componentDidCatch` AYRI İŞLER ────────
 * İkisi de çağrılır ama farklı sözleşmeleri var:
 *   • `getDerivedStateFromError` **saftır** ve yalnızca **render kararı**
 *     üretir (durumu günceller). React onu render aşamasında çağırır ve yan
 *     etki YASAKTIR — burada Sentry'ye rapor atmak, eşzamanlı (concurrent)
 *     render'da **birden çok kez** çalışabileceği için mükerrer olay üretirdi.
 *   • `componentDidCatch` işleme (commit) aşamasında, **bir kez** çağrılır ve
 *     yan etki için ayrılmıştır: loglama ve Sentry buraya ait.
 * Bu yüzden bilgi iki kez yazılıyor gibi görünür ama değil: biri "ne
 * göstereyim", diğeri "kimi haberdar edeyim".
 */

/**
 * ⚠️ BORÇ-003 ÖDENDİ (5.4) — VE BİR TASARIM SORUSU ÖNCE CEVAPLANDI.
 *
 * *"Bir hata arayüzü, bozulmuş olabilecek sisteme bağlanamaz."* Bu bileşen
 * **kök** hata sınırı; i18n'in kendisi çökerse onu yakalayacak olan da bu.
 * O hâlde `t()` çağırması güvenli mi?
 *
 * **Evet — ama ancak i18n'in başlatılması RENDER'DAN ÖNCE doğrulandığı için.**
 * `main.tsx` `createI18n()`i `root.render()`tan **önce** çağırıyor ve
 * `isInitialized`i açıkça denetliyor; başarısızsa React **hiç monte
 * edilmiyor**, statik bir yedek metin basılıyor. Yani bu bileşen render
 * edildiği anda i18n'in çalıştığı **garanti**.
 *
 * ⚠️ Ve garanti bir varsayım değil bir ÖLÇÜM: i18next bozuk yapılandırmada
 * **fırlatmıyor**, sessizce `isInitialized: undefined` bırakıyor (5.4'te
 * koşturuldu) — bu yüzden `main.tsx` `try/catch`e değil **açık kontrole**
 * dayanıyor. Kontrol deneyi raporda.
 */
/**
 * Sınır başlığı olarak kullanılabilecek anahtarlar — `errors` namespace'i.
 *
 * ⚠️ **ÖN EK YOK — ve bu bir ölçüm sonucu, tercih değil.** İlk yazımda
 * anahtarlar `errors:boundary.root` diye ön ekliydi ve gerekçe *"tip tarafında
 * ön ek olmadan çözülmüyor"* diye yazılmıştı. `typecheck` **ikisini de
 * reddetti** ve gerçek sebep başkaydı: `WithTranslation` **jenerik** ve
 * namespace'i tip parametresi olarak alıyor (`WithTranslation<'errors'>`).
 * Parametre verilince `t` zaten o namespace'e daralıyor ve ön ekli anahtar
 * **hatalı** oluyor. Yani ilk gerekçe yanlıştı; kaynağı derleyici düzeltti.
 */
export type BoundaryTitleKey =
  'boundary.root' | 'boundary.screen' | 'boundary.component' | 'boundary.debugPanel';

export interface ErrorBoundaryProps {
  /** Bu sınırın adı — logda ve Sentry etiketinde görünür (`kök`/`ekran`/…). */
  readonly name: string;
  /**
   * Yedek arayüzün başlığının **i18n ANAHTARI** — metin değil.
   *
   * Sözleşme 5.4'te değişti: eskiden hazır Türkçe dize alıyordu (BORÇ-003).
   * Anahtar almak, çağrı yerinin de K5'e uymasını **zorunlu** kılıyor —
   * bir dize alsaydı çağıran taraf yine sabit metin yazabilirdi.
   *
   * ⚠️ Tip `string` DEĞİL, **kapalı bir birleşim**: tipli anahtarlar
   * (`i18next.d.ts`) yalnızca literal anahtarları kabul ediyor ve `string`
   * onları geniş tipe düşürüp korumayı **kapatırdı**. Yeni bir sınır başlığı
   * eklemek hem bu birleşime hem `errors.json`a satır ekler.
   */
  readonly titleKey: BoundaryTitleKey;
  readonly children: ReactNode;
}

interface ErrorBoundaryState {
  readonly error: Error | null;
  readonly correlationId: string | null;
  readonly reported: boolean;
}

const INITIAL_STATE: ErrorBoundaryState = {
  error: null,
  correlationId: null,
  reported: false,
};

/**
 * ⚠️ SINIF BİLEŞENİ → `withTranslation()` HOC'u, `useTranslation()` DEĞİL.
 * Kanca bir sınıfta çağrılamaz ve `componentDidCatch` bir sınıf gerektiriyor
 * (React'te hata yakalamanın kanca karşılığı **yok**).
 */
class ErrorBoundaryBase extends Component<
  ErrorBoundaryProps & WithTranslation<'errors'>,
  ErrorBoundaryState
> {
  override state: ErrorBoundaryState = INITIAL_STATE;

  /**
   * SAF — yalnızca render kararı. Yan etki YOK (yukarıdaki gerekçe).
   *
   * `correlationId` burada okunuyor çünkü `currentCorrelationId()` saf sayılır:
   * son isteğin kimliğini döner, yoksa üretip **hatırlar**. İki kez çağrılsa
   * aynı değeri verir.
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error, correlationId: currentCorrelationId(), reported: false };
  }

  /** İŞLEME aşaması — yan etkiler burada, tam bir kez. */
  override componentDidCatch(error: Error, info: ErrorInfo): void {
    captureException(error, {
      tags: {
        // Karar 18 — bu etiket `shouldReport`ta kullanıcı-hatası elemesini
        // aşmayı sağlıyor. Etiketsiz bir `DomainError` çökmesi düşerdi.
        [CRASH_TAG]: 'react-render',
        boundary: this.props.name,
        correlationId: currentCorrelationId(),
      },
      extra: {
        // Bileşen yığını yalnızca Sentry'ye gider, ekrana ASLA.
        componentStack: info.componentStack ?? '(yok)',
      },
    });

    this.setState({ reported: true });
  }

  private readonly handleRetry = (): void => {
    this.setState(INITIAL_STATE);
  };

  override render(): ReactNode {
    const { error, correlationId, reported } = this.state;
    if (error === null) return this.props.children;

    const { t } = this.props;

    return (
      <section
        role="alert"
        data-testid={`error-boundary-${this.props.name}`}
        style={{ fontFamily: 'system-ui, sans-serif', padding: 16, lineHeight: 1.6 }}
      >
        <h2>{t(this.props.titleKey)}</h2>
        <p>{t('boundary.body')}</p>

        <p>
          {t('boundary.codeLabel')}{' '}
          <code data-testid="error-correlation-id">
            {correlationId ?? t('boundary.codeUnknown')}
          </code>
        </p>

        <button type="button" onClick={this.handleRetry} data-testid="error-retry">
          {t('boundary.retry')}
        </button>

        <p data-testid="error-reported">
          {reported ? t('boundary.reported') : t('boundary.notReported')}
        </p>

        {/* ⚠️ YIĞIN İZİ YALNIZCA GELİŞTİRMEDE. Üretimde sunucu dosya
            yollarını ve iç yapıyı sızdırır (2.4'teki aynı karar). */}
        {__FMS_DEV__ ? (
          <pre data-testid="error-stack" style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>
            {error.stack ?? error.message}
          </pre>
        ) : null}
      </section>
    );
  }
}

/**
 * Dışa aktarılan sınır — `errors` namespace'ine bağlı.
 *
 * `withTranslation` çeviri hazır olana kadar render'ı bekletebiliyor
 * (`useSuspense`); burada **kapalı** çünkü kaynaklar statik paketlenmiş ve
 * `main.tsx` başlatmayı render'dan önce doğruluyor — bekleyecek bir şey yok.
 * Açık bırakılsaydı hata arayüzü bir `Suspense` sınırı isterdi ve o sınır da
 * çökebilirdi.
 */
export const ErrorBoundary = withTranslation('errors')(ErrorBoundaryBase);
