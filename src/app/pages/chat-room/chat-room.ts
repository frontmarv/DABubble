import { Component, HostListener, inject, signal, computed, OnInit, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Sidebar } from '../../components/sidebar/sidebar';
import { ThreadPanel } from '../../components/thread-panel/thread-panel';
import { ProfileView } from '../../components/profile-view/profile-view';
import { MainChat } from '../../components/chat/main-chat';
import { NotLoggedIn } from '../../components/profile-view/not-logged-in/not-logged-in';
import { AuthService } from '../../services/auth.service';
import { FirebaseService } from '../../services/firebase.service';
import { DisplayForeignUserService } from '../../services/display-foreign-user.service';
import { ShowUserProfile } from '../../services/showUserProfile';
import { ChatService } from '../../services/chat.service';
import { ThreadStateService } from '../../services/thread-state.service';

/**
 * Interface representing a search result item found via global search.
 */
interface SearchResult {
  type: 'channel' | 'user' | 'message';
  name: string;
  id: string;
  avatar?: string | null;
  status?: string;
  context?: string;
  channelId?: string;
}

@Component({
  selector: 'app-chat-room',
  standalone: true,
  imports: [CommonModule, FormsModule, Sidebar, ThreadPanel, ProfileView, MainChat, NotLoggedIn],
  templateUrl: './chat-room.html',
  styleUrls: ['./chat-room.scss'],
})
export class ChatRoom implements OnInit {
  private authService = inject(AuthService);
  private elementRef = inject(ElementRef);
  displayForeignUserService = inject(DisplayForeignUserService);
  firebaseService = inject(FirebaseService);
  showUserProfileService = inject(ShowUserProfile);
  chatService = inject(ChatService);
  threadService = inject(ThreadStateService);

  isSidebarOpen = true;
  isProfileMenuOpen = false;
  windowWidth = signal(window.innerWidth);
  isMobile = computed(() => this.windowWidth() <= 1240);

  searchQuery = signal<string>('');
  showSearchDropdown = signal<boolean>(false);
  filteredResults = signal<SearchResult[]>([]);

  private searchDebounceTimer: any = null;

