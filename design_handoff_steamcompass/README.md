# Handoff: SteamCompass — "Mission Control" Concept

## Overview
SteamCompass analyzes a user's Steam library and turns it into a taste profile, then recommends games that fit their budget, genres, and score preferences. The visual language is a radar / mission-control HUD metaphor: the user is a "signal source," their game genres orbit around them, and the recommendation engine is a scanning system. This bundle covers 5 screens: Landing, Sync (scanning loader), Profile ("Oyun DNA'sı" data dashboard), App (filter + recommendation results), and Empty/Error states.

## About the Design Files
The files in this bundle (`*.dc.html`) are **design references built in HTML/React-like pseudocode** — they demonstrate intended look, layout, data shapes, and interaction behavior. They are **not production code to copy directly**. Your task is to **recreate these designs in Angular** (the target framework specified by the team), using Angular's component model, template syntax, and whatever styling approach (SCSS modules, Tailwind, Angular Material, etc.) fits the existing/target codebase — not to port the HTML/JSX verbatim. If no Angular project exists yet, scaffold one with the Angular CLI and standalone components.

Concretely, translate:
- Each `.dc.html` "page" → an Angular routed component (e.g. `LandingComponent`, `SyncComponent`, `ProfileComponent`, `AppComponent`/`RecommendationsComponent`, `EmptyStatesComponent`).
- Inline React state (`this.state`, `setState`) → Angular component class fields + `signal()`/`@Input`/`@Output` or RxJS `BehaviorSubject`, whichever matches the codebase's existing patterns.
- Inline `style="..."` React-style objects → Angular component SCSS files (one per component) or utility classes, following the codebase's existing convention.
- SVG charts built via `React.createElement` in the logic class → Angular template `<svg>` markup driven by computed getters/signals (the math is documented below per chart).

## Fidelity
**High-fidelity (hifi)**: All colors, type, spacing, and copy (in Turkish) in the files are final. Recreate pixel-perfectly using the token list below, adapted to Angular's styling system.

## Design Tokens

### Colors
- Void Ink `#060A14` — page background
- Deep Slate `#0E1524` — panel/card surfaces
- Panel Line `#1B2436` — borders, dividers
- Ion Cyan `#4CF3FF` — primary accent (Algorithmic mode, links, active states)
- Signal Violet `#8B7CF6` — secondary accent, reserved for "AI Mode" only — never combine both as dominant on one screen; switching mode swaps the whole UI's accent color
- Amber Flare `#FFB84D` — score badges, discount badges
- Ghost White `#E9EEF5` — primary text
- Slate Mute `#7C8AA0` — secondary/caption text
- Critical Red `#FF4D6D` — errors, private-profile warning

Background treatment on every full-bleed section: a very faint (2–4% opacity) fixed grid texture (`linear-gradient` 1px lines every 48px) plus 1–2 large blurred radial-gradient "gas cloud" blobs (10–10% opacity, 120px+ blur) in Cyan and/or Violet.

### Typography
- Display/headings: **Chakra Petch** (500/600/700) — letter-spacing +0.3–1px
- Body: **Inter** (400/500/600)
- All numbers/telemetry (prices, scores, hours, percentages, appids): **IBM Plex Mono** (400/500/600) — always, no exceptions

### Shape & Effects
- Card radius: 8–10px (not pill) — pill radius (999px) reserved for chips/badges
- Card border: 1px solid Panel Line; hover → cyan glow `box-shadow: 0 0 12px rgba(76,243,255,0.25)`
- Signature detail: 12–14px corner-bracket decorations (open L-shaped corners, 1.5px stroke, ~50% opacity) on all major panels — decorative "targeting reticle" cue, not functional
- Spacing scale: 4/8/12/16/24/32/48/64/96/120px

### Motion
- Hero/loading radar: one-time 360° sweep on mount (2–3s), signature animation — do not reuse this style of animation elsewhere
- Card hover: translateY(-4px) + border glow only, no scale/bounce
- Respect `prefers-reduced-motion`: freeze all animations to final frame

## Screens

