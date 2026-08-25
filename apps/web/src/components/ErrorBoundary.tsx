import { captureException } from '@sentry/react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

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

export interface ErrorBoundaryProps {
  /** Bu sınırın adı — logda ve Sentry etiketinde görünür (`kök`/`ekran`/…). */
  readonly name: string;
  /** Yedek arayüzün başlığı. TODO(Faz 5): `t()` üzerinden gelecek (BORÇ-003). */
  readonly title: string;
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

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
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

    return (
      <section
        role="alert"
        data-testid={`error-boundary-${this.props.name}`}
        style={{ fontFamily: 'system-ui, sans-serif', padding: 16, lineHeight: 1.6 }}
      >
        {/* TODO(Faz 5): metinler `t()` üzerinden gelecek — BORÇ-003. */}
        <h2>{this.props.title}</h2>
        <p>Bu bölüm yüklenemedi. Sorunu bize bildirebilirsiniz.</p>

        <p>
          Hata kodu: <code data-testid="error-correlation-id">{correlationId ?? 'bilinmiyor'}</code>
        </p>

        <button type="button" onClick={this.handleRetry} data-testid="error-retry">
          Tekrar dene
        </button>

        <p data-testid="error-reported">
          {reported ? 'Hata otomatik olarak bildirildi.' : 'Hata bildirimi yapılamadı.'}
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
