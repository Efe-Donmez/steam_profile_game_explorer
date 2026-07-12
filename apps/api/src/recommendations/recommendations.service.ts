import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

type GameMatchStage = Record<string, unknown>;
import { Game, GameDocument } from '../catalog/schemas/game.schema';
import { GameReview, GameReviewDocument } from '../reviews/schemas/game-review.schema';
import { SteamLibrary, SteamLibraryDocument } from '../steam/schemas/steam-library.schema';
import { UserProfile, UserProfileDocument } from '../profile/schemas/user-profile.schema';
import {
  RecommendationRequest,
  RecommendationRequestDocument,
} from './schemas/recommendation-request.schema';
import { RecommendationResult, RecommendationResultDocument } from './schemas/recommendation-result.schema';
import { CATEGORY_FEATURE_MATCHERS } from '../catalog/category-feature.util';
import { RecommendationFiltersDto } from './dto/recommendation-filters.dto';
import { RecommendationMode, RecommendationSort } from './dto/create-recommendation-request.dto';
import { AiRecommendationsService, ProfileSummaryInput } from '../ai-recommendations/ai-recommendations.service';

const REVIEW_SENTIMENT_MIN_POSITIVE_PERCENT: Record<string, number> = {
  any: 0,
  positive: 50,
  very_positive: 70,
  overwhelming: 90,
};

export interface RankedGame {
  appid: number;
  name: string;
  genres: string[];
  tags: string[];
  categories: string[];
  priceCents: number;
  currency?: string;
  discountPercent: number;
  isFree: boolean;
  metacriticScore?: number;
  releaseYear?: number;
  platforms: { windows: boolean; mac: boolean; linux: boolean };
  headerImage?: string;
  shortDescription?: string;
  developers: string[];
  reviewScoreDesc?: string;
  reviewPositivePercent?: number;
  score: number;
  reasoning?: string;
  reasoningFactors?: string[];
}

export interface FacetOption {
  name: string;
  count: number;
}

@Injectable()
export class RecommendationsService {
  constructor(
    @InjectModel(Game.name) private readonly gameModel: Model<GameDocument>,
    @InjectModel(GameReview.name) private readonly reviewModel: Model<GameReviewDocument>,
    @InjectModel(SteamLibrary.name) private readonly libraryModel: Model<SteamLibraryDocument>,
    @InjectModel(UserProfile.name) private readonly profileModel: Model<UserProfileDocument>,
    @InjectModel(RecommendationRequest.name)
    private readonly requestModel: Model<RecommendationRequestDocument>,
    @InjectModel(RecommendationResult.name)
    private readonly resultModel: Model<RecommendationResultDocument>,
    private readonly aiRecommendationsService: AiRecommendationsService,
  ) {}

  findRequestById(requestId: string, userId: string): Promise<RecommendationRequestDocument | null> {
    return this.requestModel.findOne({ _id: requestId, userId: new Types.ObjectId(userId) }).exec();
  }

  async refineFilters(
    requestId: string,
    userId: string,
    message: string,
  ): Promise<{ filters: RecommendationFiltersDto; description: string }> {
    const original = await this.requestModel
      .findOne({ _id: requestId, userId: new Types.ObjectId(userId) })
      .lean()
      .exec();
    const currentFilters = (original?.filters ?? new RecommendationFiltersDto()) as RecommendationFiltersDto;
    return this.aiRecommendationsService.refine(requestId, currentFilters, message);
  }

  private async ownedAppids(userId: string): Promise<number[]> {
    const library = await this.libraryModel
      .find({ userId: new Types.ObjectId(userId) }, { appid: 1 })
      .lean()
      .exec();
    return library.map((l) => l.appid);
  }

