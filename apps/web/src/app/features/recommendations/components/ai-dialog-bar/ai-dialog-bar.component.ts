import { Component, EventEmitter, Output, signal } from '@angular/core';

const SUGGESTIONS = [
  'Biraz daha kısa oyunlar olsun',
  'Daha bağımsız/indie ağırlıklı olsun',
  'Arkadaşlarımla oynayabileceğim olsun',
];

@Component({
  selector: 'app-ai-dialog-bar',
  standalone: true,
  templateUrl: './ai-dialog-bar.component.html',
})
export class AiDialogBarComponent {
  @Output() submitMessage = new EventEmitter<string>();

  readonly suggestions = SUGGESTIONS;
  readonly input = signal('');

  useSuggestion(text: string): void {
    this.submitMessage.emit(text);
  }

  submit(): void {
    const value = this.input().trim();
    if (!value) return;
    this.submitMessage.emit(value);
    this.input.set('');
  }
}
