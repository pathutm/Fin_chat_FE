import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-emerald-sphere',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sphere-wrapper" [style.width.px]="size()" [style.height.px]="size()">
      <div class="sphere-body">
        <div class="specular-highlight"></div>
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

    .sphere-body {
      position: relative;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: radial-gradient(
        circle at 38% 32%,
        oklch(0.68 0.14 256) 0%,
        oklch(0.58 0.16 256) 40%,
        oklch(0.42 0.13 265) 75%,
        oklch(0.32 0.11 265) 100%
      );
      box-shadow: 0 8px 24px oklch(0.32 0.11 265 / 0.2);
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
        rgba(255, 255, 255, 0.6) 0%,
        transparent 70%
      );
      transform: rotate(-25deg);
      pointer-events: none;
    }
  `],
})
export class EmeraldSphereComponent {
  readonly size = input<number>(240);
}
