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
import { DateSeperator } from '../../../services/date-seperator.service';

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
  dateSeperator = inject(DateSeperator);

  @ViewChild('bottom') bottom!: ElementRef;
  @Output() mobileNavigation = new EventEmitter<void>();

  isEditMsgHoverd = false;


  setEditMsgHoverdTrue(): void { this.isEditMsgHoverd = true; }
  setEditMsgHoverdFalse(): void { this.isEditMsgHoverd = false; }

  ngAfterViewInit() {
    this.scrollToBottom();
  }

  lastMessageCount = 0;

  constructor() {
    effect(() => {
      const messages = this.chat.messages();

      if (messages.length > this.lastMessageCount && this.bottom) {
        setTimeout(() => {
          this.scrollToBottom();
        });
      }
      this.lastMessageCount = messages.length;
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

  toggleEmoji(itemId: string, emoji: string | number | symbol): void { this.chat.toggleReaction(itemId, emoji, 'mainChat'); }

  selectDm(user: any): void {
    this.mobileNavigation.emit();
    this.chat.openChatRoom(user);
  }

  clickOnUser(): void {
    this.displayForeignUserService.setSelectedUser(this.chat.otherUser());
    this.displayForeignUserService.toggle();
  }


}