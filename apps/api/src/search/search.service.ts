import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Game, GameDocument } from '../catalog/schemas/game.schema';
import { SteamLibrary, SteamLibraryDocument } from '../steam/schemas/steam-library.schema';

export interface SearchResult {
  appid: number;
  name: string;
  headerImage?: string;
  capsuleImage?: string;
  owned: boolean;
}

const RESULT_LIMIT = 10;

@Injectable()
export class SearchService {
  constructor(
    @InjectModel(Game.name) private readonly gameModel: Model<GameDocument>,
    @InjectModel(SteamLibrary.name) private readonly libraryModel: Model<SteamLibraryDocument>,
  ) {}

  /** Escapes regex metacharacters so a raw search string can't break the query or be used for ReDoS. */
  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async search(userId: string, query: string): Promise<SearchResult[]> {
    const q = query.trim();
    if (!q) return [];

    const [games, ownedAppids] = await Promise.all([
      this.gameModel
        .find({ name: { $regex: this.escapeRegExp(q), $options: 'i' } })
        .limit(RESULT_LIMIT * 3)
        .lean()
        .exec(),
      this.libraryModel
        .find({ userId: new Types.ObjectId(userId) }, { appid: 1 })
        .lean()
        .exec(),
    ]);

    const ownedSet = new Set(ownedAppids.map((l) => l.appid));

    return games
      .map((g) => ({
        appid: g.appid,
        name: g.name,
        headerImage: g.headerImage,
        capsuleImage: g.capsuleImage,
        owned: ownedSet.has(g.appid),
      }))
      .sort((a, b) => Number(b.owned) - Number(a.owned))
      .slice(0, RESULT_LIMIT);
  }
}
