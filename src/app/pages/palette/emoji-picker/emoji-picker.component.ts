import { Component, EventEmitter, Output, Input, CUSTOM_ELEMENTS_SCHEMA, ViewChild, ElementRef, AfterViewInit, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-emoji-picker',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="emoji-picker-wrapper">
      <div class="emoji-picker-header">
        <h3>Виберіть емоції</h3>
        <button type="button" class="close-btn" (click)="close()">✕</button>
      </div>
      <div class="emoji-picker-container" #pickerContainer>
        @if (allowedEmojis && allowedEmojis.length > 0) {
          <div class="emoji-grid">
            @for (emoji of allowedEmojis; track emoji) {
              <button type="button" class="emoji-button" (click)="selectEmoji(emoji)">
                {{ emoji }}
              </button>
            }
          </div>
        } @else {
          <emoji-picker #emojiPicker></emoji-picker>
        }
      </div>
    </div>
  `,
  styles: [`
    .emoji-picker-wrapper {
      display: flex;
      flex-direction: column;
      background: var(--color-bg-light, #fff);
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      max-width: 800px;
      z-index: 1001;
    }

    .emoji-picker-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 2px solid var(--color-bg-accented, #ddd);
      background: var(--color-bg-accented-lighter, #f5f5f5);
    }

    .emoji-picker-header h3 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--color-text, #333);
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      color: var(--color-text-alt, #666);
      background-color: var(--color-bg-light, #fff);
      border-radius: 4px;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s;
    }

    .close-btn:hover {
      color: var(--color-text-dark, #333);
    }

    .emoji-picker-container {
      padding: 12px;
      max-height: 400px;
      overflow-y: auto;
    }

    .emoji-grid {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      gap: 8px;
      padding: 4px;
    }

    .emoji-button {
      background: transparent;
      border: 2px solid transparent;
      border-radius: 8px;
      padding: 8px;
      font-size: 24px;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 48px;
    }

    .emoji-button:hover {
      background: transparent;
      border-color: var(--color-text-warning, #b0841e);
      transform: scale(1.1);
    }

    .emoji-button:active {
      transform: scale(0.95);
    }

    ::ng-deep emoji-picker {
      --category-icon-active-color: #b0841e;
      --border-color: #ddd;
      --emoji-padding: 8px;
      --font-family: inherit;
    }
  `]
})
export class EmojiPickerComponent implements AfterViewInit {
  @Input() allowedEmojis?: string[];
  @Output() emojiSelected = new EventEmitter<string>();
  @Output() pickerClosed = new EventEmitter<void>();
  @ViewChild('emojiPicker', { static: false }) emojiPickerRef?: ElementRef;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngAfterViewInit() {
    // Only load emoji picker in browser environment if no custom allowed emojis
    if (!isPlatformBrowser(this.platformId) || (this.allowedEmojis && this.allowedEmojis.length > 0)) {
      return;
    }

    // Dynamically import emoji-picker-element only in browser
    import('emoji-picker-element').then(() => {
      if (this.emojiPickerRef) {
        const pickerElement = this.emojiPickerRef.nativeElement;
        pickerElement.addEventListener('emoji-click', (event: any) => {
          const emoji = event.detail?.unicode || event.detail?.emoji;
          if (emoji) {
            this.emojiSelected.emit(emoji);
          }
        });
      }
    });
  }

  selectEmoji(emoji: string) {
    this.emojiSelected.emit(emoji);
  }

  close() {
    this.pickerClosed.emit();
  }
}

