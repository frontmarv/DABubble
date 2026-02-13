import { Component, inject, Injectable } from '@angular/core';
import { MessageList } from "./message-list/message-list";
import { MessageComposer } from "./message-composer/message-composer";
import { Chat } from '../../models/chat.class';
import { User } from '../../models/user.class';
import { FirebaseService } from '../../services/firebase.service';

@Injectable({
    providedIn: 'root' 
})

@Component({
  selector: 'app-chat',
  imports: [MessageList, MessageComposer],
  templateUrl: './main-chat.html',
  styleUrl: './main-chat.scss',
})
export class MainChat {
  firebaseService = inject(FirebaseService);
  chat = new Chat;
  user = new User;
  currentUserId = "christianklemm";
  otherUid = "tFlFh2DKw6UjW0okwNwd";
  otherUser = "Noah Richter"

  openChatRoom() {
    if (this.firebaseService.isChatAvailable(this.createChatId())){
      this.loadMessages();
    }
    else {
      this.createChat()
    }
  }

  createChatId() {
    return this.currentUserId + this.otherUid
  }

  loadMessages(){
    console.log("Nachrichten werden gerendert");
    
  }

  createChat(){

  }
}

