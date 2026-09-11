import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VoiceState } from '../../../core/services/voice.service';

@Component({
  selector: 'app-voice-orb',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="orb-container" [class]="'orb-' + state()">
      <div class="orb-glow"></div>
      <div class="orb-ring orb-ring-1"></div>
      <div class="orb-ring orb-ring-2"></div>
      <div class="orb-ring orb-ring-3"></div>
      <div class="orb-sphere">
        <div class="orb-highlight"></div>
        <div class="orb-reflection"></div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .orb-container {
      position: relative;
      width: 200px;
      height: 200px;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: orbFloat 6s ease-in-out infinite;
    }

    .orb-glow {
      position: absolute;
      inset: -40px;
      border-radius: 50%;
      background: radial-gradient(
        circle,
        rgba(16, 185, 129, 0.3) 0%,
        rgba(16, 185, 129, 0.1) 40%,
        transparent 70%
      );
      filter: blur(20px);
      animation: ambientGlow 3s ease-in-out infinite;
    }

    .orb-ring {
      position: absolute;
      border-radius: 50%;
      border: 1px solid rgba(16, 185, 129, 0.15);
      animation: breathe 4s ease-in-out infinite;
    }

    .orb-ring-1 {
      width: 180px;
      height: 180px;
      border-color: rgba(16, 185, 129, 0.08);
      animation-delay: 0s;
    }

    .orb-ring-2 {
      width: 220px;
      height: 220px;
      border-color: rgba(16, 185, 129, 0.05);
      animation-delay: 0.5s;
    }

    .orb-ring-3 {
      width: 260px;
      height: 260px;
      border-color: rgba(16, 185, 129, 0.03);
      animation-delay: 1s;
    }

    .orb-sphere {
      position: relative;
      width: 140px;
      height: 140px;
      border-radius: 50%;
      background: radial-gradient(
        circle at 35% 30%,
        #34d399 0%,
        #10b981 25%,
        #059669 50%,
        #047857 70%,
        #064e3b 100%
      );
      box-shadow:
        0 0 40px rgba(16, 185, 129, 0.4),
        0 0 80px rgba(16, 185, 129, 0.2),
        inset 0 -20px 40px rgba(0, 0, 0, 0.3),
        inset 0 10px 20px rgba(52, 211, 153, 0.3);
      z-index: 1;
    }

    .orb-highlight {
      position: absolute;
      top: 15%;
      left: 20%;
      width: 50%;
      height: 35%;
      border-radius: 50%;
      background: radial-gradient(
        ellipse,
        rgba(255, 255, 255, 0.35) 0%,
        rgba(255, 255, 255, 0.1) 40%,
        transparent 70%
      );
      transform: rotate(-15deg);
    }

    .orb-reflection {
      position: absolute;
      bottom: 10%;
      right: 20%;
      width: 30%;
      height: 20%;
      border-radius: 50%;
      background: radial-gradient(
        ellipse,
        rgba(16, 185, 129, 0.3) 0%,
        transparent 70%
      );
    }

    /* ── State Variations ── */
    .orb-listening {
      .orb-glow {
        animation: ambientGlow 1.5s ease-in-out infinite;
      }

      .orb-sphere {
        animation: pulseGlow 2s ease-in-out infinite;
      }

      .orb-ring {
        animation-duration: 2s;
      }
    }

    .orb-processing {
      .orb-container {
        animation-duration: 3s;
      }

      .orb-sphere {
        background: radial-gradient(
          circle at 35% 30%,
          #6ee7b7 0%,
          #34d399 25%,
          #10b981 50%,
          #059669 70%,
          #047857 100%
        );
        animation: breathe 1s ease-in-out infinite;
      }

      .orb-glow {
        animation: ambientGlow 1s ease-in-out infinite;
        background: radial-gradient(
          circle,
          rgba(52, 211, 153, 0.4) 0%,
          rgba(16, 185, 129, 0.15) 40%,
          transparent 70%
        );
      }
    }
  `],
})
export class VoiceOrbComponent {
  readonly state = input.required<VoiceState>();
}
