import { Component } from '@angular/core';
import { MessageComposer } from '../message-composer/message-composer';
import { CommonModule } from '@angular/common';
import { ThreadStateService } from '../../services/thread-state.service';
import { inject } from '@angular/core';

@Component({
  selector: 'app-thread-panel',
  imports: [MessageComposer, CommonModule],
  templateUrl: './thread-panel.html',
  styleUrl: './thread-panel.scss',
})
export class ThreadPanel {
  public threadService = inject(ThreadStateService);
}
