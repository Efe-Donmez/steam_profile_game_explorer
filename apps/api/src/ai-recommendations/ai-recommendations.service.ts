import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Model, Types } from 'mongoose';
import { AiClientService } from './ai-client.service';
import { AiRefinementTurn, AiRefinementTurnDocument } from './schemas/ai-refinement-turn.schema';
import { RankedGame } from '../recommendations/recommendations.service';
import { RecommendationFiltersDto } from '../recommendations/dto/recommendation-filters.dto';

const ALLOWED_FILTER_KEYS = Object.keys(new RecommendationFiltersDto()) as (keyof RecommendationFiltersDto)[];

export interface ProfileSummaryInput {
  genreWeights: Record<string, number>;
  featureCoverage: { singleplayer: number; multiplayer: number };
  avgPricePaid: number;
  currency?: string;
  avgMetacriticPreference: number;
  avgAchievementCompletion: number;
}

interface RerankEntry {
  appid: number;
  rank: number;
  reasoning: string;
  reasoningFactors: string[];
}

interface RefineResponse {
  delta: Partial<RecommendationFiltersDto>;
  description: string;
}

const RERANK_SYSTEM_PROMPT = `Sen SteamCompass için bir oyun öneri asistanısın. Sana kullanıcının Steam kütüphanesinden çıkarılan bir zevk profili özeti ve algoritmik olarak seçilmiş bir aday oyun listesi verilecek.
Görevin: adayları kullanıcının profiline en uygun olacak şekilde yeniden sırala, her biri için 1-2 cümlelik kısa bir gerekçe ve 2-3 kısa mono etiket üret (örnek etiketler: "TÜR EŞLEŞMESİ", "FİYAT UYUMU", "PUAN", "OYNAMA TARZI").
SADECE şu formatta geçerli bir JSON dizisi döndür, başka hiçbir açıklama ekleme:
[{"appid": number, "rank": number, "reasoning": string, "reasoningFactors": string[]}]`;

const REFINE_SYSTEM_PROMPT = `Sen SteamCompass için bir filtre asistanısın. Kullanıcı doğal dilde bir istek yazacak; bunu mevcut filtrelere uygulanacak somut bir JSON delta'sına çevirmen gerekiyor.
Kullanılabilir filtre alanları: priceMin, priceMax, onlyDiscounted, includeFree, genres (string[]), tags (string[]), minMetacritic, reviewSentiment ("any"|"positive"|"very_positive"|"overwhelming"), platforms (string[], "windows"|"mac"|"linux"), playstyle (string[], "singleplayer"|"multiplayer"|"coop"|"controller"|"achievements"|"cloudSave"), releaseYearMin, releaseYearMax.
SADECE şu formatta geçerli bir JSON nesnesi döndür, başka hiçbir açıklama ekleme:
{"delta": { ...değişecek alanlar... }, "description": "kısa, büyük harfli, Türkçe bir açıklama (örn. SÜRE FİLTRESİ EKLENDİ)"}`;

@Injectable()
export class AiRecommendationsService {
  constructor(
    private readonly aiClient: AiClientService,
    @InjectModel(AiRefinementTurn.name) private readonly refinementModel: Model<AiRefinementTurnDocument>,
  ) {}

