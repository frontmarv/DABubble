import { Component, inject, Injectable, signal } from '@angular/core';
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
  chatIsActive = signal(false);
  firebaseService = inject(FirebaseService);
  chat = new Chat;
  user = new User;
  otherUser: User | null | undefined;
  currentUserId = "christianklemm";

  openChatRoom() {

    if (this.firebaseService.isChatAvailable(this.createChatId())) {
      this.loadMessages();
    }
    else {
      this.createChat()
    }
    this.getOtherUserData();
    this.chatIsActive.set(true);
  }

  createChatId() {
    return this.currentUserId + this.otherUser?.uid
  }

  loadMessages() {
    console.log("Nachrichten werden gerendert");

  }

  createChat() {

  }

  async getOtherUserData() {
    const otherUserInfo = await this.firebaseService.getSingleUser("tFlFh2DKw6UjW0okwNwd");
    this.otherUser = otherUserInfo;
    console.log(this.otherUser);

  }
}

