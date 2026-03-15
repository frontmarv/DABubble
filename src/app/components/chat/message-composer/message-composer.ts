import { Component, input, inject, signal, computed, AfterViewInit, ViewChild, ElementRef, HostListener, Input, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../../services/chat.service';
import { ThreadStateService } from '../../../services/thread-state.service';
import { FirebaseService } from '../../../services/firebase.service';
import { EmojiPickerStateService } from '../../../services/emoji-picker-serivce';
import { EmojiPicker } from '../../emoji-picker/emoji-picker';
import { editOldMessageService } from '../../../services/editOldMessage-service';

/**
 * Interface for the mention/search results in the composer dropdown.
 */
interface ComposerSearchResult {
  type: 'user' | 'channel';
  name: string;
  id: string;
  avatar?: string | null;
  status?: string;
}

@Component({
  selector: 'app-message-composer',
  standalone: true,
  imports: [CommonModule, EmojiPicker],
  templateUrl: './message-composer.html',
  styleUrl: './message-composer.scss',
})
export class MessageComposer implements AfterViewInit {
  @ViewChild('message') textarea!: ElementRef<HTMLTextAreaElement>;
  @Input() mode: 'chat' | 'thread' = 'chat';
  @Input() placeholder = 'Nachricht an.....';

  private elementRef = inject(ElementRef);
  chatService = inject(ChatService);
  threadService = inject(ThreadStateService);
  firebaseService = inject(FirebaseService);
  emojiPickerService = inject(EmojiPickerStateService);
  editOldMessageSerivce = inject(editOldMessageService);
  
  composerType = input<string>('mainChat');
  searchQuery = signal<string>('');
  searchType = signal<'user' | 'channel' | null>(null);
  showDropdown = signal<boolean>(false);

  /**
   * Resets search state when clicking outside the component.
   */
  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.resetSearchState();
    }
  }

  /**
   * Effect that watches for messages being edited. 
   * Updates the textarea value and focuses it when an edit is triggered.
   */
  constructor() {
    effect(() => {
      const textToEdit = this.editOldMessageSerivce.currentMessageText();
      const currentChat = this.editOldMessageSerivce.currentChat();
      if (textToEdit && this.composerType() === currentChat) {
        this.textarea.nativeElement.value = textToEdit;
        this.textarea.nativeElement.focus();
      }
    });
  }

  /**
   * Focuses the textarea after initial view render.
   */
  ngAfterViewInit(): void {
    this.textarea.nativeElement.focus();
  }

  /**
   * Computed signal that filters results for the mention dropdown 
   * based on the current search type and query.
   */
  filteredResults = computed<ComposerSearchResult[]>(() => {
    const type = this.searchType();
    let results: ComposerSearchResult[] = [];
    if (type === 'channel') results = this.getChannelResults(this.searchQuery().toLowerCase());
    if (type === 'user') results = this.getUserResults(this.searchQuery().toLowerCase());
    return results.filter(item => !item.name.includes('(Du)'));
  });

  /**
   * Checks if the recipient is a deleted user.
   * Only applicable in chat mode.
   * @returns {boolean} True if the user is deleted.
   */
  isRecipientDeleted(): boolean {
    if (this.mode === 'thread') return false;
    const otherUser = this.chatService.otherUser();
    return otherUser?.firstName === 'Gelöschter';
  }

  // --- SEARCH RESULTS ---

  /**
   * Filters channels from Firebase based on a query string.
   * @param {string} query - The search term.
   * @returns {ComposerSearchResult[]} Formatted channel results.
   */
  private getChannelResults(query: string): ComposerSearchResult[] {
    return this.firebaseService.channels()
      .filter((c) => c.name.toLowerCase().includes(query))
      .map((c) => ({ type: 'channel' as const, name: c.name, id: c.id, avatar: null }));
  }

  /**
   * Filters users from Firebase based on a query string.
   * @param {string} query - The search term.
   * @returns {ComposerSearchResult[]} Formatted user results.
   */
  private getUserResults(query: string): ComposerSearchResult[] {
    const currentUid = this.firebaseService.currentUser()?.uid;
    return this.firebaseService.getAllUsers()
      .filter((u) => {
        const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
        return fullName.includes(query) && u.firstName !== 'Gelöschter';
      })
      .map((u) => this.mapUser(u, currentUid))
      .sort((a) => (a.name.endsWith('(Du)') ? -1 : 1));
  }

  /**
   * Maps a raw user object to the composer search result format.
   * @param {any} u - The user object.
   * @param {string} currentUid - Current user's ID.
   * @returns {ComposerSearchResult}
   */
  private mapUser(u: any, currentUid?: string): ComposerSearchResult {
    const isMe = u.uid === currentUid;
    return {
      type: 'user',
      name: isMe ? `${u.firstName} ${u.lastName} (Du)` : `${u.firstName} ${u.lastName}`,
      id: u.uid, avatar: u.avatar, status: u.status,
    };
  }

  // --- INPUT HANDLING ---

  /**
   * Toggles the user dropdown specifically (manual trigger).
   */
  toggleUserDropdown(event: Event): void {
    event.stopPropagation();
    const isOpen = this.showDropdown() && this.searchType() === 'user';
    isOpen ? this.resetSearchState() : this.activateSearch('user', '');
  }

  /**
   * Handles the input event to detect mentions (@ or #) and triggers search state.
   */
  onInput(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    const context = this.extractMentionContext(textarea.value.substring(0, textarea.selectionStart));
    context ? this.activateSearch(context.type, context.query) : this.resetSearchState();
  }

  /**
   * Extracts the prefix and the query from the text before the cursor.
   * @param {string} text - Text leading up to the cursor.
   * @returns {object|null} The search context or null if no mention found.
   */
  private extractMentionContext(text: string): { type: 'user' | 'channel'; query: string } | null {
    const lastAt = text.lastIndexOf('@');
    const lastHash = text.lastIndexOf('#');
    const lastIdx = Math.max(lastAt, lastHash);
    if (lastIdx === -1 || text.substring(lastIdx + 1).includes(' ')) return null;
    return { type: lastAt > lastHash ? 'user' : 'channel', query: text.substring(lastIdx + 1) };
  }

  /**
   * Selects an item from the dropdown and replaces the trigger symbol/query in text.
   */
  selectItem(item: ComposerSearchResult): void {
    const textarea = this.textarea.nativeElement;
    textarea.value = this.buildReplacedText(textarea.value, textarea.selectionStart, item);
    this.resetSearchState();
    textarea.focus();
  }

  /**
   * Logic for inserting the selected name into the textarea.
   * @returns {string} The full updated message text.
   */
  private buildReplacedText(text: string, cursor: number, item: ComposerSearchResult): string {
    const symbol = item.type === 'user' ? '@' : '#';
    const textBeforeCursor = text.substring(0, cursor);
    const lastIdx = textBeforeCursor.lastIndexOf(symbol);
    const name = item.name.replace(' (Du)', '');
    if (lastIdx === -1) {
      return textBeforeCursor + `${symbol}${name} ` + text.substring(cursor);
    }
    return text.substring(0, lastIdx) + `${symbol}${name} ` + text.substring(cursor);
  }

  // --- SEND ---

  /**
   * Sends the current message or updates an old one.
   * Determines if it's a new message, a thread reply, or an edit.
   */
  sendMessage(textarea: HTMLTextAreaElement): void {
    if (this.isRecipientDeleted()) return;
    const value = textarea.value.trim();
    if (!value) return;
    if (this.editOldMessageSerivce.currentMessageId() === "") {
      this.mode === 'thread' ? this.threadService.sendThreadReply(value) : this.chatService.sendMessage(value);
    } else {
      this.chatService.updateOldMessage(value, this.mode);
    }
    this.clearComposer(textarea);
  }

  /**
   * Key listener for Enter key (without Shift) to trigger message sending.
   */
  sendMessageOnEnter(event: KeyboardEvent, textarea: HTMLTextAreaElement): void {
    if (event.key === 'Enter' && !event.shiftKey && textarea.value.trim()) {
      event.preventDefault();
      this.sendMessage(textarea);
    }
  }

  /**
   * Resets composer state and clears textarea.
   */
  clearComposer(textarea: HTMLTextAreaElement): void {
    textarea.value = '';
    textarea.selectionStart = textarea.selectionEnd = 0;
    this.resetSearchState();
    textarea.focus();
  }

  // --- EMOJI & AVATAR ---

  /**
   * Inserts an emoji at the current cursor position.
   */
  insertEmoji(emoji: string): void {
    const textarea = this.textarea.nativeElement;
    const { selectionStart, selectionEnd, value } = textarea;
    textarea.value = value.slice(0, selectionStart) + emoji + value.slice(selectionEnd);
    textarea.selectionStart = textarea.selectionEnd = selectionStart + emoji.length;
    textarea.focus();
  }

  /**
   * Resolves and cleans avatar URLs for search results.
   * @param {string|null} avatar - The raw avatar string from DB.
   * @returns {string} The formatted local or remote URL.
   */
  getAvatarUrl(avatar?: string | null): string {
    const fallback = '/shared/profile-pics/profile-pic1.svg';
    if (!avatar) return fallback;
    if (avatar.startsWith('http')) return avatar;
    return `/shared/profile-pics/${avatar.replace(/^\/?shared\/profile-pics\//, '').replace(/^profile-pics\//, '')}`;
  }

  // --- HELPERS ---

  /**
   * Activates the search state and opens the dropdown.
   */
  private activateSearch(type: 'user' | 'channel', query: string): void {
    this.searchType.set(type);
    this.searchQuery.set(query);
    this.showDropdown.set(true);
  }

  /**
   * Resets signals related to the dropdown search.
   */
  private resetSearchState(): void {
    this.showDropdown.set(false);
    this.searchType.set(null);
    this.searchQuery.set('');
  }
}