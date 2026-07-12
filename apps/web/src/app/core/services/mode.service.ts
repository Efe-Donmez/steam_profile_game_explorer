import { Injectable, computed, signal } from '@angular/core';

export type RecommendationMode = 'algorithmic' | 'ai_assisted';

@Injectable({ providedIn: 'root' })
export class ModeService {
  readonly mode = signal<RecommendationMode>('algorithmic');

  readonly accent = computed(() => (this.mode() === 'ai_assisted' ? '#8B7CF6' : '#4CF3FF'));
  readonly isAi = computed(() => this.mode() === 'ai_assisted');

  setAlgorithmic(): void {
    this.mode.set('algorithmic');
  }

  setAiAssisted(): void {
    this.mode.set('ai_assisted');
  }
}
