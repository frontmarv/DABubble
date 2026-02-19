import { Component, inject } from '@angular/core';
import { ThreadStateService } from '../../../services/thread-state.service';
import { ChatService } from '../../../services/chat.service';
import { FirebaseService } from '../../../services/firebase.service';

@Component({
  selector: 'app-message-list',
  imports: [],
  templateUrl: './message-list.html',
  styleUrl: './message-list.scss',
})
export class MessageList {

  threadService = inject(ThreadStateService);
  chat = inject(ChatService)
  firebaseService = inject(FirebaseService)


  openThread() {
    this.threadService.setVisible();
  }

  

}