  /** Escapes regex metacharacters so the free-text name search can't break the query or be used for ReDoS. */
  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Appids whose Steam review positivity meets `minPositivePercent`, or
   * `null` when the sentiment filter is off (`any`). Previously this
   * threshold was applied only in-memory, after `buildMatchStage()` — so
   * `getFacets()` ignored it entirely (wrong "tahmini X sonuç" counts) and
   * `recommend()`'s `matchTotal`/pagination disagreed with the actually
   * filtered result set. Resolving it to a concrete appid list up front lets
   * it be folded into the same Mongo match stage as every other filter.
   */
  private async passingReviewSentimentAppids(minPositivePercent: number): Promise<number[] | null> {
    if (minPositivePercent <= 0) return null;
    const reviews = await this.reviewModel
      .find({}, { appid: 1, totalPositive: 1, totalNegative: 1 })
      .lean()
      .exec();
    return reviews
      .filter((r) => {
        const total = r.totalPositive + r.totalNegative;
        return total > 0 && (r.totalPositive / total) * 100 >= minPositivePercent;
      })
      .map((r) => r.appid);
  }

  /**
   * Builds the base Mongo match stage shared by the results query and every
   * facet count, excluding the `dimension` given (so its own facet counts
   * reflect "what if I also picked this option" rather than shrinking to the
   * currently-selected subset).
   */
  private buildMatchStage(
    filters: RecommendationFiltersDto,
    ownedAppids: number[],
    excludeDimension?: 'genres' | 'tags',
    sentimentAppids?: number[] | null,
  ): GameMatchStage {
    const match: GameMatchStage = {
      appid: sentimentAppids ? { $nin: ownedAppids, $in: sentimentAppids } : { $nin: ownedAppids },
      priceCents: { $gte: filters.priceMin, $lte: filters.priceMax },
    };

    if (!filters.includeFree) {
      match.isFree = false;
    }
    if (filters.onlyDiscounted) {
      match.discountPercent = { $gt: 0 };
    }
    if (filters.minMetacritic > 0) {
      match.metacriticScore = { $gte: filters.minMetacritic };
    }
    if (filters.search) {
      match.name = { $regex: this.escapeRegExp(filters.search), $options: 'i' };
    }
    if (filters.genres.length > 0 && excludeDimension !== 'genres') {
      match.genres = { $in: filters.genres };
    }
    if (filters.tags.length > 0 && excludeDimension !== 'tags') {
      match.tags = { $in: filters.tags };
    }
    if (filters.platforms.length > 0) {
      // OR semantics: a game qualifies if it supports any selected platform.
      match.$or = filters.platforms.map((p) => ({ [`platforms.${p}`]: true }));
    }
    const andClauses: GameMatchStage[] = [];
    if (filters.playstyle.length > 0) {
      // AND semantics: a game must satisfy every selected playstyle facet.
      andClauses.push(
        ...filters.playstyle.map((key) => {
          const matcher = CATEGORY_FEATURE_MATCHERS.find((m) => m.key === key);
          return { categories: { $elemMatch: { $regex: matcher!.test } } };
        }),
      );
    }
    if (filters.releaseYearMin !== undefined || filters.releaseYearMax !== undefined) {
      // Games whose Steam release-date string didn't parse to a year have no
      // `releaseYear` field at all; since range operators never match a
      // missing field, without this `$or` they'd be silently excluded from
      // every recommendation regardless of the selected year range.
      andClauses.push({
        $or: [
          { releaseYear: { $exists: false } },
          { releaseYear: { $gte: filters.releaseYearMin, $lte: filters.releaseYearMax } },
        ],
      });
    }
    if (andClauses.length > 0) {
      match.$and = andClauses;
    }

    return match;
  }

  async getFacets(
    userId: string,
    filters: RecommendationFiltersDto,
  ): Promise<{ genres: FacetOption[]; tags: FacetOption[]; total: number }> {
    const owned = await this.ownedAppids(userId);
    return this.getFacetsForOwned(owned, filters);
  }

