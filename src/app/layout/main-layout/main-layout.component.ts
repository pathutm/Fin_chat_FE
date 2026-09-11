import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TopbarComponent } from '../topbar/topbar.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, TopbarComponent],
  template: `
    <div class="desktop-shell">
      <app-topbar />
      <main class="desktop-content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .desktop-shell {
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: 100vw;
      overflow: hidden;
      background: var(--bg-app);
      position: relative;
    }

    .desktop-content {
      flex: 1;
      height: calc(100vh - 60px);
      overflow-y: auto;
      overflow-x: hidden;
      position: relative;
    }
  `],
})
export class MainLayoutComponent {}
