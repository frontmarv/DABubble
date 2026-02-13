import { Component, inject } from '@angular/core';
import { ThreadStateService } from '../../../services/thread-state.service';

@Component({
  selector: 'app-message-list',
  imports: [],
  templateUrl: './message-list.html',
  styleUrl: './message-list.scss',
})
export class MessageList {

  threadService = inject(ThreadStateService);

  openThread() {
    this.threadService.setVisible();
  }

  

}


