import { Component, HostListener, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Sidebar } from '../../components/sidebar/sidebar';
import { ThreadPanel } from '../../components/thread-panel/thread-panel';
import { ProfileView } from '../../components/profile-view/profile-view';
import { AuthService } from '../../services/auth.service';
import { FirebaseService } from '../../services/firebase.service';
import { MainChat } from '../../components/chat/main-chat';
import { NotLoggedIn } from '../../components/profile-view/not-logged-in/not-logged-in';
import { DisplayForeignUserService } from '../../services/display-foreign-user.service';

interface SearchResult {
  type: 'channel' | 'user';
  name: string;
  id: string;
  avatar?: string | null;
}

const MOBILE_BREAKPOINT = 1240;

@Component({
  selector: 'app-chat-room',
  standalone: true,
  imports: [CommonModule, FormsModule, Sidebar, ThreadPanel, ProfileView, MainChat, NotLoggedIn],
  templateUrl: './chat-room.html',
  styleUrls: ['./chat-room.scss'],
})
export class ChatRoom implements OnInit {
  private authService = inject(AuthService);
  displayForeignUserService = inject(DisplayForeignUserService);
  firebaseService = inject(FirebaseService);

  isSidebarOpen = true;
  isProfileMenuOpen = false;
  showUserProfile = false;

  searchQuery = signal<string>('');
  showSearchDropdown = signal<boolean>(false);

  filteredResults = computed<SearchResult[]>(() => {
    const query = this.searchQuery().toLowerCase();
    const currentUid = this.firebaseService.currentUser()?.uid;

    if (query.startsWith('#')) {
      const term = query.slice(1);
      return this.firebaseService
        .channels()
        .filter((c) => c.name.toLowerCase().includes(term))
        .map((c) => ({
          type: 'channel',
          name: c.name,
          id: c.id,
          avatar: null,
        }));
    }

    if (query.startsWith('@')) {
      const term = query.slice(1);
      const users = this.firebaseService.getAllUsers();

      return users
        .filter(
          (u) => u.firstName.toLowerCase().includes(term) || u.lastName.toLowerCase().includes(term)
        )
        .map((u) => {
          const isMe = u.uid === currentUid;
          return {
            type: 'user' as const,
            name: isMe ? `${u.firstName} ${u.lastName} (Du)` : `${u.firstName} ${u.lastName}`,
            id: u.uid,
            avatar: u.avatar,
          };
        })
        .sort((a, b) => {
          if (a.name.endsWith('(Du)')) return -1;
          if (b.name.endsWith('(Du)')) return 1;
          return a.name.localeCompare(b.name);
        });
    }
    return [];
  });

  windowWidth = signal(window.innerWidth);
  isMobile = computed(() => this.windowWidth() <= MOBILE_BREAKPOINT);

  ngOnInit() {
    if (this.isMobile()) this.isSidebarOpen = true;
  }

  @HostListener('window:resize')
  onResize() {
    this.windowWidth.set(window.innerWidth);
    if (!this.isMobile()) this.isSidebarOpen = true;
  }

  onSearchInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    this.searchQuery.set(value);
    this.showSearchDropdown.set(value.startsWith('@') || value.startsWith('#'));
  }

  selectResult(item: SearchResult) {
    if (item.type === 'channel') {
      this.firebaseService.setSelectedChannel(item.id);
    } else {
      console.log('Privat-Chat mit:', item.name);
    }
    this.searchQuery.set('');
    this.showSearchDropdown.set(false);
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }
  onMobileNavigation() {
    if (this.isMobile()) this.isSidebarOpen = false;
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
  closeForeignUserProfile() {
    this.displayForeignUserService.setToFalse();
  }

  getAvatarUrl(avatar?: string | null): string {
    const fallback = '/shared/profile-pics/profile-pic1.svg';
    if (!avatar) return fallback;
    if (avatar.startsWith('http')) return avatar;
    const file = avatar.replace(/^\/?shared\/profile-pics\//, '').replace(/^profile-pics\//, '');
    return `/shared/profile-pics/${file}`;
  }
}
