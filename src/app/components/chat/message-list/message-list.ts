import { Component, inject, ViewChild, ElementRef, Output, EventEmitter, effect } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ThreadStateService } from '../../../services/thread-state.service';
import { ChatService } from '../../../services/chat.service';
import { FirebaseService } from '../../../services/firebase.service';
import { EmojiPicker } from '../../emoji-picker/emoji-picker';
import { EmojiPickerStateService } from '../../../services/emoji-picker-serivce';
import { DisplayForeignUserService } from '../../../services/display-foreign-user.service';
import { ShowUserProfile } from '../../../services/showUserProfile';
import { MessageFormatter } from '../message-formatter/message-formatter';
import { Message } from '../../../models/message.class';
import { editOldMessageService } from '../../../services/editOldMessage-service';

@Component({
  selector: 'app-message-list',
  standalone: true,
  imports: [DatePipe, CommonModule, EmojiPicker, MessageFormatter],
  templateUrl: './message-list.html',
  styleUrl: './message-list.scss',
})
export class MessageList {
  emojiPickerService = inject(EmojiPickerStateService);
  threadService = inject(ThreadStateService);
  chat = inject(ChatService);
  firebaseService = inject(FirebaseService);
  displayForeignUserService = inject(DisplayForeignUserService);
  showUserProfileService = inject(ShowUserProfile);
  editOldMessageSerivce = inject(editOldMessageService);

  @ViewChild('bottom') bottom!: ElementRef;
  @Output() mobileNavigation = new EventEmitter<void>();

  isEditMsgHoverd = false;


  setEditMsgHoverdTrue(): void { this.isEditMsgHoverd = true; }
  setEditMsgHoverdFalse(): void { this.isEditMsgHoverd = false; }

  ngAfterViewInit() {
    this.scrollToBottom();
  }

    constructor() {
    effect(() => {
      const messages = this.chat.messages();

      if (messages.length && this.bottom) {
        setTimeout(() => {
          this.scrollToBottom();
        });
      }
    });
  }

  scrollToBottom() {
    this.bottom.nativeElement.scrollIntoView({ behavior: 'auto' });
  }

  openThread(message: Message): void {
    const basePath = this.chat.basePath();
    if (!basePath || !message.id) return;
    this.threadService.openThread(message, basePath, this.resolveContextName());
  }

  private resolveContextName(): string {
    const channelId = this.firebaseService.selectedChannelId();
    if (channelId) return this.findChannelName(channelId);
    const other = this.chat.otherUser();
    return other ? `${other.firstName} ${other.lastName}` : 'Direktnachricht';
  }

  private findChannelName(channelId: string): string {
    return this.firebaseService.channels().find((c: any) => c.id === channelId)?.name ?? 'Channel';
  }

  // --- REACTIONS & DM ---

  toggleEmoji(itemId: string, emoji: string | number | symbol): void { this.chat.toggleReaction(itemId, emoji); }

  selectDm(user: any): void {
    this.mobileNavigation.emit();
    this.chat.openChatRoom(user);
  }

  clickOnUser(): void {
    this.displayForeignUserService.setSelectedUser(this.chat.otherUser());
    this.displayForeignUserService.toggle();
  }

  shouldShowDateSeparator(index: number): boolean {
    const messages = this.chat.messages();
    const current = this.toDate(messages?.[index]?.createdAt);
    if (!current) return false;
    if (index === 0) return true;
    const prev = this.toDate(messages?.[index - 1]?.createdAt);
    return !prev || !this.isSameDay(prev, current);
  }

  getDateSeparatorLabel(date?: Date | null): string {
    if (!date) return '';
    const now = new Date();
    if (this.isSameDay(date, now)) return 'Heute';
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (this.isSameDay(date, yesterday)) return 'Gestern';
    return this.formatFullDate(date);
  }

  private formatFullDate(date: Date): string {
    const fmt = (opts: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat('de-DE', opts).format(date);
    const weekday = fmt({ weekday: 'long' });
    const day = fmt({ day: '2-digit' });
    const month = fmt({ month: 'long' });
    return `${weekday}, ${day}.${month.charAt(0).toUpperCase() + month.slice(1)}`;
  }

  private toDate(value: any): Date | null {
    if (!value) return null;
    if (typeof value?.toDate === 'function') return value.toDate();
    if (value instanceof Date) return value;
    return null;
  }

  private isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
  }
}