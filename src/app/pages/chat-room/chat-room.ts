import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Sidebar } from '../../components/sidebar/sidebar';
import { ThreadPanel } from '../../components/thread-panel/thread-panel';
import { MessageComposer } from '../../components/message-composer/message-composer';
import { MessageList } from "../../components/message-list/message-list";

@Component({
  selector: 'app-chat-room',
  standalone: true,
  imports: [CommonModule, FormsModule, Sidebar, ThreadPanel, MessageComposer, MessageList],
  templateUrl: './chat-room.html',
  styleUrl: './chat-room.scss',
})
export class ChatRoom {
  isSidebarOpen = true;
  isProfileMenuOpen = false;
  showUserProfile = false;
  isEditing = false;
  currentUserName = 'Frederik Beck';

  constructor(private router: Router) { }

  toggleProfileMenu() {
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  logOut() {
    this.router.navigate(['/login']);
  }

  openProfile() {
    this.showUserProfile = true;
    this.isProfileMenuOpen = false;
    this.isEditing = false;
  }

  closeProfile() {
    this.showUserProfile = false;
    this.isEditing = false;
  }

  editProfile() {
    this.isEditing = true;
  }

  cancelEdit() {
    this.isEditing = false;
  }

  saveProfile() {
    this.isEditing = false;
  }

  private isBackdropStart = false;

  onMouseDown(event: MouseEvent) {
    this.isBackdropStart = event.target === event.currentTarget;
  }

  onMouseUp(event: MouseEvent) {
    if (this.isBackdropStart && event.target === event.currentTarget) {
      this.closeProfile();
    }
    this.isBackdropStart = false;
  }

  errorMessage: string = '';
  isInputValid: boolean = false;

  validateInput(value: string): void {
    const trimmedValue = value.trim();
    this.isInputValid = trimmedValue.length > 1 && trimmedValue.length <= 30;
    if (trimmedValue.length <= 1) {
      this.errorMessage = 'Bitte Name eingeben';
    } else if (trimmedValue.length > 30) {
      this.errorMessage = 'Name darf maximal 30 Zeichen haben';
    } else {
      this.errorMessage = '';
    }
  }
}
