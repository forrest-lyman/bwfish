import { Component, HostListener, input, output } from '@angular/core';

@Component({
  selector: 'app-dialog',
  standalone: true,
  imports: [],
  templateUrl: './dialog.html',
  styleUrl: './dialog.scss',
})
export class Dialog {
  open = input(false);
  title = input('');
  closed = output<void>();

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.open()) {
      this.closed.emit();
    }
  }

  onBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.closed.emit();
    }
  }
}
