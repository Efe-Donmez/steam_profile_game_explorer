export type FeatureKey = 'multiplayer' | 'coop' | 'controller' | 'cloudSave' | 'achievements' | 'singleplayer';

export const CATEGORY_FEATURE_MATCHERS: { key: FeatureKey; test: RegExp }[] = [
  { key: 'multiplayer', test: /multi-player|multiplayer/i },
  { key: 'coop', test: /co-op/i },
  { key: 'controller', test: /controller support/i },
  { key: 'cloudSave', test: /steam cloud/i },
  { key: 'achievements', test: /steam achievements/i },
  { key: 'singleplayer', test: /single-player|singleplayer/i },
];

export function emptyFeatureCounts(): Record<FeatureKey, number> {
  return { multiplayer: 0, coop: 0, controller: 0, cloudSave: 0, achievements: 0, singleplayer: 0 };
}
