<!-- Bu dosya ana spesifikasyondan üretilmiştir. Kaynak: docs/MASTER-SPEC.md -->

# 10. YÖNETİM PANELİ VE SUNUCU MODLARI

## 10.1 Mod Sistemi

```ts
type ServerMode = 'public' | 'private' | 'maintenance';
```

> **Varsayılan `private`.** `.env`'de `SERVER_MODE=private` ile açılır. Kişisel kurulumda
> bu modda kalır: kayıt teknik olarak açıktır ama yalnızca izin listesindeki hesaplar
> oyunu başlatabilir. `public` moda geçiş bilinçli bir karardır ve KVKK metinlerini
> (`docs/LEGAL/`) otomatik olarak aktive eder.

| Mod | Kayıt | Giriş | Oyun | Erişim |
|---|---|---|---|---|
| `public` | Açık | Herkes | Herkes | Herkes |
| `private` | Açık | Herkes | **Yalnızca izin listesi** | Herkes (izinsizler mesaj ekranı görür) |
| `maintenance` | Kapalı | Kapalı | Kapalı | **Yalnızca IP izin listesi** |

**Guard uygulaması:**
```ts
@Injectable()
export class ServerModeGuard implements CanActivate {
  // 1. Redis'ten modu oku (TTL 30 sn, mod değişince invalidate)
  // 2. Kullanıcı rolü 'admin' ise → HER ZAMAN geç
  // 3. EMERGENCY_ADMIN_TOKEN query parametresi eşleşiyorsa → geç
  // 4. mode === 'maintenance' → CF-Connecting-IP admin_ips ile eşleşmeli
  // 5. mode === 'private' && rota oyun rotası → user_access_grants kontrolü
  // 6. mode === 'public' → geç
}
```

**Gerçek IP tespiti (kritik):**
```ts
function getClientIp(req): string {
  // Cloudflare arkasındayız. X-Forwarded-For TAKLİT EDİLEBİLİR, kullanılmaz.
  const cfIp = req.headers['cf-connecting-ip'];
  if (!cfIp) throw new Error('CF-Connecting-IP eksik — Cloudflare arkasında değil misiniz?');
  // Ek güvenlik: isteğin geldiği soket IP'si Cloudflare aralığında mı?
  if (!isCloudflareIp(req.socket.remoteAddress)) throw new ForbiddenError();
  return cfIp;
}
```

**Kilitlenme koruması (üç katman):**
1. `EMERGENCY_ADMIN_TOKEN` — `?admin_token=xxx` ile her modda giriş
2. CLI: `docker compose exec api pnpm admin:set-mode public`
3. Bakım moduna geçerken mevcut IP **otomatik** izin listesine eklenir; onay ekranında gösterilir:
   > *"Mevcut IP adresiniz (85.x.x.x) izin listesine eklenecek. Dinamik IP kullanıyorsanız IP'niz değişince erişiminizi kaybedebilirsiniz. Acil durum token'ınızı not aldınız mı?"*

## 10.2 Panel Bölümleri

**Kullanıcılar** — liste (e-posta, kullanıcı adı, kayıt tarihi, son giriş, doğrulama, rol, durum, kayıt sayısı, disk), arama/filtre, detay sayfası (IP geçmişi, oturum geçmişi, audit log, gönderilen e-postalar), eylemler (rol değiştir, şifre sıfırlama gönder, e-postayı doğrula, askıya al, sil, izin listesine ekle)

**Kayıtlar** — liste (sahip, ad, kulüp, sezon, tur, boyut, son oynama, sim modu, liderlik bayrağı), salt-okunur durum görüntüleyici, **taşıma**, **silme**, JSON dışa/içe aktarma, toplu arşivleme

**Kayıt taşıma akışı:**
```
1. Kaynak kayıt + hedef kullanıcı seçilir
2. Doğrulama: hedef var mı, aktif slot < 3 mü, kayıt kilitli değil mi
3. Özet ekranı: kaynak sahip → hedef sahip, kayıt detayları
4. Yazılı onay ("TAŞI" yazın)
5. saves.userId güncellenir, save_transfers tablosuna kayıt (7 gün geri alınabilir)
6. İki tarafa da e-posta bildirimi
7. audit_log'a admin eylemi yazılır
```

**Sunucu** — mod anahtarı (önizlemeli), IP izin listesi (CIDR, "mevcut IP'mi ekle"), kullanıcı izin listesi, aktif oturum sayacı, kuyruk uzunluğu

**Telemetri** — disk (200 GB), DB boyutu + tablo dökümü, R2 (10 GB + işlem sayacı), Resend kotası (3.000/ay), CPU/RAM, kuyruk metrikleri, 24 saatlik grafikler. **%80 eşiğinde panel uyarısı + e-posta.**

**Moderasyon** — şikâyet kuyruğu, anomali bayrakları, liderlik tablosundan çıkarma/geri alma

**Denetim** — audit log görüntüleyici (kullanıcı/eylem/tarih/`correlationId` filtresi), CSV dışa aktarma. Admin eylemleri de loglanır.

## 10.3 Anomali Kuralları

```ts
const ANOMALY_RULES = [
  { code: 'impossible_budget',   check: (s) => s.transferBudget > s.clubRevenue * 4 },
  { code: 'absurd_goals',        check: (s) => s.seasonGoals > 180 },
  { code: 'unbeaten_streak',     check: (s) => s.unbeatenMatches > 80 },
  { code: 'turn_rate',           check: (s) => s.turnsInLastHour > 400 },
  { code: 'value_spike',         check: (s) => s.squadValueGrowthRate > 5.0 },
  { code: 'negative_balance',    check: (s) => s.balance < -s.clubRevenue * 2 },
  { code: 'squad_size',          check: (s) => s.squadSize > 60 || s.squadSize < 11 },
];
```
Bayrak → `saves.anomalyFlagged = true` → liderlik tablosundan otomatik çıkarılır → moderasyon kuyruğuna düşer.

---
