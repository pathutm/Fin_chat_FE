import { Injectable, signal } from '@angular/core';

export type VoiceState = 'idle' | 'listening' | 'processing';

@Injectable({ providedIn: 'root' })
export class VoiceService {
  /** Whether the voice overlay is open */
  readonly isOverlayOpen = signal(false);

  /** Current voice state */
  readonly state = signal<VoiceState>('idle');

  /** The transcribed text from the voice input */
  readonly transcribedText = signal('');

  /** Open the voice overlay and start listening */
  openOverlay(): void {
    this.isOverlayOpen.set(true);
    this.state.set('listening');
    this.transcribedText.set('');
  }

  /** Close the voice overlay */
  closeOverlay(): void {
    this.isOverlayOpen.set(false);
    this.state.set('idle');
    this.transcribedText.set('');
  }

  /** Toggle listening state */
  toggleListening(): void {
    if (this.state() === 'listening') {
      this.state.set('idle');
    } else {
      this.state.set('listening');
    }
  }

  /** Simulate processing */
  startProcessing(): void {
    this.state.set('processing');
  }
}
