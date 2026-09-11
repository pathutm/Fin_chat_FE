import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-emerald-sphere',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sphere-wrapper" [style.width.px]="size()" [style.height.px]="size()">
      <!-- Atmospheric Ambient Glow Halo -->
      <div class="ambient-glow"></div>
      
      <!-- Ethereal Radial Waves -->
      <div class="pulse-ring ring-1"></div>
      <div class="pulse-ring ring-2"></div>
      
      <!-- 3D Luminous Emerald Sphere -->
      <div class="sphere-body">
        <!-- Specular Spotlight Reflection -->
        <div class="specular-highlight"></div>
        <!-- Secondary Soft Reflection -->
        <div class="soft-reflection"></div>
        <!-- Inner Ambient Core -->
        <div class="inner-core"></div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: inline-block;
    }

    .sphere-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .ambient-glow {
      position: absolute;
      inset: -35%;
      border-radius: 50%;
      background: radial-gradient(
        circle,
        rgba(16, 185, 129, 0.4) 0%,
        rgba(5, 150, 105, 0.2) 40%,
        transparent 70%
      );
      filter: blur(40px);
      pointer-events: none;
      animation: pulseHalo 4s ease-in-out infinite;
    }

    .pulse-ring {
      position: absolute;
      border-radius: 50%;
      border: 1px solid rgba(16, 185, 129, 0.15);
      pointer-events: none;
    }

    .ring-1 {
      inset: -15%;
      animation: pulseHalo 5s ease-in-out infinite 0.5s;
    }

    .ring-2 {
      inset: -30%;
      border-color: rgba(16, 185, 129, 0.08);
      animation: pulseHalo 6s ease-in-out infinite 1s;
    }

    .sphere-body {
      position: relative;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: radial-gradient(
        circle at 38% 32%,
        #a7f3d0 0%,
        #34d399 22%,
        #10b981 44%,
        #059669 68%,
        #047857 82%,
        #022c22 100%
      );
      box-shadow:
        0 0 60px rgba(16, 185, 129, 0.45),
        0 0 120px rgba(5, 150, 105, 0.25),
        inset 0 -35px 55px rgba(1, 22, 16, 0.85),
        inset 0 12px 30px rgba(167, 243, 208, 0.45);
      animation: sphereBreathe 5s ease-in-out infinite;
      cursor: pointer;
      transition: transform 0.3s ease;

      &:hover {
        transform: scale(1.05);
      }
    }

    .specular-highlight {
      position: absolute;
      top: 14%;
      left: 24%;
      width: 44%;
      height: 32%;
      border-radius: 50%;
      background: radial-gradient(
        ellipse at center,
        rgba(255, 255, 255, 0.75) 0%,
        rgba(255, 255, 255, 0.3) 40%,
        transparent 75%
      );
      transform: rotate(-25deg);
      filter: blur(1.5px);
      pointer-events: none;
    }

    .soft-reflection {
      position: absolute;
      bottom: 12%;
      right: 22%;
      width: 38%;
      height: 25%;
      border-radius: 50%;
      background: radial-gradient(
        ellipse at center,
        rgba(52, 211, 153, 0.4) 0%,
        transparent 70%
      );
      filter: blur(4px);
      pointer-events: none;
    }

    .inner-core {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: radial-gradient(
        circle at 50% 50%,
        transparent 60%,
        rgba(2, 44, 34, 0.4) 100%
      );
      pointer-events: none;
    }
  `],
})
export class EmeraldSphereComponent {
  readonly size = input<number>(240);
}
