import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Sidebar } from '../../components/sidebar/sidebar';
import { ThreadPanel } from '../../components/thread-panel/thread-panel';
import { MessageComposer } from '../../components/message-composer/message-composer';
import { MessageList } from "../../components/message-list/message-list";
import { Header } from '../../components/header/header';

@Component({
  selector: 'app-chat-room',
  imports: [CommonModule, Sidebar, ThreadPanel, MessageComposer, MessageList, Header],
  templateUrl: './chat-room.html',
  styleUrl: './chat-room.scss',
})
export class ChatRoom {
  isSidebarOpen = true;

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }
}
