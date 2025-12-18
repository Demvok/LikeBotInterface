import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-emoji-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="emoji-picker-wrapper" role="dialog" aria-label="Emoji picker">
      <div class="emoji-picker-header">
        <h3>Виберіть емоції</h3>
        <button type="button" class="close-btn" (click)="close()" aria-label="Закрити">✕</button>
      </div>

      <div class="emoji-picker-container">
        <div class="emoji-grid" *ngIf="allowedEmojis?.length; else empty">
          <button
            type="button"
            class="emoji-btn"
            *ngFor="let e of allowedEmojis; trackBy: trackByEmoji"
            (click)="select(e)"
            [attr.aria-label]="e"
          >
            {{ e }}
          </button>
        </div>

        <ng-template #empty>
          <div class="empty">Немає доступних емодзі.</div>
        </ng-template>
      </div>
    </div>
  `,
  styles: [`
    .emoji-picker-wrapper {
      display: flex;
      flex-direction: column;
      background: var(--color-bg-alt);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
      width: 100%;
      border: 1px solid var(--color-border);
    }

    .emoji-picker-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 14px;
      border-bottom: none;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      flex-shrink: 0;
    }

    .emoji-picker-header h3 {
      margin: 0;
      font-size: 14px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.3px;
    }

    .close-btn {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      font-size: 18px;
      cursor: pointer;
      color: #ffffff;
      padding: 0;
      width: 30px;
      height: 30px;
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
      padding: 10px;
      max-height: 260px;
      overflow: auto;
      background: var(--color-bg-alt);
    }

    .emoji-grid {
      display: grid;
      grid-template-columns: repeat(8, minmax(0, 1fr));
      gap: 6px;
      align-content: start;
    }

    .emoji-btn {
      border: 2px solid transparent;
      background: transparent;
      border-radius: 8px;
      cursor: pointer;
      font-size: 22px;
      line-height: 1;
      padding: 6px 0;
      transition: all 0.15s ease;
    }

    .emoji-btn:hover {
      background: var(--color-bg-light);
      border-color: var(--color-border);
      transform: translateY(-1px);
    }

    .emoji-btn:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
    }

    .empty {
      padding: 12px;
      color: var(--color-text-alt);
      font-size: 13px;
      text-align: center;
    }
  `]
})
export class EmojiPickerComponent {
  @Input() allowedEmojis: string[] = [];
  @Output() emojiSelected = new EventEmitter<string>();
  @Output() pickerClosed = new EventEmitter<void>();

  trackByEmoji(_index: number, emoji: string) {
    return emoji;
  }

  select(emoji: string) {
    if (!emoji) return;
    this.emojiSelected.emit(emoji);
  }

  close() {
    this.pickerClosed.emit();
  }
}

