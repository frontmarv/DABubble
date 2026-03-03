import { Component, inject, signal, computed, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../../services/chat.service';
import { FirebaseService } from '../../../services/firebase.service';
import { EmojiPickerStateService } from '../../../services/emoji-picker-serivce';
import { EmojiPicker } from '../../emoji-picker/emoji-picker';

interface ComposerSearchResult {
  type: 'user' | 'channel';
  name: string;
  id: string;
  avatar?: string | null;
  status?: string; // Neu: Status für die Anzeige
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
  
  private elementRef = inject(ElementRef); // Für Click-Outside Erkennung
  chatService = inject(ChatService);
  firebaseService = inject(FirebaseService);
  emojiPickerService = inject(EmojiPickerStateService);

  searchQuery = signal<string>('');
  searchType = signal<'user' | 'channel' | null>(null);
  showDropdown = signal<boolean>(false);

  // --- CLICK OUTSIDE LISTENER ---
  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.resetSearchState();
    }
  }

  filteredResults = computed<ComposerSearchResult[]>(() => {
    const query = this.searchQuery().toLowerCase();
    const type = this.searchType();
    
    if (type === 'channel') return this.getChannelResults(query);
    if (type === 'user') return this.getUserResults(query);
    return [];
  });

  private getChannelResults(query: string): ComposerSearchResult[] {
    return this.firebaseService.channels()
      .filter(c => c.name.toLowerCase().includes(query))
      .map(c => ({ type: 'channel', name: c.name, id: c.id, avatar: null }));
  }

  private getUserResults(query: string): ComposerSearchResult[] {
    const currentUid = this.firebaseService.currentUser()?.uid;
    return this.firebaseService.getAllUsers()
      .filter(u => `${u.firstName} ${u.lastName}`.toLowerCase().includes(query))
      .map(u => this.mapUserToResult(u, currentUid))
      .sort((a) => a.name.endsWith('(Du)') ? -1 : 1);
  }

  private mapUserToResult(u: any, currentUid?: string): ComposerSearchResult {
    const isMe = u.uid === currentUid;
    return {
      type: 'user',
      name: isMe ? `${u.firstName} ${u.lastName} (Du)` : `${u.firstName} ${u.lastName}`,
      id: u.uid,
      avatar: u.avatar,
      status: u.status // Status aus den User-Daten übernehmen
    };
  }

  // --- DROPDOWN TOGGLE LOGIK ---
  toggleUserDropdown(event: Event) {
    event.stopPropagation(); 
    const isAlreadyOpen = this.showDropdown() && this.searchType() === 'user';
    
    if (isAlreadyOpen) {
      this.resetSearchState();
    } else {
      this.activateSearch('user', '');
    }
  }

  onInput(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    const textBeforeCursor = textarea.value.substring(0, textarea.selectionStart);
    const mentionContext = this.extractMentionContext(textBeforeCursor);

    if (mentionContext) {
      this.activateSearch(mentionContext.type, mentionContext.query);
    } else {
      this.resetSearchState();
    }
  }

  private extractMentionContext(text: string) {
    const lastAt = text.lastIndexOf('@');
    const lastHash = text.lastIndexOf('#');
    const lastSymbolIndex = Math.max(lastAt, lastHash);

    if (lastSymbolIndex !== -1 && !text.substring(lastSymbolIndex + 1).includes(' ')) {
      return {
        type: (lastAt > lastHash ? 'user' : 'channel') as 'user' | 'channel',
        query: text.substring(lastSymbolIndex + 1)
      };
    }
    return null;
  }

  selectItem(item: ComposerSearchResult) {
    const textarea = this.textarea.nativeElement;
    textarea.value = this.buildReplacedText(textarea.value, textarea.selectionStart, item);
    this.resetSearchState();
    textarea.focus();
  }

  private buildReplacedText(text: string, cursorPos: number, item: ComposerSearchResult): string {
    const lastSymbol = item.type === 'user' ? '@' : '#';
    const lastIndex = text.substring(0, cursorPos).lastIndexOf(lastSymbol);
    const cleanName = item.name.replace(' (Du)', '');
    return text.substring(0, lastIndex) + `${lastSymbol}${cleanName} ` + text.substring(cursorPos);
  }

  private activateSearch(type: 'user' | 'channel', query: string) {
    this.searchType.set(type);
    this.searchQuery.set(query);
    this.showDropdown.set(true);
  }

  private resetSearchState() {
    this.showDropdown.set(false);
    this.searchType.set(null);
    this.searchQuery.set('');
  }

  sendMessage(textarea: HTMLTextAreaElement) {
    const value = textarea.value.trim();
    if (!value) return;
    this.chatService.sendMessage(value);
    this.clearComposer(textarea);
  }

  sendMessageOnEnter(event: KeyboardEvent, message: HTMLTextAreaElement) {
    if (event.key === 'Enter' && message.value.length > 1) {
      event.preventDefault();
      this.sendMessage(message);
    }
  }

  private clearComposer(textarea: HTMLTextAreaElement) {
    textarea.value = '';
    textarea.selectionStart = textarea.selectionEnd = 0;
    this.resetSearchState();
    textarea.focus();
  }

  insertEmoji(emoji: string) {
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
    const file = avatar.replace(/^\/?shared\/profile-pics\//, '').replace(/^profile-pics\//, '');
    return `/shared/profile-pics/${file}`;
  }
}