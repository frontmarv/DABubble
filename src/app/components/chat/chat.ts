import { Component, Injectable } from '@angular/core';
import { MessageList } from "./message-list/message-list";
import { MessageComposer } from "./message-composer/message-composer";

@Injectable({
    providedIn: 'root' 
})

@Component({
  selector: 'app-chat',
  imports: [MessageList, MessageComposer],
  templateUrl: './chat.html',
  styleUrl: './chat.scss',
})
export class Chat {

  openChatRoom() {
    
  }
}
