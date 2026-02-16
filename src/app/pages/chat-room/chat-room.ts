import { Component, HostListener, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Sidebar } from '../../components/sidebar/sidebar';
import { ThreadPanel } from '../../components/thread-panel/thread-panel';
import { ProfileView } from '../../components/profile-view/profile-view';
import { User } from '../../models/user.class';
import { AuthService } from '../../services/auth.service';
import { FirebaseService } from '../../services/firebase.service';
import { MainChat } from "../../components/chat/main-chat";

const MOBILE_BREAKPOINT = 768;

@Component({
  selector: 'app-chat-room',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Sidebar,
    ThreadPanel,
    ProfileView,
    MainChat
  ],
  templateUrl: './chat-room.html',
  styleUrls: ['./chat-room.scss'],
})
export class ChatRoom implements OnInit {
  private authService = inject(AuthService);
  firebaseService = inject(FirebaseService);

  isSidebarOpen = true;
  isProfileMenuOpen = false;
  showUserProfile = false;

  windowWidth = signal(window.innerWidth);
  isMobile = computed(() => this.windowWidth() <= MOBILE_BREAKPOINT);

  currentUser: User | null = null;

  constructor() {
    this.currentUser = this.firebaseService.currentUser;
  }

  ngOnInit() {
    if (this.isMobile()) {
      this.isSidebarOpen = true;
    }
  }

  @HostListener('window:resize')
  onResize() {
    this.windowWidth.set(window.innerWidth);
    if (!this.isMobile()) {
      this.isSidebarOpen = true;
    }
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  onMobileNavigation() {
    if (this.isMobile()) {
      this.isSidebarOpen = false;
    }
  }

  goBackToSidebar() {
    this.isSidebarOpen = true;
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

  getAvatarUrl(avatar?: string | null): string {
    const fallback = '/shared/profile-pics/profile-pic1.svg';
    if (!avatar) return fallback;
    if (avatar.startsWith('http')) return avatar;

    const file = avatar
      .replace(/^\/?shared\/profile-pics\//, '')
      .replace(/^profile-pics\//, '');

    return `/shared/profile-pics/${file}`;
  }
}