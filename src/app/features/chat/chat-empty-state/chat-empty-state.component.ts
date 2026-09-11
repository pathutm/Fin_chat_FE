import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../../core/services/chat.service';
import { SuggestionChipComponent } from '../../../shared/components/suggestion-chip/suggestion-chip.component';

@Component({
  selector: 'app-chat-empty-state',
  standalone: true,
  imports: [CommonModule, SuggestionChipComponent],
  template: `
    <div class="empty-state">
      <!-- Ambient glow behind heading -->
      <div class="hero-glow"></div>

      <!-- Welcome Heading -->
      <div class="hero-section">
        <div class="greeting">
          <div class="greeting-avatar">
            <svg viewBox="0 0 32 32" width="24" height="24" fill="none">
              <defs>
                <linearGradient id="emptyLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#34d399"/>
                  <stop offset="100%" stop-color="#059669"/>
                </linearGradient>
              </defs>
              <circle cx="16" cy="16" r="14" stroke="url(#emptyLogoGrad)" stroke-width="2" fill="none"/>
              <path d="M10 20 L14 12 L18 17 L22 10" stroke="url(#emptyLogoGrad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            </svg>
          </div>
          <span class="greeting-text">Welcome back</span>
        </div>

        <h1 class="hero-heading">
          Welcome to <span class="hero-accent">FinAI</span>
        </h1>
      </div>

      <!-- Suggestion Chips -->
      <div class="chips-section">
        <div class="chips-row">
          @for (chip of chatService.suggestions; track chip.id) {
            <app-suggestion-chip
              [title]="chip.title"
              (clicked)="onChipClick(chip.title)"
            />
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 40px 32px;
      position: relative;
      overflow: hidden;
    }

    .hero-glow {
      position: absolute;
      top: 10%;
      left: 50%;
      transform: translateX(-50%);
      width: 500px;
      height: 400px;
      background: radial-gradient(
        ellipse,
        rgba(16, 185, 129, 0.08) 0%,
        rgba(16, 185, 129, 0.03) 40%,
        transparent 70%
      );
      pointer-events: none;
      filter: blur(40px);
    }

    .hero-section {
      text-align: center;
      margin-bottom: 48px;
      position: relative;
      z-index: 1;
      animation: fadeInUp 600ms ease;
    }

    .greeting {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      margin-bottom: 24px;
    }

    .greeting-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .greeting-text {
      font-size: 0.9rem;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .hero-heading {
      font-family: var(--font-display);
      font-size: 3rem;
      font-weight: 800;
      line-height: 1.15;
      letter-spacing: -0.03em;
      color: var(--text-primary);
    }

    .hero-accent {
      background: linear-gradient(135deg, var(--emerald-300), var(--emerald-500), var(--emerald-400));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .chips-section {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 800px;
      animation: fadeInUp 600ms ease 200ms both;
    }

    .chips-row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      justify-content: center;
    }
  `],
})
export class ChatEmptyStateComponent {
  readonly chatService = inject(ChatService);

  onChipClick(title: string): void {
    this.chatService.startNewConversation(title);
  }
}
