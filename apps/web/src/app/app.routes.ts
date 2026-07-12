import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/landing/landing.component').then((m) => m.LandingComponent),
  },
  {
    path: 'sync',
    canActivate: [authGuard],
    loadComponent: () => import('./features/sync/sync.component').then((m) => m.SyncComponent),
  },
  {
    path: 'empty',
    loadComponent: () =>
      import('./features/empty-states/empty-states.component').then((m) => m.EmptyStatesComponent),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./features/profile/profile.component').then((m) => m.ProfileComponent),
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/recommendations/recommendations.component').then((m) => m.RecommendationsComponent),
  },
  {
    path: 'friends',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/friends/friends-list.component').then((m) => m.FriendsListComponent),
  },
  {
    path: 'friends/guest/:steamId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/friends/friend-detail.component').then((m) => m.FriendDetailComponent),
  },
  {
    path: 'friends/:friendUserId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/friends/friend-detail.component').then((m) => m.FriendDetailComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
