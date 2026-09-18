import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VoiceState } from '../../../core/services/voice.service';

@Component({
  selector: 'app-voice-orb',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="orb-container" [class]="'orb-' + state()">
      <div class="orb-ring orb-ring-1"></div>
      <div class="orb-ring orb-ring-2"></div>
      <div class="orb-ring orb-ring-3"></div>
      <div class="orb-sphere">
        <div class="orb-highlight"></div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .orb-container {
      position: relative;
      width: 160px;
      height: 160px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .orb-ring {
      position: absolute;
      border-radius: 50%;
      border: 1px solid oklch(0.32 0.11 265 / 0.12);
      animation: breathe 3s ease-in-out infinite;
    }

    .orb-ring-1 {
      width: 140px;
      height: 140px;
      animation-delay: 0s;
    }

    .orb-ring-2 {
      width: 170px;
      height: 170px;
      animation-delay: 0.4s;
    }

    .orb-ring-3 {
      width: 200px;
      height: 200px;
      animation-delay: 0.8s;
    }

    .orb-sphere {
      position: relative;
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: radial-gradient(
        circle at 35% 30%,
        oklch(0.58 0.16 256) 0%,
        oklch(0.42 0.13 265) 50%,
        oklch(0.32 0.11 265) 100%
      );
      box-shadow: 0 8px 24px oklch(0.32 0.11 265 / 0.25);
      z-index: 1;
    }

    .orb-highlight {
      position: absolute;
      top: 15%;
      left: 20%;
      width: 45%;
      height: 30%;
      border-radius: 50%;
      background: radial-gradient(
        ellipse,
        rgba(255, 255, 255, 0.45) 0%,
        transparent 70%
      );
      transform: rotate(-15deg);
    }

    @keyframes breathe {
      0%, 100% { transform: scale(0.96); opacity: 0.5; }
      50% { transform: scale(1.04); opacity: 0.9; }
    }

    /* ── State Variations ── */
    .orb-listening {
      .orb-sphere {
        animation: pulseScale 1.8s ease-in-out infinite;
      }
    }

    .orb-processing {
      .orb-sphere {
        background: radial-gradient(
          circle at 35% 30%,
          oklch(0.67 0.14 162) 0%,
          oklch(0.58 0.16 256) 50%,
          oklch(0.32 0.11 265) 100%
        );
        animation: pulseScale 1s ease-in-out infinite;
      }
    }

    @keyframes pulseScale {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.06); }
    }
  `],
})
export class VoiceOrbComponent {
  readonly state = input.required<VoiceState>();
}
