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
      <!-- Welcome Heading -->
      <div class="hero-section">
        <div class="greeting-badge">
          <span class="status-dot"></span>
          <span>Working Capital Intelligence</span>
        </div>

        <h1 class="hero-heading">
          CFO Conversational Analytics
        </h1>
        <p class="hero-subheading">
          Select a quick analysis query or type a question to start.
        </p>
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
      padding: 40px 24px;
      position: relative;
      background: var(--bg-app);
    }

    .hero-section {
      text-align: center;
      margin-bottom: 32px;
      animation: fadeInUp 300ms ease;
    }

    .greeting-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: var(--radius-pill);
      background: var(--secondary-surface);
      border: 1px solid var(--border-color);
      font-size: 0.76rem;
      font-weight: 600;
      color: var(--primary-accent);
      margin-bottom: 16px;
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--color-success);
    }

    .hero-heading {
      font-size: 2.2rem;
      font-weight: 700;
      line-height: 1.2;
      letter-spacing: -0.03em;
      color: var(--foreground);
      margin-bottom: 8px;
    }

    .hero-subheading {
      font-size: 0.95rem;
      color: var(--muted-text);
      max-width: 480px;
    }

    .chips-section {
      width: 100%;
      max-width: 720px;
      animation: fadeInUp 300ms ease 100ms both;
    }

    .chips-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
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
