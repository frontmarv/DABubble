import { Component, inject, Injectable, signal } from '@angular/core';
import { MessageList } from "./message-list/message-list";
import { MessageComposer } from "./message-composer/message-composer";
import { ChatService } from '../../services/chat.service';



@Component({
  selector: 'app-chat',
  imports: [MessageList, MessageComposer],
  templateUrl: './main-chat.html',
  styleUrl: './main-chat.scss',
})
export class MainChat {
  chat = inject(ChatService)
}

