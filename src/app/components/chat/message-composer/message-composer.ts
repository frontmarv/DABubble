import { Component, inject, signal, computed, ViewChild, ElementRef, HostListener, Input, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../../services/chat.service';
import { ThreadStateService } from '../../../services/thread-state.service';
import { FirebaseService } from '../../../services/firebase.service';
import { EmojiPickerStateService } from '../../../services/emoji-picker-serivce';
import { EmojiPicker } from '../../emoji-picker/emoji-picker';
import { editOldMessageService } from '../../../services/editOldMessage-service';

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
export class MessageComposer {
  @ViewChild('message') textarea!: ElementRef<HTMLTextAreaElement>;
  @Input() mode: 'chat' | 'thread' = 'chat';
  @Input() placeholder = 'Nachricht an.....';

  private elementRef = inject(ElementRef);
  chatService = inject(ChatService);
  threadService = inject(ThreadStateService);
  firebaseService = inject(FirebaseService);
  emojiPickerService = inject(EmojiPickerStateService);
  editOldMessageSerivce = inject(editOldMessageService);

  searchQuery = signal<string>('');
  searchType = signal<'user' | 'channel' | null>(null);
  showDropdown = signal<boolean>(false);

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) this.resetSearchState();
  }

  constructor() {
    effect(() => {
      const textToEdit = this.editOldMessageSerivce.currentMessageText();
      if (textToEdit && this.textarea) {
        this.textarea.nativeElement.value = textToEdit;
        this.textarea.nativeElement.focus();
      }
    });
  }
  filteredResults = computed<ComposerSearchResult[]>(() => {
    const type = this.searchType();
    if (type === 'channel') return this.getChannelResults(this.searchQuery().toLowerCase());
    if (type === 'user') return this.getUserResults(this.searchQuery().toLowerCase());
    return [];
  });

  isRecipientDeleted(): boolean {
    if (this.mode === 'thread') return false;
    const otherUser = this.chatService.otherUser();
    return otherUser?.firstName === 'Gelöschter';
  }

  // --- SEARCH RESULTS ---

  private getChannelResults(query: string): ComposerSearchResult[] {
    return this.firebaseService.channels()
      .filter((c) => c.name.toLowerCase().includes(query))
      .map((c) => ({ type: 'channel' as const, name: c.name, id: c.id, avatar: null }));
  }

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

  private mapUser(u: any, currentUid?: string): ComposerSearchResult {
    const isMe = u.uid === currentUid;
    return {
      type: 'user',
      name: isMe ? `${u.firstName} ${u.lastName} (Du)` : `${u.firstName} ${u.lastName}`,
      id: u.uid, avatar: u.avatar, status: u.status,
    };
  }

  // --- INPUT HANDLING ---

  toggleUserDropdown(event: Event): void {
    event.stopPropagation();
    const isOpen = this.showDropdown() && this.searchType() === 'user';
    isOpen ? this.resetSearchState() : this.activateSearch('user', '');
  }

  onInput(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    const context = this.extractMentionContext(textarea.value.substring(0, textarea.selectionStart));
    context ? this.activateSearch(context.type, context.query) : this.resetSearchState();
  }

  private extractMentionContext(text: string): { type: 'user' | 'channel'; query: string } | null {
    const lastAt = text.lastIndexOf('@');
    const lastHash = text.lastIndexOf('#');
    const lastIdx = Math.max(lastAt, lastHash);
    if (lastIdx === -1 || text.substring(lastIdx + 1).includes(' ')) return null;
    return { type: lastAt > lastHash ? 'user' : 'channel', query: text.substring(lastIdx + 1) };
  }

  selectItem(item: ComposerSearchResult): void {
    const textarea = this.textarea.nativeElement;
    textarea.value = this.buildReplacedText(textarea.value, textarea.selectionStart, item);
    this.resetSearchState();
    textarea.focus();
  }

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

  sendMessage(textarea: HTMLTextAreaElement): void {
    if (this.isRecipientDeleted()) return;
    const value = textarea.value.trim();
    if (!value) return;
    if (this.editOldMessageSerivce.currentMessageId() === "") {
      this.mode === 'thread' ? this.threadService.sendThreadReply(value) : this.chatService.sendMessage(value);
    } else {
      this.chatService.updateOldMessage(value);
    }
    this.clearComposer(textarea);
  }

  sendMessageOnEnter(event: KeyboardEvent, textarea: HTMLTextAreaElement): void {
    if (event.key === 'Enter' && !event.shiftKey && textarea.value.trim()) {
      event.preventDefault();
      this.sendMessage(textarea);
    }
  }

  clearComposer(textarea: HTMLTextAreaElement): void {
    textarea.value = '';
    textarea.selectionStart = textarea.selectionEnd = 0;
    this.resetSearchState();
    textarea.focus();
  }

  // --- EMOJI & AVATAR ---

  insertEmoji(emoji: string): void {
    const textarea = this.textarea.nativeElement;
    const { selectionStart, selectionEnd, value } = textarea;
    textarea.value = value.slice(0, selectionStart) + emoji + value.slice(selectionEnd);
    textarea.selectionStart = textarea.selectionEnd = selectionStart + emoji.length;
    textarea.focus();
  }

  getAvatarUrl(avatar?: string | null): string {
    const fallback = '/shared/profile-pics/profile-pic1.svg';
    if (!avatar) return fallback;
    if (avatar.startsWith('http')) return avatar;
    return `/shared/profile-pics/${avatar.replace(/^\/?shared\/profile-pics\//, '').replace(/^profile-pics\//, '')}`;
  }

  // --- HELPERS ---

  private activateSearch(type: 'user' | 'channel', query: string): void {
    this.searchType.set(type);
    this.searchQuery.set(query);
    this.showDropdown.set(true);
  }

  private resetSearchState(): void {
    this.showDropdown.set(false);
    this.searchType.set(null);
    this.searchQuery.set('');
  }
}