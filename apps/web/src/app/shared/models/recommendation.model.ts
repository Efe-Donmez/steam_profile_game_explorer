export type ReviewSentiment = 'any' | 'positive' | 'very_positive' | 'overwhelming';
export type Playstyle = 'singleplayer' | 'multiplayer' | 'coop' | 'controller' | 'achievements' | 'cloudSave';
export type Platform = 'windows' | 'mac' | 'linux';
export type RecommendationSort = 'relevance' | 'score' | 'price_asc' | 'price_desc' | 'release_date' | 'discount';

export interface RecommendationFilters {
  priceMin: number;
  priceMax: number;
  onlyDiscounted: boolean;
  includeFree: boolean;
  genres: string[];
  tags: string[];
  minMetacritic: number;
  reviewSentiment: ReviewSentiment;
  platforms: Platform[];
  playstyle: Playstyle[];
  releaseYearMin: number;
  releaseYearMax: number;
  search: string;
}

export function defaultFilters(): RecommendationFilters {
  return {
    priceMin: 0,
    priceMax: 50000,
    onlyDiscounted: false,
    includeFree: true,
    genres: [],
    tags: [],
    minMetacritic: 0,
    reviewSentiment: 'any',
    platforms: [],
    playstyle: [],
    releaseYearMin: 1990,
    releaseYearMax: new Date().getFullYear(),
    search: '',
  };
}

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

export interface RecommendationResponse {
  total: number;
  items: RankedGame[];
  requestId: string;
}

export interface FacetOption {
  name: string;
  count: number;
}

export interface FacetsResponse {
  genres: FacetOption[];
  tags: FacetOption[];
  total: number;
}
