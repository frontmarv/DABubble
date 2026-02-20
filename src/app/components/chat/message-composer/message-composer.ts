import { Component, inject } from '@angular/core';
import { ChatService } from '../../../services/chat.service';

@Component({
  selector: 'app-message-composer',
  imports: [],
  templateUrl: './message-composer.html',
  styleUrl: './message-composer.scss',
})
export class MessageComposer {

  chatService = inject(ChatService)

}
