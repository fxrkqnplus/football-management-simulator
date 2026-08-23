# Changelog

Bu projedeki tüm önemli değişiklikler bu dosyada kayıt altına alınır.
Format: [Keep a Changelog](https://keepachangelog.com/tr/1.1.0/),
sürümleme: [Semantic Versioning](https://semver.org/lang/tr/).

## [Yayınlanmamış]

### Eklendi
- Faz 0: Belge yapısı kuruldu (CLAUDE.md, docs/spec/, PROJECT_MEMORY.md, ROADMAP.md)
- `docs/spec/12-data-packs.md`: veri paketi formatı, anahtar eşleme, varlık işleme hattı,
  portre tutarlılık sistemi
- `docs/PROMPT-KITAPCIGI.md`: ateşleme / faz başlatma / oturum kurtarma promptları

### Değiştirildi
- Veri modeli gerçek-birincil hale getirildi (`DATA_MODE=full` varsayılan). Prosedürel
  üretim yedek role çekildi (newgen'ler ve eksik varlıklar için)
- Sunucu varsayılanı `SERVER_MODE=private` — kişisel kurulum
- KVKK/GDPR zorunludan koşullu hale geldi (yalnızca `SERVER_MODE=public` ise)
