import { Component, inject } from '@angular/core';
import { ThreadStateService } from '../../../services/thread-state.service';
import { ChatService } from '../../../services/chat.service';
import { FirebaseService } from '../../../services/firebase.service';
import { DatePipe } from '@angular/common';
import { CommonModule } from '@angular/common';
import { EmojiPicker } from '../../emoji-picker/emoji-picker';
import { EmojiPickerStateService } from '../../../services/emoji-picker-serivce';
import { ViewChild, ElementRef, Output, EventEmitter } from '@angular/core';
import { Message } from '../../../models/message.class';
import { DisplayForeignUserService } from '../../../services/display-foreign-user.service';
import { ShowUserProfile } from '../../../services/showUserProfile';
import { MessageFormatter } from '../message-formatter/message-formatter';
@Component({

  selector: 'app-message-list',
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
  @ViewChild('scrollAnchor') private scrollAnchor!: ElementRef;
  @Output() mobileNavigation = new EventEmitter<void>();

  editingMessageId: string | null = null;
  isEditMsgHoverd: boolean = false;

  setEditMsgHoverdTrue() {
    this.isEditMsgHoverd = true;
  }

  setEditMsgHoverdFalse() {
    this.isEditMsgHoverd = false;
  }

  setItemToEdit(itemId: string) {
    this.editingMessageId = itemId;
    console.log(this.editingMessageId)
  }

  openThread(message: Message): void {
    const basePath = this.chat.basePath();
    const contextName = this.resolveContextName();

    if (!basePath || !message.id) return;

    this.threadService.openThread(message, basePath, contextName);
  }

  private resolveContextName(): string {
    const channelId = this.firebaseService.selectedChannelId();
    if (channelId) {
      const channel = this.firebaseService.channels().find((c: any) => c.id === channelId);
      return channel?.name ?? 'Channel';
    }
    const other = this.chat.otherUser();
    return other ? `${other.firstName} ${other.lastName}` : 'Direktnachricht';
  }

  toggleSelectedEmoji(itemId: string, emoji: string): void {
    this.chat.toggleReaction(itemId, emoji);
  }

  selectDm(user: any) {
    this.mobileNavigation.emit();
    this.chat.openChatRoom(user);
  }

  clickOnUser(){
    this.displayForeignUserService.setSelectedUser(this.chat.otherUser()); 
    this.displayForeignUserService.toggle();
  }

}