# CLAUDE.md — SteamCompass (Çalışma Adı)

> Bu dosya Claude Code'un proje boyunca referans alacağı ana spesifikasyondur.
> "SteamCompass" çalışma adıdır, istersen değiştir. Tasarım tarafı için
> `claude-design-prompt.md` dosyasına bakılmalı — buradaki veri modeli o
> tasarımdaki her paneli (Oyun DNA'sı dashboard'u + detaylı filtre/öneri
> ekranı) besleyecek şekilde kurgulandı.

## 1. Ürün Vizyonu

Kullanıcı Steam hesabıyla giriş yapar. Sistem, kullanıcının Steam
kütüphanesini (sahip olunan oyunlar, oynama süreleri, başarımlar) çeker ve
bundan zengin bir **"Oyun DNA'sı" profili** çıkarır: tür/tag ağırlıkları,
fiyat/değer davranışı, puan tercihi, topluluk yorumu tercihi, oynama tarzı
(sosyal/tek başına), başarım tamamlama oranı, niş/mainstream eğilimi ve
zaman içindeki dağılım. Kullanıcı bu profile dayanarak çok boyutlu filtreler
(bütçe, tür/tag, puan, platform, oynama şekli, çıkış yılı) seçer ve hem
algoritmik hem de isteğe bağlı LLM destekli (Claude API) öneriler alır;
AI modunda doğal dille sonucu daraltabilir ("daha kısa oyunlar olsun" gibi).

**Neden farklı:** Genel "en çok satanlar" listesi değil — kullanıcının
GERÇEKTEN oynadığı, ne kadar oynadığı, ne kadar ödediği ve nasıl oynadığından
(co-op mu, tek başına mı) çıkan çok katmanlı bir zevk profiline dayanıyor.

## 2. Teknoloji Yığını

| Katman | Teknoloji |
|---|---|
| Backend | NestJS (TypeScript) |
| Frontend | Angular + TailwindCSS |
| Veritabanı | MongoDB (Mongoose) |
| Kuyruk/Cache | Redis + BullMQ (Steam senkronizasyonu için zorunlu) |
| Auth | Steam OpenID 2.0 (`passport-steam-openid`) + JWT session |
| Harici API'ler | Steam Web API, Steam Store API, Steam Reviews API, SteamSpy (opsiyonel), Anthropic API |

## 3. Dış API Envanteri — Kritik Kısıtlar

Bu proje, tasarımdaki "Oyun DNA'sı" dashboard'unun 14 panelini ve filtre
ekranının facet'lerini beslemek için Steam'in birden fazla ayrı API'sini
birleştiriyor. Her biri farklı rate-limit ve güvenilirlik seviyesinde:

| API | Ne için kullanılıyor | Kısıt/Not |
|---|---|---|
| **OpenID (`steamcommunity.com/openid`)** | Giriş | JS'den değil, backend'den yapılmalı |
| **`ISteamUser/GetPlayerSummaries`** | Persona adı, avatar, `communityvisibilitystate`; arkadaş listesi için `steamids` ile toplu da çağrılıyor (çevrimiçi durum, o an oynadığı oyun) | Profil private ise sınırlı veri döner |
| **`IPlayerService/GetOwnedGames`** | Kütüphane, `playtime_forever`, `playtime_2weeks` | `include_appinfo=true` ile isim/logo da gelir |
| **`IPlayerService/GetRecentlyPlayedGames`** | Son 2 hafta oynama temposu paneli için | — |
| **`ISteamUser/GetFriendList`** | Arkadaş listesi paneli (steamId + arkadaşlık tarihi) | Private profilde 401/boş döner — sessizce boş listeye düş |
| **`IStoreService/GetAppList`** | Global appid → isim eşlemesi | Eski `ISteamApps/GetAppList/v2` deprecated, kullanma |
| **`store.steampowered.com/api/appdetails`** | Tür, kategori/özellik bayrakları, fiyat, `metacritic.score`, çıkış tarihi, geliştirici/yayıncı, platformlar, açıklama, ekran görüntüleri | **~200 istek/5dk rate-limit** — agresif cache şart |
| **`store.steampowered.com/appreviews/{appid}`** | `query_summary` (total_positive/negative, `review_score_desc`) | Anahtarsız, ama yine cache'le |
| **`ISteamUserStats/GetPlayerAchievements`** | Kullanıcının oyun başına açtığı başarımlar | Oyun başına ayrı çağrı — büyük kütüphanelerde kuyruklanmalı |
| **`ISteamUserStats/GetGlobalAchievementPercentagesForApp`** | Başarım nadirlik yüzdesi ("Başarım Karnesi" paneli) | Oyun başına cache'lenmeli, sık değişmez |
| **SteamSpy (`steamspy.com/api.php`)** | Tahmini sahip sayısı, ortalama/medyan oynama süresi (Niş Skoru + Değer Haritası panelleri) | **Resmi değil** — UI'da her zaman "tahmini" etiketiyle gösterilmeli |
| **Anthropic API** | AI destekli yeniden sıralama + diyalog tabanlı filtre inceltme | Özetlenmiş profil gönder, ham kütüphane değil |

