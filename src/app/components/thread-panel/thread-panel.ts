import { Component, inject, ViewChild, ElementRef, effect } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ThreadStateService } from '../../services/thread-state.service';
import { FirebaseService } from '../../services/firebase.service';
import { EmojiPicker } from '../emoji-picker/emoji-picker';
import { EmojiPickerStateService } from '../../services/emoji-picker-serivce';
import { MessageComposer } from '../chat/message-composer/message-composer';
import { editOldMessageService } from '../../services/editOldMessage-service';
import { ChatService } from '../../services/chat.service';
import { DateSeperator } from '../../services/date-seperator.service';
import { MessageFormatter } from '../chat/message-formatter/message-formatter';

@Component({
  selector: 'app-thread-panel',
  standalone: true,
  imports: [CommonModule, DatePipe, EmojiPicker, MessageComposer, MessageFormatter],
  templateUrl: './thread-panel.html',
  styleUrl: './thread-panel.scss',
})
export class ThreadPanel {
  threadService = inject(ThreadStateService);
  firebaseService = inject(FirebaseService);
  emojiPickerService = inject(EmojiPickerStateService);
  editOldMessageSerivce = inject(editOldMessageService);
  chatSerivce = inject(ChatService);
  isEditMsgHoverd = false;
  dateSeperator = inject(DateSeperator);

  @ViewChild('threadBottom') threadBottom!: ElementRef;

  ngAfterViewInit() {
    this.scrollToBottom();
  }

  lastMessageCount = 0;

  constructor() {
    effect(() => {
      const messages = this.threadService.threadMessages();

      if (messages.length > this.lastMessageCount && this.threadBottom) {
        setTimeout(() => {
          this.scrollToBottom();
        });
      }
      this.lastMessageCount = messages.length;
    });
  }

  scrollToBottom() {
    this.threadBottom.nativeElement.scrollIntoView({ behavior: 'auto' });
  }


  setEditMsgHoverdTrue(): void { this.isEditMsgHoverd = true; }
  setEditMsgHoverdFalse(): void { this.isEditMsgHoverd = false; }
  toggleEditMsgHoverd() {
    this.isEditMsgHoverd != this.isEditMsgHoverd;
  }

  isOwnMessage(senderId: string): boolean {
    return senderId === this.firebaseService.currentUser()?.uid;
  }

  isActuallyDeleted(uid: string): boolean {
    if (!uid) return true;
    const allUsers = this.firebaseService.getAllUsers();
    const userExists = allUsers.some((u) => u.uid === uid);
    return allUsers.length > 0 && !userExists;
  }

  getUserFor(uid: string) {
    const cachedUser = this.threadService.users()[uid];
    if (cachedUser && cachedUser.firstName !== 'Gelöschter') return cachedUser;

    const globalUser = this.firebaseService.getAllUsers().find((u) => u.uid === uid);
    if (globalUser) return globalUser;
    return null;
  }

  toggleEmoji(messageId: string, emoji: string | number | symbol, typeOfChat: string) {
    this.chatSerivce.toggleReaction(messageId, emoji, typeOfChat);
  }
}
