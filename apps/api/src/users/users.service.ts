import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SteamOpenIdUserProfile } from 'passport-steam-openid';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  upsertFromSteamProfile(profile: SteamOpenIdUserProfile): Promise<UserDocument> {
    return this.userModel
      .findOneAndUpdate(
        { steamId: profile.steamid },
        {
          steamId: profile.steamid,
          personaName: profile.personaname,
          avatarUrl: profile.avatarfull,
          profileVisibility: profile.communityvisibilitystate,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();
  }

  findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  findBySteamId(steamId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ steamId }).exec();
  }

  findBySteamIds(steamIds: string[]): Promise<UserDocument[]> {
    return this.userModel.find({ steamId: { $in: steamIds } }).exec();
  }

  findAll(): Promise<UserDocument[]> {
    return this.userModel.find().exec();
  }

  setRefreshTokenHash(userId: string, hash: string | null): Promise<UserDocument | null> {
    return this.userModel.findByIdAndUpdate(userId, { jwtRefreshTokenHash: hash }).exec();
  }

  setSteamLevel(userId: string, steamLevel: number): Promise<UserDocument | null> {
    return this.userModel.findByIdAndUpdate(userId, { steamLevel }).exec();
  }
}
