import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TopbarComponent } from '../topbar/topbar.component';
import { SidebarComponent } from '../sidebar/sidebar.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, TopbarComponent, SidebarComponent],
  template: `
    <div class="desktop-shell">
      <app-topbar />
      <div class="layout-body">
        <app-sidebar />
        <main class="desktop-content">
          <router-outlet />
        </main>
      </div>
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

    .layout-body {
      display: flex;
      flex: 1;
      height: calc(100vh - 60px);
      overflow: hidden;
    }

    .desktop-content {
      flex: 1;
      height: 100%;
      overflow-y: auto;
      overflow-x: hidden;
      position: relative;
    }
  `],
})
export class MainLayoutComponent {}
