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
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              <span>Close Voice</span>
            </button>
          </div>

          <!-- Orb Stage -->
          <div class="voice-orb-stage">
            <app-voice-orb [state]="voiceService.state()"></app-voice-orb>

            <div class="listening-status">
              @if (voiceService.state() === 'listening') {
                <span class="status-text">Listening to your query...</span>
              } @else if (voiceService.state() === 'processing') {
                <span class="status-text">Processing audio...</span>
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
              <p class="transcript-placeholder">Your voice transcription will appear here...</p>
            }
          </div>

          <!-- Bottom Controls -->
          <div class="voice-controls">
            <button class="control-btn" (click)="voiceService.toggleListening()" aria-label="Pause">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"></path>
                <path d="M19 10v2a7 7 0 01-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
            </button>

            <button class="control-btn send" (click)="onSend()" aria-label="Send">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeInScale 0.2s ease;
    }

    .voice-screen {
      width: 100%;
      max-width: 460px;
      height: 75vh;
      max-height: 600px;
      display: flex;
      flex-direction: column;
      align-items: center;
      border-radius: var(--radius-card);
      background: var(--card-surface);
      border: 1px solid var(--border-color);
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.08);
      padding: 24px;
    }

    .voice-top {
      width: 100%;
      display: flex;
      justify-content: center;
      margin-bottom: 12px;
    }

    .close-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: var(--radius-pill);
      background: var(--secondary-surface);
      border: 1px solid var(--border-color);
      color: var(--muted-text);
      font-size: 0.78rem;
      font-weight: 500;
      transition: all 0.15s ease;

      &:hover {
        background: var(--secondary-surface);
        color: var(--foreground);
      }
    }

    .voice-orb-stage {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 18px;
    }

    .listening-status {
      text-align: center;
    }

    .status-text {
      font-size: 0.88rem;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .voice-transcript {
      width: 100%;
      text-align: center;
      padding: 12px 16px;
      min-height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .transcript-text {
      font-size: 1rem;
      font-weight: 500;
      color: var(--foreground);
      line-height: 1.5;
    }

    .transcript-placeholder {
      font-size: 0.86rem;
      color: var(--muted-text);
    }

    .voice-controls {
      display: flex;
      align-items: center;
      gap: 18px;
      padding: 12px 0 6px;
    }

    .control-btn {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--secondary-surface);
      border: 1px solid var(--border-color);
      color: var(--text-secondary);
      transition: all 0.15s ease;

      &:hover {
        background: var(--card-surface);
        color: var(--foreground);
      }

      &.send {
        background: var(--primary-accent);
        color: #ffffff;
        border-color: var(--primary-accent);

        &:hover {
          opacity: 0.92;
        }
      }
    }

    .mic-btn {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--primary-accent);
      color: white;
      transition: all 0.15s ease;

      &:hover {
        opacity: 0.92;
        transform: scale(1.04);
      }

      &.active {
        box-shadow: 0 0 0 4px oklch(0.32 0.11 265 / 0.2);
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