  /** Same facet counts as `getFacets`, but for an already-resolved owned-appids list (used for guest friends). */
  async getFacetsForOwned(
    owned: number[],
    filters: RecommendationFiltersDto,
  ): Promise<{ genres: FacetOption[]; tags: FacetOption[]; total: number }> {
    const minPositivePercent = REVIEW_SENTIMENT_MIN_POSITIVE_PERCENT[filters.reviewSentiment] ?? 0;
    const sentimentAppids = await this.passingReviewSentimentAppids(minPositivePercent);

    const [genreFacets, tagFacets, total] = await Promise.all([
      this.gameModel.aggregate([
        { $match: this.buildMatchStage(filters, owned, 'genres', sentimentAppids) },
        { $unwind: '$genres' },
        { $group: { _id: '$genres', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      this.gameModel.aggregate([
        { $match: this.buildMatchStage(filters, owned, 'tags', sentimentAppids) },
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      this.gameModel.countDocuments(this.buildMatchStage(filters, owned, undefined, sentimentAppids)),
    ]);

    return {
      genres: genreFacets.map((f) => ({ name: f._id, count: f.count })),
      tags: tagFacets.map((f) => ({ name: f._id, count: f.count })),
      total,
    };
  }

  private cosineScore(
    game: Pick<GameDocument, 'genres' | 'tags'>,
    genreWeights: Record<string, number>,
    tagWeights: Record<string, number>,
    userVectorMagnitude: number,
  ): number {
    if (userVectorMagnitude === 0) return 0;
    const matchedGenres = (game.genres ?? []).map((g) => genreWeights[g] ?? 0);
    const matchedTags = (game.tags ?? []).map((t) => tagWeights[t] ?? 0);
    const dot = [...matchedGenres, ...matchedTags].reduce((sum, w) => sum + w, 0);
    const gameMagnitude = Math.sqrt((game.genres?.length ?? 0) + (game.tags?.length ?? 0));
    if (gameMagnitude === 0) return 0;
    return dot / (userVectorMagnitude * gameMagnitude);
  }

  private buildDbSortStage(sort: RecommendationSort): Record<string, 1 | -1> | null {
    switch (sort) {
      case 'score':
        return { metacriticScore: -1 };
      case 'price_asc':
        return { priceCents: 1 };
      case 'price_desc':
        return { priceCents: -1 };
      case 'release_date':
        return { releaseYear: -1 };
      case 'discount':
        return { discountPercent: -1 };
      default:
        // 'relevance' depends on the cosine score computed in-memory below
        // (and, in AI mode, on Claude's re-ranking), so it can't be pushed
        // down to Mongo.
        return null;
    }
  }

  private applySorting(games: RankedGame[], sort: RecommendationSort): RankedGame[] {
    const sorted = [...games];
    switch (sort) {
      case 'score':
        return sorted.sort((a, b) => (b.metacriticScore ?? 0) - (a.metacriticScore ?? 0));
      case 'price_asc':
        return sorted.sort((a, b) => a.priceCents - b.priceCents);
      case 'price_desc':
        return sorted.sort((a, b) => b.priceCents - a.priceCents);
      case 'release_date':
        return sorted.sort((a, b) => (b.releaseYear ?? 0) - (a.releaseYear ?? 0));
      case 'discount':
        return sorted.sort((a, b) => b.discountPercent - a.discountPercent);
      case 'relevance':
      default:
        return sorted.sort(
          (a, b) =>
            b.score - a.score ||
            (b.metacriticScore ?? 0) - (a.metacriticScore ?? 0) ||
            (b.reviewPositivePercent ?? 0) - (a.reviewPositivePercent ?? 0),
        );
    }
  }

  /**
   * Builds the ranked candidate list for `profileOwnerUserId`'s DNA/library —
   * shared by both the self-view (`recommend`) and the friend-view
   * (`recommendForFriend`) entry points, which differ only in whose
   * `recommendationRequests` history the result gets persisted under.
   */
  private async rankCandidates(
    profileOwnerUserId: string,
    filters: RecommendationFiltersDto,
    mode: RecommendationMode,
    sort: RecommendationSort,
    page: number,
    limit: number,
  ): Promise<{ total: number; items: RankedGame[] }> {
    const [owned, profile] = await Promise.all([
      this.ownedAppids(profileOwnerUserId),
      this.profileModel.findOne({ userId: new Types.ObjectId(profileOwnerUserId) }).lean().exec(),
    ]);
    return this.rankCandidatesCore(
      owned,
      profile as unknown as Record<string, unknown> | null,
      filters,
      mode,
      sort,
      page,
      limit,
    );
  }

  /**
   * Same ranking core, but for a guest friend (never logged into
   * SteamCompass): `ownedAppids` and `profile` come from an on-the-fly
   * `ProfileService.buildGuestProfileData()` snapshot instead of the
   * `steamLibraries`/`userProfiles` collections.
   */
  async rankCandidatesForGuest(
    ownedAppids: number[],
    guestProfile: Record<string, unknown>,
    filters: RecommendationFiltersDto,
    mode: RecommendationMode,
    sort: RecommendationSort,
    page: number,
    limit: number,
  ): Promise<{ total: number; items: RankedGame[] }> {
    return this.rankCandidatesCore(ownedAppids, guestProfile, filters, mode, sort, page, limit);
  }

  private async rankCandidatesCore(
    owned: number[],
    profile: Record<string, unknown> | null,
    filters: RecommendationFiltersDto,
    mode: RecommendationMode,
    sort: RecommendationSort,
    page: number,
    limit: number,
  ): Promise<{ total: number; items: RankedGame[] }> {
    const minPositivePercent = REVIEW_SENTIMENT_MIN_POSITIVE_PERCENT[filters.reviewSentiment] ?? 0;
    const sentimentAppids = await this.passingReviewSentimentAppids(minPositivePercent);
    const match = this.buildMatchStage(filters, owned, undefined, sentimentAppids);

    // Previously capped at an *unsorted* 500 docs, so field-based sorts
    // (price/discount/release/score) only ordered whatever arbitrary subset
    // Mongo happened to return first — the true cheapest/newest/etc. game
    // could be excluded from every page. Push the sort into the query itself
    // when it maps to a real field, so the capped slice is deterministically
    // correct; 'relevance'/AI mode still need the full pool for in-memory
    // cosine scoring, so they keep a generous (not arbitrary-first) cap.
    const dbSort = this.buildDbSortStage(sort);
    let candidateQuery = this.gameModel.find(match);
    if (dbSort) {
      candidateQuery = candidateQuery.sort(dbSort);
    }
    const CANDIDATE_POOL_LIMIT = dbSort ? Math.max(500, page * limit) : 3000;

    const [candidates, matchTotal] = await Promise.all([
      candidateQuery.limit(CANDIDATE_POOL_LIMIT).lean().exec(),
      // Kept consistent with getFacets()'s unbounded count so the toolbar
      // "X SONUÇ" figure never disagrees with the facet panel for the same
      // filters (the old `sorted.length` reflected only the capped/filtered
      // in-memory slice, not the true match count).
      this.gameModel.countDocuments(match),
    ]);

    const reviews = await this.reviewModel
      .find({ appid: { $in: candidates.map((c) => c.appid) } })
      .lean()
      .exec();
    const reviewByAppid = new Map(reviews.map((r) => [r.appid, r]));

    const genreWeights = (profile?.genreWeights as Record<string, number> | undefined) ?? {};
    const tagWeights = (profile?.tagWeights as Record<string, number> | undefined) ?? {};
    const userVectorMagnitude = Math.sqrt(
      Object.values(genreWeights).reduce((sum, w) => sum + w * w, 0) +
        Object.values(tagWeights).reduce((sum, w) => sum + w * w, 0),
    );

    const ranked: RankedGame[] = candidates.map((game) => {
      const review = reviewByAppid.get(game.appid);
      const reviewPositivePercent =
        review && review.totalPositive + review.totalNegative > 0
          ? (review.totalPositive / (review.totalPositive + review.totalNegative)) * 100
          : undefined;

      return {
        appid: game.appid,
        name: game.name,
        genres: game.genres,
        tags: game.tags,
        categories: game.categories,
        priceCents: game.isFree ? 0 : (game.priceCents ?? 0),
        currency: game.currency,
        discountPercent: game.discountPercent,
        isFree: game.isFree,
        metacriticScore: game.metacriticScore,
        releaseYear: game.releaseYear,
        platforms: game.platforms,
        headerImage: game.headerImage,
        shortDescription: game.shortDescription,
        developers: game.developers,
        reviewScoreDesc: review?.reviewScoreDesc,
        reviewPositivePercent,
        score: this.cosineScore(game, genreWeights, tagWeights, userVectorMagnitude),
      };
    });

    let sorted = this.applySorting(ranked, sort);
    if (mode === 'ai_assisted') {
      // Tier 2: re-rank the algorithmic order with Claude's reasoning; on any
      // failure (missing key, timeout, malformed response) this returns the
      // Tier-1 order untouched, so the user never sees a broken result set.
      const profileSummary = this.aiRecommendationsService.buildProfileSummary(
        profile as unknown as ProfileSummaryInput | null,
      );
      sorted = await this.aiRecommendationsService.rerank(sorted, profileSummary);
    }

    const total = matchTotal;
    const items = sorted.slice((page - 1) * limit, (page - 1) * limit + limit);

    return { total, items };
  }

  /** Persists a ranked result set as a `recommendationRequests`/`recommendationResults` pair. */
  private async persistRequest(
    ownerUserId: string,
    filters: RecommendationFiltersDto,
    mode: RecommendationMode,
    page: number,
    limit: number,
    items: RankedGame[],
    subjectUserId?: string,
    subjectSteamId?: string,
  ): Promise<string> {
    const request = await this.requestModel.create({
      userId: new Types.ObjectId(ownerUserId),
      filters: filters as unknown as Record<string, unknown>,
      mode,
      ...(subjectUserId ? { subjectUserId: new Types.ObjectId(subjectUserId) } : {}),
      ...(subjectSteamId ? { subjectSteamId } : {}),
    });
    await this.resultModel.insertMany(
      items.map((item, i) => ({
        requestId: request._id,
        appid: item.appid,
        score: item.score,
        reasoning: item.reasoning,
        reasoningFactors: item.reasoningFactors ?? [],
        rank: (page - 1) * limit + i + 1,
      })),
    );
    return request._id.toString();
  }

  async recommend(
    userId: string,
    filters: RecommendationFiltersDto,
    mode: RecommendationMode,
    sort: RecommendationSort,
    page: number,
    limit: number,
  ): Promise<{ total: number; items: RankedGame[]; requestId: string }> {
    const { total, items } = await this.rankCandidates(userId, filters, mode, sort, page, limit);
    const requestId = await this.persistRequest(userId, filters, mode, page, limit, items);
    return { total, items, requestId };
  }

  /**
   * Same ranking as `recommend()`, but built from `friendUserId`'s DNA/library
   * and persisted under `viewerUserId` (tagged with `subjectUserId`) instead —
   * so browsing a friend's taste never touches the friend's own
   * `recommendationRequests` history.
   */
  async recommendForFriend(
    viewerUserId: string,
    friendUserId: string,
    filters: RecommendationFiltersDto,
    mode: RecommendationMode,
    sort: RecommendationSort,
    page: number,
    limit: number,
  ): Promise<{ total: number; items: RankedGame[]; requestId: string }> {
    const { total, items } = await this.rankCandidates(friendUserId, filters, mode, sort, page, limit);
    const requestId = await this.persistRequest(viewerUserId, filters, mode, page, limit, items, friendUserId);
    return { total, items, requestId };
  }

  /**
   * Same as `recommendForFriend`, but for a guest friend who never logged
   * into SteamCompass: `ownedAppids`/`guestProfile` come from an on-the-fly
   * snapshot (see `FriendsController`/`ProfileService.buildGuestProfileData`)
   * rather than a DB lookup by `userId`.
   */
  async recommendForGuest(
    viewerUserId: string,
    friendSteamId: string,
    ownedAppids: number[],
    guestProfile: Record<string, unknown>,
    filters: RecommendationFiltersDto,
    mode: RecommendationMode,
    sort: RecommendationSort,
    page: number,
    limit: number,
  ): Promise<{ total: number; items: RankedGame[]; requestId: string }> {
    const { total, items } = await this.rankCandidatesForGuest(
      ownedAppids,
      guestProfile,
      filters,
      mode,
      sort,
      page,
      limit,
    );
    const requestId = await this.persistRequest(viewerUserId, filters, mode, page, limit, items, undefined, friendSteamId);
    return { total, items, requestId };
  }
}
