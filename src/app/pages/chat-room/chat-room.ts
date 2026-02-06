import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Sidebar } from '../../components/sidebar/sidebar';
import { MessageList } from '../../components/message-list/message-list';
import { MessageComposer } from '../../components/message-composer/message-composer';
import { ThreadPanel } from '../../components/thread-panel/thread-panel';

@Component({
  selector: 'app-chat-room',
  standalone: true,
  imports: [
    CommonModule, 
    Sidebar, 
    MessageList, 
    MessageComposer, 
    ThreadPanel
  ],
  templateUrl: './chat-room.html',
  styleUrl: './chat-room.scss',
})
export class ChatRoom {
  
  isSidebarOpen = true;
  isProfileMenuOpen = false;

  constructor(
      private router: Router, 
  ) {}

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  toggleProfileMenu() {
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }

  logOut() {
    console.log("User wird ausgeloggt...");
    this.router.navigate(['/login']);
  }
}