  /**
   * Closes search dropdown and profile menu when clicking anywhere outside the component element.
   * @param {Event} event - The DOM click event.
   */
  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.showSearchDropdown.set(false);
      this.isProfileMenuOpen = false;
    }
  }

  /**
   * Initializes component state. Ensures sidebar visibility logic for mobile on start.
   */
  ngOnInit() {
    if (this.isMobile()) this.isSidebarOpen = true;
  }

  /**
   * Updates state signals on window resize and adjusts sidebar visibility.
   */
  @HostListener('window:resize')
  onResize() {
    this.windowWidth.set(window.innerWidth);
    if (!this.isMobile()) this.isSidebarOpen = true;
  }

  /**
   * Handles user input in the search field with a debounce mechanism to limit API/DB calls.
   * @param {Event} event - The input event.
   */
  onSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);

    if (!value.trim()) {
      this.filteredResults.set([]);
      this.showSearchDropdown.set(false);
      return;
    }

    this.showSearchDropdown.set(true);
    clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      this.runSearch(value);
    }, 300);
  }

  /**
   * Orchestrates the global search logic, routing queries based on prefix (@ or #) or full-text keywords.
   * @param {string} rawQuery - The unformatted search string.
   * @returns {Promise<void>}
   */
  private async runSearch(rawQuery: string): Promise<void> {
    const query = rawQuery.toLowerCase().trim();
    if (!query) return;

    let results: SearchResult[] = [];

    if (query.startsWith('#')) {
      results = this.getChannelResults(query.slice(1));
    } else if (query.startsWith('@')) {
      results = this.getUserResults(query.slice(1));
    } else {
      const channelResults = this.getChannelResults(query);
      const userResults = this.getUserResults(query);
      const messageResults = await this.getMessageResults(query);
      results = [...channelResults, ...userResults, ...messageResults];
    }

    this.filteredResults.set(results);
  }

  /**
   * Filters available channels from the Firebase state based on search term.
   * @param {string} term - Search query.
   * @returns {SearchResult[]} Array of matching channel results.
   */
  private getChannelResults(term: string): SearchResult[] {
    return this.firebaseService.channels()
      .filter((c) => (c.name || '').toLowerCase().includes(term))
      .map((c) => ({ type: 'channel' as const, name: c.name || 'Unbenannt', id: c.id, avatar: null }));
  }

  /**
   * Filters all users from the Firebase state and maps them to SearchResult objects.
   * @param {string} term - Search query.
   * @returns {SearchResult[]} Sorted array of matching user results.
   */
  private getUserResults(term: string): SearchResult[] {
    const currentUid = this.firebaseService.currentUser()?.uid;
    return this.firebaseService.getAllUsers()
      .filter((u: any) => {
        const firstName = u.firstName || '';
        const lastName = u.lastName || '';
        return firstName.toLowerCase().includes(term) || lastName.toLowerCase().includes(term);
      })
      .map((u: any) => this.mapUserToSearchResult(u, currentUid))
      .sort((a) => (a.name.endsWith('(Du)') ? -1 : 1));
  }

  /**
   * Searches through channel messages for a specific term using the Firebase service.
   * @param {string} term - Search query.
   * @returns {Promise<SearchResult[]>} Array of matching message results.
   */
  private async getMessageResults(term: string): Promise<SearchResult[]> {
    const hits = await this.firebaseService.searchMessagesInChannels(term);

    return hits.map((hit) => ({
      type: 'message' as const,
      name: `In #${hit.channelName}`,
      id: hit.messageId,
      context: hit.text,
      channelId: hit.channelId,
    }));
  }

  /**
   * Maps a raw user object to a standardized SearchResult object.
   * @param {any} u - User object from DB.
   * @param {string} currentUid - UID of the currently logged-in user.
   * @returns {SearchResult}
   */
  private mapUserToSearchResult(u: any, currentUid?: string): SearchResult {
    const isMe = u.uid === currentUid;
    return {
      type: 'user',
      name: isMe ? `${u.firstName} ${u.lastName} (Du)` : `${u.firstName} ${u.lastName}`,
      id: u.uid,
      avatar: u.avatar,
      status: u.status,
    };
  }

  /**
   * Triggers navigation or chat room opening based on the type of search result selected.
   * @param {SearchResult} item - The selected result item.
   */
  selectResult(item: SearchResult) {
    if (item.type === 'user') {
      const user = this.firebaseService.getAllUsers().find((u) => u.uid === item.id);
      if (user) {
        this.displayForeignUserService.setToFalse(); 
        this.firebaseService.setSelectedChannel(''); 
        this.chatService.activeConversation.set(null);
        this.chatService.openChatRoom(user);
      }
    } else if (item.type === 'message' || item.type === 'channel') {
      const targetId = item.channelId || item.id;
      this.chatService.activeConversation.set(null); 
      this.firebaseService.setSelectedChannel(targetId);
      this.chatService.openChannel(targetId);
    }
    this.resetSearch();
  }

  /**
   * Clears search query and resets UI visibility states.
   */
  private resetSearch() {
    this.searchQuery.set('');
    this.filteredResults.set([]);
    this.showSearchDropdown.set(false);
  }

  toggleSidebar() { this.isSidebarOpen = !this.isSidebarOpen; }
  
  /**
   * Closes sidebar on mobile after navigating.
   */
  onMobileNavigation() { if (this.isMobile()) this.isSidebarOpen = false; }
  
  /**
   * Forces sidebar back into focus on mobile and hides active threads.
   */
  goBackToSidebar() { 
    this.isSidebarOpen = true; 
    this.threadService.setHidden();
  }
  
  toggleProfileMenu() { this.isProfileMenuOpen = !this.isProfileMenuOpen; }
  closeForeignUserProfile() { this.displayForeignUserService.setToFalse(); }
  
  /**
   * Executes logout sequence via AuthService.
   */
  async logOut() { await this.authService.logout(); }

  /**
   * Sanitizes avatar URLs. Handles external links, local fallbacks, and internal path stripping.
   * @param {string | null} avatar - Raw avatar path/link.
   * @returns {string} Sanitized URL.
   */
  getAvatarUrl(avatar?: string | null): string {
    const fallback = '/shared/profile-pics/profile-pic1.svg';
    if (!avatar) return fallback;
    if (avatar.startsWith('http')) return avatar;
    return `/shared/profile-pics/${avatar.replace(/^\/?shared\/profile-pics\//, '')}`;
  }
}