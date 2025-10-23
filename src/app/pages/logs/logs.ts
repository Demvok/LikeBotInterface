import { Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { LogsService, LogsStreamEvent } from '../../services/logs.service';

type ConnectionState = 'disconnected' | 'connecting' | 'connected';

interface LogEntry {
  kind: 'line' | 'error';
  text: string;
}

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './logs.html',
  styleUrls: ['./logs.css']
})
export class Logs implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly logsService = inject(LogsService);

  readonly logForm = this.fb.group({
    log_file: [''],
    tail: [200, [Validators.min(0), Validators.max(1000)]]
  });

  connectionState: ConnectionState = 'disconnected';
  errorMessage: string | null = null;
  infoMessage: string | null = null;
  autoScroll = true;
  readonly logEntries: LogEntry[] = [];
  private readonly maxEntries = 2000;
  private streamSub?: Subscription;

  @ViewChild('logContainer') private logContainer?: ElementRef<HTMLDivElement>;

  get isConnected(): boolean {
    return this.connectionState === 'connected';
  }

  get isConnecting(): boolean {
    return this.connectionState === 'connecting';
  }

  connect(): void {
    if (this.logForm.invalid) {
      this.logForm.markAllAsTouched();
      return;
    }

    const { log_file, tail } = this.logForm.value;

    this.stopStream(false);
    this.clearLogs();
    this.errorMessage = null;
    this.infoMessage = null;
    this.connectionState = 'connecting';

    this.streamSub = this.logsService
      .streamLogs({
        logFile: log_file ? log_file.trim() || undefined : undefined,
        tail: typeof tail === 'number' ? tail : undefined
      })
      .subscribe({
        next: (event) => this.handleStreamEvent(event),
        error: (err) => {
          this.connectionState = 'disconnected';
          this.errorMessage = err?.message ?? 'Failed to connect to log stream.';
        },
        complete: () => {
          this.connectionState = 'disconnected';
        }
      });
  }

  stopStream(notify: boolean = true): void {
    if (this.streamSub) {
      this.streamSub.unsubscribe();
      this.streamSub = undefined;
    }

    this.connectionState = 'disconnected';

    if (notify) {
      this.infoMessage = 'Log stream stopped.';
    }
  }

  clearLogs(): void {
    this.logEntries.length = 0;
  }

  ngOnDestroy(): void {
    this.stopStream(false);
  }

  private handleStreamEvent(event: LogsStreamEvent): void {
    switch (event.kind) {
      case 'open':
        this.connectionState = 'connected';
        this.infoMessage = this.describeActiveStream();
        break;
      case 'line':
        this.pushLine(event.text, 'line');
        break;
      case 'error':
        this.errorMessage = event.message;
        this.pushLine(`[error] ${event.message}`, 'error');
        break;
      case 'close':
        this.connectionState = 'disconnected';
        if (!event.wasClean && !this.errorMessage) {
          const reason = event.reason ? `: ${event.reason}` : '';
          this.errorMessage = `Connection closed (${event.code})${reason}`;
        }
        break;
    }
  }

  private pushLine(text: string, kind: LogEntry['kind']): void {
    this.logEntries.push({ kind, text });
    if (this.logEntries.length > this.maxEntries) {
      this.logEntries.splice(0, this.logEntries.length - this.maxEntries);
    }
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    if (!this.autoScroll || !this.logContainer) {
      return;
    }

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => {
        const node = this.logContainer?.nativeElement;
        if (node) {
          node.scrollTop = node.scrollHeight;
        }
      });
    } else {
      setTimeout(() => {
        const node = this.logContainer?.nativeElement;
        if (node) {
          node.scrollTop = node.scrollHeight;
        }
      }, 0);
    }
  }

  private describeActiveStream(): string {
    const values = this.logForm.value;
    const logFile = values.log_file?.trim();
    const tailValue = typeof values.tail === 'number' ? values.tail : undefined;
    const source = logFile && logFile.length > 0 ? logFile : 'main.log';
    const tail = typeof tailValue === 'number' ? `tail ${tailValue}` : 'default tail';
    return `Streaming ${source} (${tail})`;
  }
}
