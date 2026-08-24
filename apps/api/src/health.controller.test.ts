import 'reflect-metadata';

import { configureBasePath, resetBasePathForTests } from '@fms/shared';
import { afterEach, describe, expect, it } from 'vitest';

import { HealthController } from './health.controller.js';

/** `res.cookie()` çağrısını kaydeden en küçük sahte Response. */
function fakeResponse(): {
  cookie: (name: string, value: string, options: Record<string, unknown>) => void;
  calls: { name: string; value: string; options: Record<string, unknown> }[];
} {
  const calls: { name: string; value: string; options: Record<string, unknown> }[] = [];
  return {
    calls,
    cookie(name, value, options) {
      calls.push({ name, value, options });
    },
  };
}

describe('HealthController', () => {
  afterEach(() => {
    resetBasePathForTests();
  });

  it('alt yol yapılandırmasını olduğu gibi döner', () => {
    configureBasePath('/fms');
    const controller = new HealthController();
    const res = fakeResponse();

    const body = controller.health(res as never);

    expect(body).toEqual({
      status: 'ok',
      basePath: '/fms',
      apiPrefix: '/fms/api',
      cookiePath: '/fms',
      ssePath: '/fms/api/events',
    });
  });

  it('çerezi alt yola sınırlar — köke de API ön ekine de değil', () => {
    configureBasePath('/fms');
    const controller = new HealthController();
    const res = fakeResponse();

    controller.health(res as never);

    expect(res.calls).toHaveLength(1);
    const [call] = res.calls;
    expect(call?.name).toBe('fms_probe');
    // Faz 1.8 değişmezi: '/' olursa kök alan adındaki diğer uygulamalara
    // sızar, '/fms/api' olursa web tarafı çerezi göremez.
    expect(call?.options['path']).toBe('/fms');
  });

  it('taban değişince çerez yolu da değişir — sabit kodlanmamış (K6)', () => {
    configureBasePath('/oyun');
    const controller = new HealthController();
    const res = fakeResponse();

    const body = controller.health(res as never);

    expect(body['cookiePath']).toBe('/oyun');
    expect(res.calls[0]?.options['path']).toBe('/oyun');
  });

  it('kök dağıtımda çerez yolu "/" olur', () => {
    configureBasePath('/');
    const controller = new HealthController();
    const res = fakeResponse();

    const body = controller.health(res as never);

    expect(body).toMatchObject({ basePath: '', apiPrefix: '/api', cookiePath: '/' });
  });

  it('joker rota eşleşmesini bildirir', () => {
    const controller = new HealthController();
    expect(controller.echo()).toEqual({ matched: 'splat' });
  });
});
