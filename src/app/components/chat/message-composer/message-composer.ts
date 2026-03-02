import { Component, inject, signal, computed, ViewChild, ElementRef } from '@angular/core';
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

  chatService = inject(ChatService);
  firebaseService = inject(FirebaseService);
  emojiPickerService = inject(EmojiPickerStateService);

  searchQuery = signal<string>('');
  searchType = signal<'user' | 'channel' | null>(null);
  showDropdown = signal<boolean>(false);

  filteredResults = computed<ComposerSearchResult[]>(() => {
    const query = this.searchQuery().toLowerCase();
    const type = this.searchType();
    const currentUid = this.firebaseService.currentUser()?.uid;

    if (type === 'channel') {
      return this.firebaseService.channels()
        .filter(c => c.name.toLowerCase().includes(query))
        .map(c => ({ 
          type: 'channel' as const, 
          name: c.name, 
          id: c.id, 
          avatar: null 
        }));
    }

    if (type === 'user') {
      return this.firebaseService.getAllUsers()
        .filter(u => 
          u.firstName.toLowerCase().includes(query) || 
          u.lastName.toLowerCase().includes(query)
        )
        .map(u => {
          const isMe = u.uid === currentUid;
          return {
            type: 'user' as const,
            name: isMe ? `${u.firstName} ${u.lastName} (Du)` : `${u.firstName} ${u.lastName}`,
            id: u.uid,
            avatar: u.avatar
          };
        })
        .sort((a, b) => a.name.endsWith('(Du)') ? -1 : 1);
    }
    return [];
  });

  onInput(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    const value = textarea.value;
    const cursorPos = textarea.selectionStart;
    const textBefore = value.substring(0, cursorPos);

    const lastAt = textBefore.lastIndexOf('@');
    const lastHash = textBefore.lastIndexOf('#');
    const lastSymbolIndex = Math.max(lastAt, lastHash);

    if (lastSymbolIndex !== -1 && !textBefore.substring(lastSymbolIndex + 1).includes(' ')) {
      this.searchType.set(lastAt > lastHash ? 'user' : 'channel');
      this.searchQuery.set(textBefore.substring(lastSymbolIndex + 1));
      this.showDropdown.set(true);
    } else {
      this.showDropdown.set(false);
      this.searchType.set(null);
    }
  }

  selectItem(item: ComposerSearchResult) {
    const textarea = this.textarea.nativeElement;
    const value = textarea.value;
    const cursorPos = textarea.selectionStart;
    const lastSymbol = item.type === 'user' ? '@' : '#';
    const lastIndex = value.substring(0, cursorPos).lastIndexOf(lastSymbol);

    const cleanName = item.name.replace(' (Du)', '');

    const newValue = 
      value.substring(0, lastIndex) + 
      `${lastSymbol}${cleanName}` + 
      " " + 
      value.substring(cursorPos);

    textarea.value = newValue;
    this.showDropdown.set(false);
    this.searchType.set(null);
    this.searchQuery.set('');
    textarea.focus();
  }

  sendMessage(textarea: HTMLTextAreaElement) {
    const value = textarea.value.trim();
    if (!value) return;

    this.chatService.sendMessage(value);
    textarea.value = '';
    this.showDropdown.set(false);
    this.searchType.set(null);
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