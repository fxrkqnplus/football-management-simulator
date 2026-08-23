<!-- Bu dosya ana spesifikasyondan üretilmiştir. Kaynak: docs/MASTER-SPEC.md -->

# 13. DAĞITIM

## 13.1 Üretim Ortamı

```
Oracle Cloud Always Free — Ampere A1 (ARM64)
  Bölge:  eu-frankfurt-1
  Kaynak: 2 OCPU / 12 GB RAM / 200 GB blok depolama / 10 TB egress
  OS:     Ubuntu 24.04 LTS (aarch64)

Cloudflare (fxrkqn.org)
  DNS → proxy AÇIK (turuncu bulut)
  SSL → Full (Strict), origin sertifikası
  WAF → temel kural seti
  Turnstile → kayıt/giriş
  R2 → fms-assets bucket, özel alan adı

Alt yol: https://fxrkqn.org/fms
```

## 13.2 Caddy Yapılandırması

```
fxrkqn.org {
  handle /fms/api/* {
    reverse_proxy api:3001
  }
  handle /fms/* {
    reverse_proxy web:3000
  }
  # Kök alan adı etkilenmez
}
```

## 13.3 Sunucu Sağlamlaştırma

```bash
# SSH: yalnızca anahtar, root kapalı, port değişimi opsiyonel
# ufw: 22, 80, 443 — başka hiçbir port açık değil
# fail2ban: sshd + caddy jail
# unattended-upgrades: güvenlik yamaları otomatik
# DİKKAT: Oracle Ubuntu imajlarında iptables kuralları /etc/iptables/rules.v4
#         içinde sabittir. ufw ile çakışır. Kurulum betiği bunu temizler.
```

## 13.4 Yedekleme

```bash
# Günlük 03:00 (cron)
pg_dump --format=custom fms | gzip > backup-$(date +%F).dump.gz
rclone copy backup-*.dump.gz r2:fms-backups/db/
# 30 gün saklama, eskiler silinir

# Haftalık: /data/assets tam arşiv → R2
```

**Geri yükleme tatbikatı (Faz 50'de bir kez zorunlu):** Sıfır sunucudan tam geri yükleme yapılır, süresi `docs/RUNBOOK.md`'ye yazılır.

## 13.5 Ücretsiz Kademe Sınır Takibi

| Servis | Sınır | Uyarı eşiği |
|---|---|---|
| Oracle disk | 200 GB | 160 GB |
| Oracle egress | 10 TB/ay | 8 TB |
| Cloudflare R2 | 10 GB | 8 GB |
| R2 Class A ops | 1M/ay | 800K |
| Resend | 3.000/ay, 100/gün | 2.400 / 80 |
| Sentry | 5.000 olay/ay | 4.000 |

Eşik aşılınca panel uyarısı + admin e-postası.

## 13.6 Yedek Barındırma Planı

`docs/HOSTING-FALLBACK.md` içinde tutulur. Oracle limitleri tekrar düşürürse:
1. Google Cloud e2-micro (Always Free, zayıf — Dengeli mod zorunlu)
2. Ev bilgisayarı + Cloudflare Tunnel (ücretsiz, PC açık kalmalı)
3. Ucuz VPS (~€4/ay) — son çare, kullanıcı onayı ile

Taşıma prosedürü: yeni sunucuya `docker compose`, R2'den son yedek geri yükleme, Cloudflare DNS güncelleme. Hedef süre: **< 1 saat**.

---
