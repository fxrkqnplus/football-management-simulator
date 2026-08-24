# Yedek Barındırma Planı

> ⚠️ **İSKELET — Faz 50'de doğrulanacak.**
> Aşağıdaki seçenekler ve süreler **denenmemiştir**. Faz 50'deki geri yükleme
> tatbikatında gerçek rakamlarla değiştirilecek. Şu an sigorta poliçesi
> niteliğinde: taşınma gerektiğinde sıfırdan düşünmemek için.

## Neden var

Oracle Cloud Always Free kademesini **15 Haziran 2026'da duyurusuz olarak**
4 OCPU / 24 GB'dan 2 OCPU / 12 GB'a indirdi. Tekrar edebilir, ya da instance
geri alınabilir. Sistemin tamamı Docker Compose olduğu için taşınabilir
olması tasarım gereği; bu belge o taşınmanın haritası.

**Hedef süre: < 1 saat** (doğrulanmadı).

## Mevcut kurulum

| | |
|---|---|
| Sunucu | Oracle Cloud Always Free — Ampere A1, 2 OCPU / 12 GB / 200 GB, `eu-frankfurt-1` |
| İşletim sistemi | Ubuntu 24.04 LTS (aarch64) |
| Servisler | Docker Compose: postgres, redis, api, worker, web, caddy |
| Yedek | Günlük `pg_dump` → Cloudflare R2 (30 gün saklama) |
| Ön katman | Cloudflare proxy (`fxrkqn.org`) |

## Alternatifler

| # | Seçenek | Mimari | Maliyet | Not |
|---|---|---|---|---|
| 1 | **Google Cloud e2-micro** (Always Free) | x86_64 | $0 | Zayıf: 2 vCPU paylaşımlı, 1 GB RAM. `SimulationPolicy=balanced` zorunlu; Tam Detay kullanılamaz. Postgres + Redis + 3 uygulama 1 GB'a sığmayabilir — dış yönetilen Postgres gerekebilir. |
| 2 | **Ev bilgisayarı + Cloudflare Tunnel** | değişken | $0 | Tünel ücretsiz, açık port gerekmez. Şart: makine 7/24 açık. Elektrik ve ev internetinin çalışma süresi gerçek kısıt. |
| 3 | **Ucuz VPS** (Hetzner CAX11 / Netcup ARM) | **aarch64** | ~€4/ay | Son çare, **kullanıcı onayıyla**. Mimari üretimle aynı kalır — imajlar birebir çalışır. Maliyet hedefi (\$0) bozulur. |
| 4 | **Fly.io / Railway ücretsiz kademe** | x86_64 + arm64 | $0–? | Kalıcı disk ve uyku politikaları oyunun tur kuyruğuyla çelişebilir. Faz 50'de araştırılacak. |

**Mimari notu (K14):** 1 ve 4 x86_64 olabilir. İmajlar zaten iki mimaride de
CI'da üretiliyor (Faz 1.9), yani geçiş imaj tarafında sorun çıkarmaz.

## Kaba taşıma prosedürü

> Adımlar **denenmedi**. Faz 50'de tatbikat yapılıp süreleri ölçülecek.

1. **Yeni sunucuyu hazırla** — Docker + Docker Compose kur, `ufw` ile
   22/80/443 dışını kapat (`docs/spec/10-deployment.md` §13.3)
2. **Depoyu klonla**, `.env`'i yeniden oluştur (repoda **yok**, sırlar elle)
3. **Veri paketlerini geri yükle** — `/data/packs/` ve `/data/assets/` R2'den
4. **Veritabanını geri yükle** — R2'deki son `pg_dump` → `pg_restore`
5. **`docker compose -f docker-compose.prod.yml up -d`**
6. **Sağlık kontrolü** — postgres/redis `healthy`, `/fms/api/health` 200
7. **Cloudflare DNS** — A kaydını yeni IP'ye çevir, proxy açık kalsın
8. **Doğrula** — `https://fxrkqn.org/fms` açılıyor, giriş çalışıyor, bir tur atlanıyor

## Faz 50'de doldurulacaklar

- [ ] Her seçenek için gerçek kurulum süresi
- [ ] `pg_restore` süresi (gerçek veri boyutuyla)
- [ ] DNS yayılma süresi ölçümü
- [ ] Seçenek 1'in bellek yeterliliği — ölçülmeden "yetersiz" denmeyecek
- [ ] Tatbikat sonucu → `docs/RUNBOOK.md`
