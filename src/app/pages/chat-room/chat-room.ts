import { Component, HostListener, inject, signal, computed, OnInit, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// --- COMPONENTS ---
import { Sidebar } from '../../components/sidebar/sidebar';
import { ThreadPanel } from '../../components/thread-panel/thread-panel';
import { ProfileView } from '../../components/profile-view/profile-view';
import { MainChat } from '../../components/chat/main-chat';
import { NotLoggedIn } from '../../components/profile-view/not-logged-in/not-logged-in';

// --- SERVICES ---
import { AuthService } from '../../services/auth.service';
import { FirebaseService } from '../../services/firebase.service';
import { DisplayForeignUserService } from '../../services/display-foreign-user.service';

interface SearchResult {
  type: 'channel' | 'user';
  name: string;
  id: string;
  avatar?: string | null;
  status?: string; // Neu: Status für die Anzeige in der Suche
}

@Component({
  selector: 'app-chat-room',
  standalone: true,
  imports: [CommonModule, FormsModule, Sidebar, ThreadPanel, ProfileView, MainChat, NotLoggedIn],
  templateUrl: './chat-room.html',
  styleUrls: ['./chat-room.scss'],
})
export class ChatRoom implements OnInit {
  // --- INJECTIONS ---
  private authService = inject(AuthService);
  private elementRef = inject(ElementRef);
  displayForeignUserService = inject(DisplayForeignUserService);
  firebaseService = inject(FirebaseService);

  // --- UI STATE ---
  isSidebarOpen = true;
  isProfileMenuOpen = false;
  showUserProfile = false;
  windowWidth = signal(window.innerWidth);
  isMobile = computed(() => this.windowWidth() <= 1240);

  // --- SEARCH STATE ---
  searchQuery = signal<string>('');
  showSearchDropdown = signal<boolean>(false);

  // --- CLICK OUTSIDE LISTENER ---
  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    // Schließt Dropdowns, wenn man irgendwo anders hinklickt
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.showSearchDropdown.set(false);
      this.isProfileMenuOpen = false;
    }
  }

  ngOnInit() {
    if (this.isMobile()) this.isSidebarOpen = true;
  }

  @HostListener('window:resize')
  onResize() {
    this.windowWidth.set(window.innerWidth);
    if (!this.isMobile()) this.isSidebarOpen = true;
  }

  // --- SEARCH LOGIC ---

  filteredResults = computed<SearchResult[]>(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return [];

    // Unterscheidung: Suche nach Kanälen (#) oder Usern (@) oder beidem
    if (query.startsWith('#')) return this.getChannelResults(query.slice(1));
    if (query.startsWith('@')) return this.getUserResults(query.slice(1));
    
    // Fallback: Suche in beidem (wenn kein Symbol getippt wurde)
    return [...this.getChannelResults(query), ...this.getUserResults(query)];
  });

  private getChannelResults(term: string): SearchResult[] {
    return this.firebaseService.channels()
      .filter((c) => c.name.toLowerCase().includes(term))
      .map((c) => ({ type: 'channel', name: c.name, id: c.id, avatar: null }));
  }

  private getUserResults(term: string): SearchResult[] {
    const currentUid = this.firebaseService.currentUser()?.uid;
    return this.firebaseService.getAllUsers()
      .filter((u: any) => 
        u.firstName.toLowerCase().includes(term) || 
        u.lastName.toLowerCase().includes(term)
      )
      .map((u: any) => this.mapUserToSearchResult(u, currentUid))
      .sort((a, b) => a.name.endsWith('(Du)') ? -1 : 1);
  }

  private mapUserToSearchResult(u: any, currentUid?: string): SearchResult {
    const isMe = u.uid === currentUid;
    return {
      type: 'user',
      name: isMe ? `${u.firstName} ${u.lastName} (Du)` : `${u.firstName} ${u.lastName}`,
      id: u.uid,
      avatar: u.avatar,
      status: u.status // Hier wird der Status für das HTML gemappt
    };
  }

  onSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    this.showSearchDropdown.set(value.length > 0);
  }

  selectResult(item: SearchResult) {
    if (item.type === 'channel') {
      this.firebaseService.setSelectedChannel(item.id);
    } else {
      // Logik für Direktnachrichten kann hier ergänzt werden
      console.log('User ausgewählt:', item.name);
    }
    this.resetSearch();
  }

  private resetSearch() {
    this.searchQuery.set('');
    this.showSearchDropdown.set(false);
  }

  // --- UI ACTIONS ---

  toggleSidebar() { this.isSidebarOpen = !this.isSidebarOpen; }
  onMobileNavigation() { if (this.isMobile()) this.isSidebarOpen = false; }
  goBackToSidebar() { this.isSidebarOpen = true; }
  toggleProfileMenu() { this.isProfileMenuOpen = !this.isProfileMenuOpen; }
  openProfile() { this.showUserProfile = true; this.isProfileMenuOpen = false; }
  closeProfile() { this.showUserProfile = false; }
  closeForeignUserProfile() { this.displayForeignUserService.setToFalse(); }
  async logOut() { await this.authService.logout(); }

  getAvatarUrl(avatar?: string | null): string {
    const fallback = '/shared/profile-pics/profile-pic1.svg';
    if (!avatar) return fallback;
    if (avatar.startsWith('http')) return avatar;
    const file = avatar.replace(/^\/?shared\/profile-pics\//, '').replace(/^profile-pics\//, '');
    return `/shared/profile-pics/${file}`;
  }
}