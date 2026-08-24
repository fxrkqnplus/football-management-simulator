# ADR-0002 — Alt yol dağıtımı: `fxrkqn.org/fms`

**Durum:** Kabul edildi
**Tarih:** 2026-08-24 *(karar Faz 1.4/1.8'de uygulandı, kayıt faz kapanışında)*
**Faz:** 1

---

## Bağlam

Uygulama kök alan adında değil, **`/fms` alt yolunda** çalışacak. Alan adı
başka şeyler de barındırıyor; alt alan adı yerine alt yol seçildi.

Alt yolun maliyeti şudur: yol bilgisi **yedi ayrı katmanda** kullanılır ve her
biri ayrı ayrı, sessizce kırılabilir. Kırılma çalışma zamanında 404 olarak
görünür; derleme hep yeşil kalır.

## Karar

**Tek ortam değişkeni — `PUBLIC_BASE_PATH` — ve tek türetme noktası.**

`packages/shared/src/base-path.ts` içindeki `deriveBasePathConfig()` yedi
katmanın hepsini tek bir değerden üretir. Kodda hiçbir yere `/fms` yazılmaz;
ESLint kuralı `local/no-hardcoded-path` bunu zorlar (K6).

| Katman | Nereden gelir |
|---|---|
| Vite `base` | `config.viteBase` (`/fms/`) |
| React Router `basename` | `config.routerBasename` |
| API ön eki (`setGlobalPrefix`) | `config.apiPrefix` |
| SSE uç noktası | `config.ssePath` |
| Çerez `path` | `config.cookiePath` |
| Servis çalışanı kapsamı | `config.serviceWorkerScope` |
| PWA manifest (`id`/`scope`/`start_url`) | `config.pwa` |

Tarayıcı tarafında değer derleme zamanında `define` ile gömülür ve
`configureBasePath()`'e verilir; sunucu tarafında `process.env`'den okunur.

## Kanıt (Faz 1.8)

`PUBLIC_BASE_PATH` `/fms` → `/oyun` yapıldı, ikisi de yeniden derlendi,
**tarayıcıda** doğrulandı: yedi katman da uydu, statik varlık yolu
`/oyun/assets/...` oldu, `/fms/*` 404 döndü. Sonra geri alındı.

Kabul kriteri "PUBLIC_BASE_PATH değiştirilince her yer uyuyor" bu testle
kapandı.

## Ölçülen tuzaklar

Bu kararın maliyeti teorik değil. Faz 1.8'de üçü de "derleme başarılı"
derken yakalandı:

### 1. Vite `base` sessizce köke düşüyordu

`vite.config.ts` içinde `loadEnv`'e verilen dizin `new URL('../..',
import.meta.url).pathname` ile hesaplanıyordu. Windows'ta bu **`/C:/fms/`**
üretiyor; `loadEnv` hiçbir şey bulamıyor, `base` sessizce `/` oluyordu.
Derleme yeşil, üretimde her varlık 404.

**Karşı önlem:** `envDir` göreli verilir (`'../..'`) **ve**
`PUBLIC_BASE_PATH` okunamazsa derleme yüksek sesle durur. Sessizce köke
düşmek bu hata sınıfının ta kendisi.

### 2. NestJS 11 / Express 5 joker rotası — çökmüyor, dönüştürüyor

`path-to-regexp` adlandırılmış joker istiyor (`*splat`). Ama eski sözdizimi
(`/*`) yazıldığında NestJS 11 **çökmez**: `LegacyRouteConverter` devreye
girer, `WARN Unsupported route path ... auto-convert to "{*path}"` basar ve
uygulama açılır.

Yani tuzak "patlayan" değil **"sessizce dönüştürülen"** cinsten — log
okunmazsa fark edilmez ve dönüştürülen desen niyetten sapabilir.
Doğru sözdizimi elle yazılır, otomatik dönüştürücüye güvenilmez (SAPMA-006).

### 3. CORS güvenli liste

NestJS 11'de yalnızca CORS güvenli listesindeki metotlar varsayılan açık.
`PUT`/`PATCH`/`DELETE` `enableCors({ methods: [...] })` içinde **açıkça**
tanımlanmazsa tarayıcı ön kontrol isteğini reddeder.

## Üretim yerleşimi

`docs/spec/10-deployment.md` §13.2:

```
fxrkqn.org {
  handle /fms/api/* { reverse_proxy api:3001 }
  handle /fms/*     { reverse_proxy web:3000 }
}
```

Ön ek **soyulmadan** iletilir (`handle`, `handle_path` değil). Bu yüzden web
konteynerindeki Caddy kendi tarafında `handle_path {$PUBLIC_BASE_PATH}/*` ile
soyar. Alt yol orada da sabit yazılmaz, ortamdan gelir.

**Frontend origin konteynerinde durur, Cloudflare Pages'te değil** (Ç2):
aynı hostname'in bir alt yolunu Pages'e yönlendirmek Workers akrobasisi
gerektirir ve tek-origin sadeliğini bozar. Cloudflare önde proxy olarak kalır;
statik varlıklar önbellek kuralıyla hızlandırılır.

## Sonuçlar

**Olumlu**
- Alt yol tek satırda değiştirilebilir ve testle kanıtlanabilir
- `no-hardcoded-path` + `arch:check` varlık denetimi ikili koruma sağlar
- Kök alan adı etkilenmez

**Olumsuz**
- Her yeni katman (PWA — Faz 49) bu türetmeye bağlanmayı unutmamalı
- Üçüncü taraf bir kütüphane mutlak yol varsayarsa istisna gerekir

## Yeniden değerlendirme koşulu

Uygulama alt alan adına (`fms.fxrkqn.org`) taşınırsa. O durumda
`PUBLIC_BASE_PATH=/` yeterlidir — `normalizeBasePath` kök dağıtımı zaten
destekliyor ve birim testi var.