  buildProfileSummary(profile: ProfileSummaryInput | null): string {
    if (!profile) {
      return 'Kullanıcının henüz yeterli veri içeren bir profili yok.';
    }

    const topGenres = Object.entries(profile.genreWeights ?? {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);

    const playstyle =
      profile.featureCoverage.singleplayer >= profile.featureCoverage.multiplayer
        ? 'genelde tek başına oynuyor'
        : 'genelde çok oyunculu/sosyal oynuyor';

    return (
      `En çok ${topGenres.join(', ') || 'çeşitli türlerde'} oynuyor, ` +
      `ortalama ${Math.round(profile.avgPricePaid / 100)} ${profile.currency ?? 'USD'} civarı oyun alıyor, ` +
      `${profile.avgMetacriticPreference}+ puanlı oyunları tercih ediyor, ${playstyle}. ` +
      `Ortalama başarım tamamlama oranı %${profile.avgAchievementCompletion}.`
    );
  }

  async rerank(candidates: RankedGame[], profileSummary: string): Promise<RankedGame[]> {
    const topN = candidates.slice(0, 20);
    const candidateSummaries = topN.map((c) => ({
      appid: c.appid,
      name: c.name,
      genres: c.genres,
      tags: c.tags,
      priceCents: c.priceCents,
      metacriticScore: c.metacriticScore,
      discountPercent: c.discountPercent,
    }));

    const userPrompt = `Kullanıcı profili özeti: ${profileSummary}\n\nAday oyunlar: ${JSON.stringify(candidateSummaries)}`;
    const reranked = await this.aiClient.askForJson<RerankEntry[]>(RERANK_SYSTEM_PROMPT, userPrompt);

    if (!reranked || !Array.isArray(reranked)) {
      // Falls back to the untouched Tier-1 (algorithmic) ordering.
      return candidates;
    }

    const byAppid = new Map(topN.map((c) => [c.appid, c]));
    const seenAppids = new Set<number>();
    const rerankedGames = reranked
      .filter((r) => byAppid.has(r.appid) && !seenAppids.has(r.appid) && seenAppids.add(r.appid))
      .map((r) => ({
        ...byAppid.get(r.appid)!,
        reasoning: r.reasoning,
        reasoningFactors: r.reasoningFactors,
      }));

    const remaining = candidates.filter((c) => !seenAppids.has(c.appid));
    return [...rerankedGames, ...remaining];
  }

  async refine(
    requestId: string,
    currentFilters: RecommendationFiltersDto,
    userMessage: string,
  ): Promise<{ filters: RecommendationFiltersDto; description: string }> {
    const userPrompt = `Mevcut filtreler: ${JSON.stringify(currentFilters)}\nKullanıcı isteği: "${userMessage}"`;
    const response = await this.aiClient.askForJson<RefineResponse>(REFINE_SYSTEM_PROMPT, userPrompt);

    const rawDelta = response?.delta ?? {};
    const description = response?.description ?? `FİLTRE GÜNCELLENDİ: "${userMessage}"`;

    // The delta is free-text-derived JSON from Claude, not user input passed
    // through Nest's ValidationPipe — whitelist to known filter fields and
    // re-validate before it can reach a live Mongo query, so a malformed or
    // hallucinated field (wrong type, unknown key) can't produce an invalid
    // filter or a query-cast error downstream.
    const sanitizedDelta: Partial<Record<keyof RecommendationFiltersDto, unknown>> = {};
    for (const key of ALLOWED_FILTER_KEYS) {
      if (rawDelta[key] !== undefined) {
        sanitizedDelta[key] = rawDelta[key];
      }
    }

    const candidate = plainToInstance(RecommendationFiltersDto, { ...currentFilters, ...sanitizedDelta });
    const errors = await validate(candidate);
    const mergedFilters = errors.length === 0 ? candidate : currentFilters;

    if (mergedFilters.priceMin > mergedFilters.priceMax) {
      [mergedFilters.priceMin, mergedFilters.priceMax] = [mergedFilters.priceMax, mergedFilters.priceMin];
    }
    if (mergedFilters.releaseYearMin > mergedFilters.releaseYearMax) {
      [mergedFilters.releaseYearMin, mergedFilters.releaseYearMax] = [
        mergedFilters.releaseYearMax,
        mergedFilters.releaseYearMin,
      ];
    }

    await this.refinementModel.create({
      requestId: new Types.ObjectId(requestId),
      userMessage,
      appliedFilterDelta: sanitizedDelta,
    });

    return { filters: mergedFilters, description };
  }
}
