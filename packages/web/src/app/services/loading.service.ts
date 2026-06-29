import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  visible = signal(false);
  message = signal('');

  show(message: string) {
    this.message.set(message);
    this.visible.set(true);
  }

  hide() {
    this.visible.set(false);
    this.message.set('');
  }

  async wrap<T>(message: string, task: () => Promise<T>): Promise<T> {
    this.show(message);
    try {
      return await task();
    } finally {
      this.hide();
    }
  }
}
