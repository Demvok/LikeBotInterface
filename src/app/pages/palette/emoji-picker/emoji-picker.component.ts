import { Component, EventEmitter, Output, CUSTOM_ELEMENTS_SCHEMA, ViewChild, ElementRef, AfterViewInit, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-emoji-picker',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="emoji-picker-wrapper">
      <div class="emoji-picker-header">
        <h3>Виберіть емоції</h3>
        <button type="button" class="close-btn" (click)="close()">✕</button>
      </div>
      <div class="emoji-picker-container" #pickerContainer>
        <emoji-picker #emojiPicker></emoji-picker>
      </div>
    </div>
  `,
  styles: [`
    .emoji-picker-wrapper {
      display: flex;
      flex-direction: column;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      width: 90vw;
      max-width: 400px;
      z-index: 1001;
      border: 1px solid #e5e7eb;
      height: 70vh;
      max-height: 70vh;
    }

    .emoji-picker-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 18px 20px;
      border-bottom: none;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      flex-shrink: 0;
    }

    .emoji-picker-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.3px;
    }

    .close-btn {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: #ffffff;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      border-radius: 6px;
    }

    .close-btn:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: rotate(90deg);
    }

    .emoji-picker-container {
      padding: 0;
      overflow: hidden;
      background: #ffffff;
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }

    .emoji-picker-container::-webkit-scrollbar {
      width: 8px;
    }

    .emoji-picker-container::-webkit-scrollbar-track {
      background: #f0f4ff;
      border-radius: 4px;
    }

    .emoji-picker-container::-webkit-scrollbar-thumb {
      background: #667eea;
      border-radius: 4px;
    }

    .emoji-picker-container::-webkit-scrollbar-thumb:hover {
      background: #764ba2;
    }

    ::ng-deep emoji-picker {
      --category-icon-active-color: #667eea;
      --category-icon-color: #9ca3af;
      --border-color: #e5e7eb;
      --emoji-padding: 8px;
      --emoji-size: 2rem;
      --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      --outline-color: #667eea;
      --input-font-color: #1f2937;
      --input-border-color: #e5e7eb;
      --input-border-radius: 8px;
      --input-font-size: 14px;
      --input-padding: 10px 12px;
      --emoji-hover-color: #f0f4ff;
      --background: #ffffff !important;
      --text-color: #1f2937 !important;
      --category-font-color: #6b7280 !important;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    ::ng-deep emoji-picker {
      background: #ffffff !important;
      color: #1f2937 !important;
      filter: none !important;
    }

    ::ng-deep emoji-picker-search {
      background: #ffffff !important;
    }

    ::ng-deep .emoji-picker-search {
      background: #ffffff !important;
      border-color: #e5e7eb !important;
      color: #1f2937 !important;
    }

    ::ng-deep emoji-picker input,
    ::ng-deep emoji-picker search {
      background: #ffffff !important;
      border-color: #e5e7eb !important;
      color: #1f2937 !important;
    }

    ::ng-deep emoji-picker input::placeholder {
      color: #9ca3af !important;
    }

    ::ng-deep emoji-picker .emoji-picker {
      background: #ffffff !important;
      color: #1f2937 !important;
    }

    ::ng-deep emoji-picker section {
      background: #ffffff !important;
    }

    ::ng-deep emoji-picker .emoji-nav {
      background: #f9fafb !important;
      border-color: #e5e7eb !important;
    }

    ::ng-deep emoji-picker .emoji-nav button {
      color: #6b7280 !important;
      background: transparent !important;
    }

    ::ng-deep emoji-picker .emoji-nav button.active {
      color: #667eea !important;
      border-bottom-color: #667eea !important;
    }

    ::ng-deep emoji-picker .emoji-category {
      background: #ffffff !important;
      color: #1f2937 !important;
    }

    ::ng-deep emoji-picker .emoji {
      background: transparent !important;
    }

    ::ng-deep emoji-picker .emoji:hover {
      background: #f0f4ff !important;
      border-radius: 8px;
    }

    ::ng-deep emoji-picker .emoji-menu {
      background: #ffffff !important;
    }

    ::ng-deep emoji-picker [role="listbox"] {
      background: #ffffff !important;
      color: #1f2937 !important;
    }
  `]
})
export class EmojiPickerComponent implements AfterViewInit {
  @Output() emojiSelected = new EventEmitter<string>();
  @Output() pickerClosed = new EventEmitter<void>();
  @ViewChild('emojiPicker', { static: false }) emojiPickerRef?: ElementRef;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngAfterViewInit() {
    // Only load emoji picker in browser environment
    if (!isPlatformBrowser(this.platformId)) {
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

  close() {
    this.pickerClosed.emit();
  }
}

