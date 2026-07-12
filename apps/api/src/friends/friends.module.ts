import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FriendListCache, FriendListCacheSchema } from './schemas/friend-list-cache.schema';
import { GuestLibraryCache, GuestLibraryCacheSchema } from './schemas/guest-library-cache.schema';
import { UserProfile, UserProfileSchema } from '../profile/schemas/user-profile.schema';
import { SteamApiModule } from '../steam-api/steam-api.module';
import { UsersModule } from '../users/users.module';
import { ProfileModule } from '../profile/profile.module';
import { RecommendationsModule } from '../recommendations/recommendations.module';
import { CatalogModule } from '../catalog/catalog.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { StoreSyncModule } from '../store-sync/store-sync.module';
import { FriendsService } from './friends.service';
import { FriendsController } from './friends.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FriendListCache.name, schema: FriendListCacheSchema },
      { name: GuestLibraryCache.name, schema: GuestLibraryCacheSchema },
      { name: UserProfile.name, schema: UserProfileSchema },
    ]),
    SteamApiModule,
    UsersModule,
    ProfileModule,
    RecommendationsModule,
    CatalogModule,
    ReviewsModule,
    StoreSyncModule,
  ],
  controllers: [FriendsController],
  providers: [FriendsService],
})
export class FriendsModule {}
