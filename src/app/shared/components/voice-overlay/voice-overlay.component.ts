import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VoiceService } from '../../../core/services/voice.service';
import { ChatService } from '../../../core/services/chat.service';
import { VoiceOrbComponent } from '../voice-orb/voice-orb.component';

@Component({
  selector: 'app-voice-overlay',
  standalone: true,
  imports: [CommonModule, VoiceOrbComponent],
  template: `
    @if (voiceService.isOverlayOpen()) {
      <div class="voice-backdrop" (click)="voiceService.closeOverlay()">
        <div class="voice-screen" (click)="$event.stopPropagation()">
          <!-- Top bar with Close pill -->
          <div class="voice-top">
            <button class="close-pill" (click)="voiceService.closeOverlay()" id="voice-close-btn">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              <span>Close chat</span>
            </button>
          </div>

          <!-- Orb Stage -->
          <div class="voice-orb-stage">
            <app-voice-orb [state]="voiceService.state()"></app-voice-orb>

            <div class="listening-status">
              @if (voiceService.state() === 'listening') {
                <span class="status-text">FinChat is listening...</span>
              } @else if (voiceService.state() === 'processing') {
                <span class="status-text">Processing...</span>
              } @else {
                <span class="status-text">Tap mic to start</span>
              }
            </div>
          </div>

          <!-- Transcribed Text -->
          <div class="voice-transcript">
            @if (voiceService.transcribedText()) {
              <p class="transcript-text">{{ voiceService.transcribedText() }}</p>
            } @else {
              <p class="transcript-placeholder">Your voice will appear here...</p>
            }
          </div>

          <!-- Bottom Controls -->
          <div class="voice-controls">
            <button class="control-btn" (click)="voiceService.toggleListening()" aria-label="Pause">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                @if (voiceService.state() === 'listening') {
                  <rect x="6" y="4" width="4" height="16"></rect>
                  <rect x="14" y="4" width="4" height="16"></rect>
                } @else {
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                }
              </svg>
            </button>

            <button
              class="mic-btn"
              [class.active]="voiceService.state() === 'listening'"
              (click)="voiceService.toggleListening()"
              id="voice-mic-btn"
              aria-label="Toggle microphone"
            >
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"></path>
                <path d="M19 10v2a7 7 0 01-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
            </button>

            <button class="control-btn" (click)="onSend()" aria-label="Send">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .voice-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1000;
      background: rgba(6, 13, 10, 0.92);
      backdrop-filter: blur(20px);
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 300ms ease;
    }

    .voice-screen {
      width: 100%;
      max-width: 520px;
      height: 85vh;
      max-height: 700px;
      display: flex;
      flex-direction: column;
      align-items: center;
      border-radius: var(--radius-xl);
      background: radial-gradient(
        ellipse at 50% 40%,
        rgba(16, 185, 129, 0.08) 0%,
        var(--surface-base) 50%,
        var(--surface-dark) 100%
      );
      border: 1px solid rgba(16, 185, 129, 0.1);
      box-shadow: var(--glow-lg);
      animation: fadeInScale 400ms ease;
      padding: 24px;
    }

    .voice-top {
      width: 100%;
      display: flex;
      justify-content: center;
      margin-bottom: 16px;
    }

    .close-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: var(--radius-full);
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.2);
      color: var(--emerald-400);
      font-size: 0.8rem;
      font-weight: 500;
      transition: all var(--transition-fast);

      &:hover {
        background: rgba(16, 185, 129, 0.2);
        border-color: rgba(16, 185, 129, 0.4);
      }
    }

    .voice-orb-stage {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 24px;
    }

    .listening-status {
      text-align: center;
    }

    .status-text {
      font-size: 0.9rem;
      color: var(--text-secondary);
      animation: pulse 2s ease-in-out infinite;
    }

    .voice-transcript {
      width: 100%;
      text-align: center;
      padding: 16px 24px;
      min-height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .transcript-text {
      font-size: 1.15rem;
      font-weight: 500;
      color: var(--text-primary);
      line-height: 1.5;
    }

    .transcript-placeholder {
      font-size: 0.9rem;
      color: var(--text-tertiary);
    }

    .voice-controls {
      display: flex;
      align-items: center;
      gap: 24px;
      padding: 20px 0;
    }

    .control-btn {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--surface-elevated);
      border: 1px solid var(--surface-border-subtle);
      color: var(--text-secondary);
      transition: all var(--transition-fast);

      &:hover {
        background: var(--surface-hover);
        color: var(--text-primary);
        border-color: rgba(16, 185, 129, 0.2);
      }
    }

    .mic-btn {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--emerald-600);
      color: white;
      transition: all var(--transition-fast);

      &:hover {
        background: var(--emerald-500);
        box-shadow: var(--glow-md);
      }

      &.active {
        background: var(--emerald-500);
        box-shadow: 0 0 30px rgba(16, 185, 129, 0.5);
        animation: pulseGlow 2s ease-in-out infinite;
      }
    }
  `],
})
export class VoiceOverlayComponent {
  readonly voiceService = inject(VoiceService);
  private readonly chatService = inject(ChatService);

  onSend(): void {
    const text = this.voiceService.transcribedText();
    if (text) {
      if (!this.chatService.activeConversationId()) {
        this.chatService.startNewConversation(text);
      } else {
        this.chatService.sendMessage(text);
      }
      this.voiceService.closeOverlay();
    }
  }
}
