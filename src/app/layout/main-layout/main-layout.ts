import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Sidebar } from '../../components/sidebar/sidebar';
import { ThreadPanel } from '../../components/thread-panel/thread-panel';
import { MessageComposer } from '../../components/message-composer/message-composer';
import { MessageList } from "../../components/message-list/message-list";

@Component({
  selector: 'app-main-layout',
  imports: [CommonModule, Sidebar, ThreadPanel, MessageComposer, MessageList],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout {
  isSidebarOpen = true;
  isProfileMenuOpen = false;

  toggleProfileMenu() {
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }
}
