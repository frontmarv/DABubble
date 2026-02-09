import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { Router } from '@angular/router';
import { Sidebar } from '../../components/sidebar/sidebar';
import { MessageList } from '../../components/message-list/message-list';
import { MessageComposer } from '../../components/message-composer/message-composer';
import { ThreadPanel } from '../../components/thread-panel/thread-panel';
import { ProfileView } from '../../components/profile-view/profile-view'; 
import { User } from '../../models/user.class'; 
import { AuthService } from '../../services/auth.service';
import { FirebaseService } from '../../services/firebase.service';

@Component({
  selector: 'app-chat-room',
  standalone: true, 
  imports: [
    CommonModule, 
    Sidebar, 
    ThreadPanel, 
    MessageComposer, 
    MessageList, 
    FormsModule,
    ProfileView,
  ],
  templateUrl: './chat-room.html',
  styleUrl: './chat-room.scss',
})
export class ChatRoom {
  private router = inject(Router);
  private authService = inject(AuthService);
  firebaseService = inject(FirebaseService);

  isSidebarOpen = true;
  isProfileMenuOpen = false;
  showUserProfile = false;
  
  currentUser: User | null = null;

  constructor() {
    this.currentUser = this.firebaseService.currentUser;
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  toggleProfileMenu() {
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }

  async logOut() {
    await this.authService.logout();
  }

  openProfile() {
    this.showUserProfile = true;
    this.isProfileMenuOpen = false;
  }

  closeProfile() {
    this.showUserProfile = false;
  }
}