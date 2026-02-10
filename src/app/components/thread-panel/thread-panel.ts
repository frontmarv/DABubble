import { Component, inject } from '@angular/core';
import { MessageComposer } from '../message-composer/message-composer';
import { CommonModule } from '@angular/common';
import { ThreadStateService } from '../../services/thread-state.service';


@Component({
  selector: 'app-thread-panel',
  imports: [MessageComposer, CommonModule],
  templateUrl: './thread-panel.html',
  styleUrl: './thread-panel.scss',
})
export class ThreadPanel {
  isThreadVisible = true;

  threadService = inject(ThreadStateService)

  toggleThreadVisiblity() {
    this.isThreadVisible = !this.isThreadVisible;
  }
}