### 1. Landing (`Landing.dc.html`)
**Purpose**: Convince the user to connect their Steam account; explain the product in ~30 seconds.

**Layout**: Sticky top navbar (logo left, nav links + primary CTA right, blurred translucent background). Below: full-height hero (2-col grid — copy left, orbit/radar hero visualization right). Then a 3-panel "How It Works" row (numbered 01/02/03). Then a 3-block alternating feature showcase (Oyun DNA'n preview, filter panel preview, AI-mode callout with violet accent). Then a thin trust/principles strip (3 mono statements). Then a centered closing CTA + minimal footer.

**Hero radar visualization** (signature motif, reused on Profile & Sync too): center "SEN" (=YOU) node, 6–8 genre nodes orbiting at radius proportional to a "weight" value, thin lines from center to each node, faint concentric rings, plus a rotating "sweep" wedge (conic gradient/triangular path from center) that sweeps once on load then can idle.

**Copy is final** — see file for exact Turkish strings (headline "Kütüphanen zaten cevabı biliyor.", CTA "Steam ile Bağlan ve Taramayı Başlat", etc.) — copy verbatim into Angular templates/i18n files.

### 2. Sync — Scanning Screen (`Sync.dc.html`)
**Purpose**: Hold the user's attention while their library is being fetched (can take a while).

**Layout**: Fully centered single column, no side content. Center: large active radar sweep animation (continuous spin ~2.4s/rotation while loading). Below: a **single status line** (not stacked) that cycles every ~2.2s through 4 real-sounding process strings: `KÜTÜPHANE OKUNUYOR...` → `184 OYUN BULUNDU` → `TÜR VERİLERİ EŞLEŞTİRİLİYOR...` → `ZEVK PROFİLİ HESAPLANIYOR...`. Implement as a timed rotation (setInterval / RxJS `interval`) swapping one text node — **do not** stack multiple absolutely-positioned strings with only CSS `animation-delay`, as delay alone does not hide them before their turn (this was a bug we hit and fixed by driving it from component state instead).
Below that: an indeterminate flowing progress line (a gradient bar sliding left-to-right on loop, not a percentage).
Footer note: reassurance not to close the tab.

### 3. Profile — "Oyun DNA'sı" Dashboard (`Profile.dc.html`)
**Purpose**: The most data-dense, "wow" screen — a full bento-grid instrument panel surfacing everything derived from the user's library. Long, scrolling page, NOT a single card.

**Data source mapping** (for backend/API work, not shown on screen):
- Steam `IPlayerService/GetOwnedGames` → playtime per game, appid
- Steam `store/appdetails` → genres, categories/features, price, metacritic.score, release_date, developers/publishers
- Steam `store/appreviews` → positive/negative vote counts
- Steam `ISteamUserStats/GetPlayerAchievements` + `GetGlobalAchievementPercentagesForApp` → achievement completion + global rarity
- SteamSpy public `steamspy.com/api.php` (unofficial) → estimated owner count, average playtime — always label these values "tahmini" (estimated) in UI since the source is unofficial

**Layout**: KPI strip (6 stat cells: total games, total hours, estimated total spend*, avg positive review %, avg Metacritic score, avg achievement completion %) with a disclaimer footnote about spend being current list price, not purchase price. Below: a 12-column CSS grid (bento layout) containing, in order:
1. **Hero orbit panel** (spans 6 cols × 2 rows) — same radar/orbit motif as Landing but real data; includes a TÜR/TAG (Genre/Tag) toggle switching between two different real data sources (official genres vs. community tags) — this distinction must stay visible to the user; below the chart, an auto-generated summary sentence.
2. **Most-played 15 games** (spans 6 cols × 2 rows) — ranked horizontal bar list, genre chip per row, hours in mono at right, scrollable.
3. **Price/Playtime scatter** (4 cols) — X = price, Y = hours; top-right region highlighted as "best value."
4. **Metacritic histogram** (4 cols) — 6 score buckets + a 7th "unrated" bucket (never hide missing data); user's average marked with a dashed vertical line.
5. **Review-ratio donut** (4 cols) — 4 buckets by review category (Harika/Olumlu/Karışık/Olumsuz), donut shows **count of games** in each bucket, not raw review percentage — legend beside it.
6. **Release-year timeline** (8 cols) — bar per year, peak year highlighted in Amber.
7. **Feature/playstyle spider chart** (4 cols) — axes: Multiplayer, Co-op, Achievements, Cloud Save, Controller Support, Singleplayer.
8. **Achievement scorecard** (4 cols) — big mono % (avg completion) + "rarest unlocked" mini list with global-rarity badges.
9. **Niche/mainstream gauge** (4 cols) — half-circle gauge, needle position from SteamSpy-estimated owner count; footnote clarifying it's estimated.
10. **Last-2-weeks tempo** (12 cols, full width) — since Steam has no per-day granularity, this is a small bar-list of top games played in the last 2 weeks with hours (not a fabricated daily heatmap).
11. **Favorite studios** (12 cols, full width) — top 5 developers/publishers by game count + hours.

Below the grid: full-width **Genre Breakdown detail list** (raw data behind panel #1 — horizontal bar + % per genre, mini cover thumbnails of top games in that genre). Final CTA button "Bu Profile Göre Öner" → navigates to the App/Recommendations screen.

Every panel has the corner-bracket decoration + a small mono "PANEL LABEL" caption (e.g. `PUAN TERCİHİN`).

### 4. App — Filters + Recommendations (`App.dc.html`)
**Purpose**: The main working screen — multi-dimensional filtering, results, comparison, and (in AI mode) a conversational refinement bar.

**Layout regions**:
- **Context strip** (thin, full width): breadcrumb `OYUN DNA'N → ÖNERİLER` (links back to Profile), 2–3 pinned chips showing the dominant profile genres (also link to Profile so the user never loses context of what they're being recommended against), and a "Profili Yeniden Tara" (re-scan) icon-button linking to Sync.
- **Left filter panel** (~360px fixed, becomes a bottom drawer on mobile), sticky, grouped:
  1. **Budget** — dual-ended price slider with live mono readout, "sadece indirimde olanlar" checkbox, "ücretsiz oyunları da göster" checkbox.
  2. **Genre & Tags** — two-tab sub-group (different real data sources, kept visually distinct): Tab A = official Genres (chip grid with facet counts in parentheses); Tab B = community Tags (search input + scrollable chip list, also with facet counts). Facet counts must update live as other filters change — even before pressing the submit button.
  3. **Score & community sentiment** — Metacritic min-score slider; **separate** segmented control for Steam's own review-sentiment tiers (`Fark Etmez / En Az Olumlu / En Az Çok Olumlu / Sadece Muhteşem`) — call out in code comments that this is independent of Metacritic.
  4. **Platform & playstyle** — Windows/Mac/Linux toggle buttons; playstyle chips (Singleplayer, Multiplayer, Co-op, Controller Support, Has Achievements, Cloud Save).
  5. **Time** — release-year range with quick presets (Son 1 Yıl / Son 5 Yıl / Tüm Zamanlar).
  6. **Mode selector** (signature interaction, visually framed as its own "command" region at the panel's bottom) — segmented toggle Algorithmic (Cyan) / AI-Assisted (Violet); switching it re-themes the whole screen's accent color and swaps the description copy beneath it. A live mono facet counter ("Bu filtrelerle tahmini N sonuç") updates as filters change, even before the ÖNER button is pressed.
  Panel header also has "Sıfırla" (reset) and "Kaydet" (save this combination) links; previously saved filter combos appear as small chips above the groups.
- **Results area**:
  - **Toolbar**: result count + active mode (mono), sort `<select>` (Relevance/Score/Price↑/Price↓/Release date/Discount %), Grid/List view toggle, Compare-mode toggle.
  - **Result cards**: cover placeholder (gradient + wordmark, never a real Steam asset), discount badge top-left if on sale, developer name under the title, genre chip (cyan-toned border) **and** tag chip (neutral gray border) shown side by side to visually distinguish the two data sources, small platform/co-op/controller icon row, price (strikethrough original + new price if discounted) + Metacritic badge (amber) + review-sentiment badge (outlined) on the bottom row. In AI mode, an extra violet-bordered "GEREKÇE" (rationale) block appears under the card with 1–2 sentences + 2–3 mono factor tags (e.g. TÜR EŞLEŞMESİ / FİYAT UYUMU / PUAN). Each card has a save/pin icon (top-right) and a checkbox (top-left, only meaningfully used in Compare mode) plus a "Hızlı Bakış" (Quick View) link that appears on hover/at the card's bottom.
  - **Compare mode**: selecting up to 3 cards' checkboxes shows a fixed bottom bar ("N/3 oyun seçildi" + Karşılaştır button); clicking it opens a modal with a 3-column table comparing price, score, genre, release year, platform support — best value per row highlighted in the active accent color.
  - **Quick View drawer**: right-side sliding panel (not a page navigation) — big cover, short description, a horizontal screenshot strip (placeholders), a "Bu neden önerildi" section (full AI rationale in AI mode; a numeric "profilinin %X'i bu türe ait" explanation in Algorithmic mode), and Steam-link + Save buttons.
  - **AI dialog bar** (only visible in AI mode): fixed bottom bar, violet-bordered, with clickable example-message chips (`Biraz daha kısa oyunlar olsun`, `Daha bağımsız/indie ağırlıklı olsun`, `Arkadaşlarımla oynayabileceğim olsun`) plus a free-text input + send button. Submitting shows a transparent mono "FİLTRE GÜNCELLENDİ: ..." note above the results grid describing exactly what changed — never a silent black-box change.

### 5. Empty / Error States (`Empty.dc.html`)
Two states, toggled via a dev-only tab switcher in the header for demo purposes (in production these are triggered by real conditions, not a manual toggle):
- **Private profile**: centered panel, Critical Red accents, headline "Steam profilin şu an kapalı.", explanation, a 3-step numbered mini visual guide, and a "Ayarları Güncelledim, Tekrar Dene" retry button.
- **No results**: filter panel stays visible/open; right side shows a "no signal" version of the orbit chart (rings only, no data points), headline "Bu aralıkta sinyal yok.", explanation, and a "Filtreleri Sıfırla" button.

## Interactions & Behavior Summary
- Mode toggle (Algorithmic/AI) is global-feeling but scoped per-screen; it swaps the accent color (cyan↔violet) and copy everywhere it appears on that screen. Persist the selected mode across the Profile → App navigation if possible (state or query param).
- All range sliders should emit live-updating mono numeric readouts on every input event, not just on release.
- Facet/result counts recompute reactively as filters change (mock with static/derived numbers is fine for a prototype; wire to a real endpoint in the actual implementation).
- The AI dialog bar's "filter updated" note should be transient/informational, not a toast — it stays inline above the results until the next change.
- Reduced motion: freeze all sweeping/rotating animations to their resting frame when `prefers-reduced-motion: reduce` is set.

## State Management (suggested Angular shape)
- `ModeService` (or a signal shared via a small store) — `mode: 'algo' | 'ai'`, exposes the derived accent color.
- Per-screen filter state: price range, discount-only, show-free, active genres/tags (Sets or Records), min score, review segment, active platforms/playstyles, year preset — all as Angular signals or a reactive form group.
- `compareSelected: Set<gameId>` (max 3) — derive the compare bar visibility and compare table rows from it.
- `quickViewGame: Game | null` — drives the drawer.
- `savedFilterPresets: {name, filters}[]`.

## Assets
No external images are used — all "cover art" is CSS gradient + typography placeholders (by design, to avoid using real Steam branding/screenshots). All icons are hand-drawn inline SVG (simple lines/circles/paths), not an icon font — recreate with your icon system of choice (Angular Material icons, custom SVGs, etc.) matching the same simple geometric style.

## Files in this bundle
- `Landing.dc.html` — landing page
- `Sync.dc.html` — scanning/loading screen
- `Profile.dc.html` — Oyun DNA'sı dashboard
- `App.dc.html` — filter + recommendations screen
- `Empty.dc.html` — private-profile and no-results states

Open any file directly in a browser to see it live; view source for the exact markup, inline styles, and mock data shapes referenced above.
