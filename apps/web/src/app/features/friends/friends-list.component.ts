import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Friend, FriendsService } from '../../core/services/friends.service';
import { SceneBackgroundComponent } from '../../shared/components/scene-background/scene-background.component';

@Component({
  selector: 'app-friends-list',
  standalone: true,
  imports: [RouterLink, SceneBackgroundComponent],
  templateUrl: './friends-list.component.html',
})
export class FriendsListComponent implements OnInit {
  readonly loading = signal(true);
  readonly friends = signal<Friend[]>([]);

  constructor(private readonly friendsService: FriendsService) {}

  async ngOnInit(): Promise<void> {
    try {
      this.friends.set(await this.friendsService.getFriends());
    } finally {
      this.loading.set(false);
    }
  }

  get joinedFriends(): Friend[] {
    return this.friends().filter((f) => f.isSteamCompassUser);
  }

  get otherFriends(): Friend[] {
    return this.friends().filter((f) => !f.isSteamCompassUser);
  }

  formatHours(minutes: number | undefined): string {
    return Math.round((minutes ?? 0) / 60).toLocaleString('tr-TR');
  }

  personaStateLabel(friend: Friend): string {
    if (friend.currentGameName) return `${friend.currentGameName} oynuyor`;
    return friend.personaState > 0 ? 'Çevrimiçi' : 'Çevrimdışı';
  }
}
