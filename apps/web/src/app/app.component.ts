import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GameDetailComponent } from './features/game-detail/game-detail.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, GameDetailComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'web';
}