> **Metacritic notu:** Metacritic'in ücretsiz/resmi bir genel API'si yok
> (ücretli Fabric Origin API veya ToS riski taşıyan scraper'lar dışında).
> Bu yüzden proje boyunca "Metacritic puanı" zaten Steam'in `appdetails`
> yanıtındaki `metacritic.score` alanından geliyor — ayrı bir Metacritic
> entegrasyonu YOK, bunu ayrı bir iş kalemi olarak planlama.

- **Günlük genel limit:** `api.steampowered.com` için 100K istek/gün.
  → Kullanıcı girişinde canlı senkron yapma; BullMQ + cron ile periyodik/kuyruklu senkronizasyon.
- **appdetails/appreviews rate-limit:** İstekler arası delay + `games`/`gameReviews`
  koleksiyonlarında cache + `lastFetchedAt` kontrolü ile sadece eksik/eskimiş kayıtları güncelle.
- **Achievements çağrıları:** Kullanıcı başına, kütüphanedeki her oyun için ayrı
  istek gerektirdiğinden en maliyetli iş — düşük öncelikli bir kuyruk job'ı
  olarak arka planda, kullanıcı deneyimini bloklamadan yürümeli.

## 4. Veri Modeli (MongoDB Koleksiyonları)

```
users
  _id, steamId, personaName, avatarUrl, profileVisibility,
  jwtRefreshTokenHash, createdAt, lastSyncedAt

steamLibraries          // kullanıcı başına ham kütüphane
  _id, userId, appid, playtimeForeverMinutes,
  playtime2WeeksMinutes, lastPlayed, syncedAt

games                   // global katalog cache (appdetails'ten)
  _id, appid, name, genres[], categories[], tags[] (community, opsiyonel),
  priceCents, currency, discountPercent, isFree,
  metacriticScore, releaseDate, headerImage, shortDescription,
  screenshots[], developers[], publishers[], platforms: {windows, mac, linux},
  lastModified, lastFetchedAt

gameReviews             // appreviews cache
  _id, appid, totalPositive, totalNegative, reviewScoreDesc,
  lastFetchedAt

gameAchievements        // kullanıcı başına, oyun başına başarım durumu
  _id, userId, appid, achievements: [{apiName, achieved, unlockTime}],
  completionPercent, syncedAt

globalAchievementStats  // oyun başına, başarım başına küresel açılma yüzdesi
  _id, appid, achievements: [{apiName, globalUnlockPercent}], lastFetchedAt

steamSpyCache           // opsiyonel, tahmini veri
  _id, appid, ownersRangeLabel, avgPlaytimeForever, avgPlaytime2Weeks,
  fetchedAt

userProfiles            // türetilmiş "Oyun DNA'sı" — dashboard'un tamamını besler
  _id, userId,
  genreWeights: {genre: score}, tagWeights: {tag: score},
  avgPricePaid, avgMetacriticPreference, avgReviewScorePreference,
  featureCoverage: {multiplayer, coop, controller, cloudSave, achievements}, // yüzde
  nicheScore, // SteamSpy owners'a göre hesaplanan mainstream<->niş skoru
  avgAchievementCompletion,
  totalPlaytimeMinutes, totalEstimatedSpendCents,
  releaseYearHistogram: {year: count},
  metacriticHistogram: {bucket: count},
  reviewSentimentBuckets: {excellent, positive, mixed, negative},
  updatedAt

savedFilterPresets      // kullanıcının kaydettiği filtre kombinasyonları
  _id, userId, label, filters (bkz. recommendationRequests.filters), createdAt

recommendationRequests
  _id, userId, filters: {
    priceMin, priceMax, onlyDiscounted, includeFree,
    genres[], tags[],
    minMetacritic, reviewSentiment ("any"|"positive"|"very_positive"|"overwhelming"),
    platforms[], playstyle[] (multiplayer/coop/controller/achievements/cloudSave),
    releaseYearMin, releaseYearMax
  },
  mode: "algorithmic" | "ai_assisted", createdAt

recommendationResults
  _id, requestId, gameId, score, reasoning, reasoningFactors[] (örn.
  ["TÜR EŞLEŞMESİ","FİYAT UYUMU"]), rank

aiRefinementTurns       // AI modundaki diyalog çubuğunun geçmişi
  _id, requestId, userMessage, appliedFilterDelta (ör. {maxPlaytimeHours: 15}),
  createdAt

syncJobs                // BullMQ job takibi/log
  _id, userId, type ("library"|"catalog"|"reviews"|"achievements"),
  status, startedAt, finishedAt, error
```

## 5. Öneri Algoritması — İki Kademeli Yaklaşım

**Kademe 1 — İçerik bazlı skorlama (her zaman çalışır, LLM gerektirmez):**
1. `steamLibraries` + `games` join ederek playtime-ağırlıklı tür/tag vektörü
   çıkar (`weight = log(playtimeMinutes + 1)`), `userProfiles.genreWeights`/`tagWeights`'e yaz.
2. Kullanıcının seçtiği çok boyutlu filtrelerle (`recommendationRequests.filters`)
   `games` + `gameReviews` join'inden aday havuzu oluştur.
3. Aday havuzunu tür/tag vektörüyle cosine similarity ile sırala; Metacritic
   puanı ve review sentiment'i ikincil sıralama faktörü olarak kullan.
4. Facet sayaçlarını (filtre panelindeki canlı "tahmini X sonuç" göstergesi
   için) aynı sorgudan türet — ayrı bir ağır sorguya gerek yok, aggregation
   pipeline ile tek seferde say.

**Kademe 2 — LLM destekli yeniden sıralama + diyalog (opsiyonel "AI Öneri" modu):**
1. Kademe 1'in top-N adayı + kullanıcının ÖZETLENMİŞ profilini (ham veri
   değil, insan-okur özet: "En çok RPG ve strateji oynuyor, ortalama 60 TL
   civarı oyun alıyor, 80+ puan tercih ediyor, genelde tek başına oynuyor")
   Claude API'ye gönder.
2. Yapılandırılmış JSON formatında nihai sıralama + kısa gerekçe +
   `reasoningFactors` (UI'daki mono etiketler için, örn. `["TÜR EŞLEŞMESİ","PUAN"]`) iste.
3. **Diyalog inceltme:** Kullanıcı AI diyalog çubuğuna doğal dille bir şey
   yazdığında (`aiRefinementTurns`), Claude'dan bunu somut bir filtre
   değişikliğine (`appliedFilterDelta`) çevirmesini iste, bu delta'yı
   mevcut filtrelere uygula ve sonucu yeniden hesapla. UI'da bu değişiklik
   şeffaf şekilde gösterilmeli (bkz. tasarım promptu 5.7) — kara kutu değil.
4. Hata/timeout durumunda otomatik olarak Kademe 1 sonucuna düş.

## 6. KVKK / Gizlilik Notları

- Steam verisi (kütüphane, oynama süresi, başarımlar) kişisel veri sayılır →
  açık rıza metni login akışına eklenmeli.
- Kullanıcı hesabını sildiğinde `steamLibraries`, `gameAchievements`,
  `userProfiles`, `recommendationRequests`, `aiRefinementTurns`,
  `savedFilterPresets` verilerinin de silindiği bir "hesap silme" akışı olmalı.
- LLM'e gönderilen veri, mümkün olduğunca özetlenmiş/anonimleştirilmiş olmalı.
- SteamSpy gibi resmi olmayan kaynaklardan gelen veriler kullanıcıya her
  zaman "tahmini" olarak işaretlenmeli, kesin veri gibi sunulmamalı.

## 7. Faz Planı (Claude Code için)

Detaylı adım adım implementasyon talimatları `claude-code-prompt.md`
dosyasındadır. Özet:

- **Faz 0:** Repo iskeleti, NestJS + Angular monorepo, Mongoose/Redis bağlantıları.
- **Faz 1:** Steam OpenID auth akışı + JWT session.
- **Faz 2:** Kütüphane senkronizasyonu + temel katalog cache (`games`).
- **Faz 3:** Review cache (`gameReviews`) + achievements senkronizasyonu
  (`gameAchievements`, `globalAchievementStats`) + opsiyonel SteamSpy cache.
- **Faz 4:** "Oyun DNA'sı" profil çıkarım servisi — tüm `userProfiles`
  alanlarını (tür/tag ağırlıkları, histogramlar, niche score, feature
  coverage vb.) hesaplayan tam kapsamlı servis.
- **Faz 5:** Çok boyutlu filtre UI'ı + facet sayaçları + Kademe 1 algoritmik öneri API'si.
- **Faz 6:** Kademe 2 — Claude API entegrasyonu (yeniden sıralama + diyalog inceltme).
- **Faz 7:** Karşılaştırma modu, Hızlı Bakış paneli, kaydedilmiş filtre presetleri.