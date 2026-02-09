import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { Router } from '@angular/router';
import { Sidebar } from '../../components/sidebar/sidebar';
import { MessageList } from '../../components/message-list/message-list';
import { MessageComposer } from '../../components/message-composer/message-composer';
import { ThreadPanel } from '../../components/thread-panel/thread-panel';
import { ProfileView } from '../../components/profile-view/profile-view'; 
import { UserService } from '../../services/user.service';
import { User } from '../../models/user.class'; 

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
  isSidebarOpen = true;
  isProfileMenuOpen = false;
  showUserProfile = false;
  
  currentUser: User | null = null;

  constructor(
    private router: Router,
    private userService: UserService 
  ) {

    this.userService.currentUser$.subscribe((user: User | null) => {
      this.currentUser = user;
    });
  }

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

  openProfile() {
    this.showUserProfile = true;
    this.isProfileMenuOpen = false;
  }

  closeProfile() {
    this.showUserProfile = false;
  }
}