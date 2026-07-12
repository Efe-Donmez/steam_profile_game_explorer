# SteamCompass (Çalışma Adı)

Steam hesabınla giriş yaparsın; sistem kütüphaneni (sahip olunan oyunlar,
oynama süreleri, başarımlar) çekip senin için zengin bir **"Oyun DNA'sı"**
profili çıkarır: tür/tag ağırlıkların, fiyat/değer davranışın, puan
tercihin, oynama tarzın (sosyal/tek başına), başarım tamamlama oranın ve
niş/mainstream eğilimin. Bu profile dayanarak çok boyutlu filtreler
(bütçe, tür/tag, puan, platform, oynama şekli, çıkış yılı) seçip hem
algoritmik hem de isteğe bağlı Claude API destekli öneriler alırsın.

Genel "en çok satanlar" listesi değil — gerçekten oynadığın, ne kadar
oynadığın, ne kadar ödediğin ve nasıl oynadığından (co-op mu, tek başına
mı) çıkan çok katmanlı bir zevk profiline dayanan bir öneri motoru.

Ürün vizyonu, veri modeli, dış API kısıtları ve faz planı için
[CLAUDE.md](CLAUDE.md) dosyasına bakabilirsin.

## Teknoloji Yığını

| Katman | Teknoloji |
|---|---|
| Backend | NestJS (TypeScript) — [apps/api](apps/api) |
| Frontend | Angular + TailwindCSS — [apps/web](apps/web) |
| Veritabanı | MongoDB (Mongoose) |
| Kuyruk/Cache | Redis + BullMQ |
| Auth | Steam OpenID 2.0 + JWT |
| Harici API'ler | Steam Web API, Steam Store API, Steam Reviews API, SteamSpy (opsiyonel), Anthropic API |

## Ön Koşullar

- Node.js (LTS) ve npm
- Çalışan bir MongoDB instance'ı
- Çalışan bir Redis instance'ı
- Bir [Steam Web API anahtarı](https://steamcommunity.com/dev/apikey)
- Bir Anthropic API anahtarı (AI destekli öneri modu için)

## Kurulum

Bu repo npm workspaces ile yönetilen bir monorepo (`apps/api` + `apps/web`).

```bash
# 1. Bağımlılıkları kur (kök dizinden, her iki workspace için de kurar)
npm install

# 2. Ortam değişkenlerini ayarla
cp .env.example .env
# .env içindeki STEAM_API_KEY, JWT_SECRET, ANTHROPIC_API_KEY ve
# MONGO_URI / REDIS_URL değerlerini kendi ortamına göre doldur
```

### Geliştirme sunucularını çalıştır

```bash
# Backend (NestJS) — http://localhost:3000
npm run start:api

# Frontend (Angular) — http://localhost:4200
npm run start:web
```

MongoDB ve Redis'in `.env` içindeki `MONGO_URI` / `REDIS_URL` adreslerinde
çalışıyor olması gerekir (örn. yerelde Docker ile ayağa kaldırılabilir).

### Build

```bash
npm run build:api
npm run build:web
```

## Proje Durumu

Faz planı [CLAUDE.md §7](CLAUDE.md#7-faz-planı-claude-code-i̇çin) içinde
tanımlı — repo iskeleti ve auth akışından başlayarak kütüphane
senkronizasyonu, Oyun DNA'sı profil çıkarımı, filtre/öneri API'si ve
Claude API destekli yeniden sıralamaya kadar aşamalı olarak ilerliyor.
