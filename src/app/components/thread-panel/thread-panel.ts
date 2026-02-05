import { Component } from '@angular/core';
import { MessageComposer } from '../message-composer/message-composer';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-thread-panel',
  imports: [MessageComposer, CommonModule],
  templateUrl: './thread-panel.html',
  styleUrl: './thread-panel.scss',
})
export class ThreadPanel {
  isThreadVisible = true;

  toggleThreadVisiblity() {
    this.isThreadVisible = !this.isThreadVisible;
  }
}
