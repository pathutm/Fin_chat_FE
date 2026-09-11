import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../../core/services/chat.service';
import { ChatHomeViewComponent } from '../chat-home-view/chat-home-view.component';
import { ChatThreadViewComponent } from '../chat-thread-view/chat-thread-view.component';

@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [CommonModule, ChatHomeViewComponent, ChatThreadViewComponent],
  template: `
    <div class="chat-page-root">
      @switch (chatService.currentView()) {
        @case ('home') {
          <app-chat-home-view />
        }
        @case ('chat') {
          <app-chat-thread-view />
        }
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    .chat-page-root {
      width: 100%;
      height: 100%;
    }
  `],
})
export class ChatPageComponent {
  readonly chatService = inject(ChatService);
}
