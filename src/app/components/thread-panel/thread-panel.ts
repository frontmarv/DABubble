import { Component, inject, ViewChild, ElementRef, effect, AfterViewInit } from '@angular/core';
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
import { DisplayForeignUserService } from '../../services/display-foreign-user.service';
import { ShowUserProfile } from '../../services/showUserProfile';

@Component({
  selector: 'app-thread-panel',
  standalone: true,
  imports: [CommonModule, DatePipe, EmojiPicker, MessageComposer, MessageFormatter],
  templateUrl: './thread-panel.html',
  styleUrl: './thread-panel.scss',
})
export class ThreadPanel implements AfterViewInit {
  threadService = inject(ThreadStateService);
  firebaseService = inject(FirebaseService);
  displayForeignUserService = inject(DisplayForeignUserService);
  emojiPickerService = inject(EmojiPickerStateService);
  editOldMessageSerivce = inject(editOldMessageService);
  chatSerivce = inject(ChatService);
  dateSeperator = inject(DateSeperator);
  showUserProfileService = inject(ShowUserProfile);

  @ViewChild('threadBottom') threadBottom!: ElementRef;

  isEditMsgHoverd = false;
  lastMessageCount = 0;

  /**
   * Initializes the thread observer to trigger auto-scroll on new replies.
   */
  constructor() {
    effect(() => this.observeThreadChanges());
  }

  /**
   * Scrolls to the bottom of the thread after the view is initialized.
   */
  ngAfterViewInit(): void {
    this.scrollToBottom();
  }

  /**
   * Monitors the thread message count and triggers scroll if updated.
   */
  private observeThreadChanges(): void {
    const messages = this.threadService.threadMessages();
    if (messages.length > this.lastMessageCount) {
      this.handleAutoScroll();
    }
    this.lastMessageCount = messages.length;
  }

  /**
   * Triggers a delayed scroll to ensure DOM rendering is complete.
   */
  private handleAutoScroll(): void {
    if (this.threadBottom) {
      setTimeout(() => this.scrollToBottom(), 0);
    }
  }

  /**
   * Scrolls the thread panel to the most recent message.
   */
  scrollToBottom(): void {
    if (this.threadBottom) {
      this.threadBottom.nativeElement.scrollIntoView({ behavior: 'auto' });
    }
  }

  /**
   * Checks if a message belongs to the currently logged-in user.
   * @param senderId - UID of the message sender.
   */
  isOwnMessage(senderId: string): boolean {
    return senderId === this.firebaseService.currentUser()?.uid;
  }

  /**
   * Determines if a user account is effectively deleted or missing.
   * @param uid - The unique identifier of the user.
   */
  isActuallyDeleted(uid: string): boolean {
    if (!uid) return true;
    const allUsers = this.firebaseService.getAllUsers();
    const userExists = allUsers.some((u) => u.uid === uid);
    return allUsers.length > 0 && !userExists;
  }

  /**
   * Löst einen User auf: getAllUsers() hat Priorität (live, reagiert auf Namensänderungen),
   * lokaler Cache dient als Fallback für noch nicht geladene Nutzer.
   * @param uid - Die UID des gesuchten Nutzers.
   */
  getUserFor(uid: string): any | null {
    const liveUser = this.findGlobalUser(uid);
    if (liveUser) return liveUser;

    const cachedUser = this.threadService.users()[uid];
    if (cachedUser && cachedUser.firstName !== 'Gelöschter') return cachedUser;

    return null;
  }

  /**
   * Searches the global user list for a specific UID.
   * @param uid - The unique identifier of the user.
   */
  private findGlobalUser(uid: string): any | null {
    return this.firebaseService.getAllUsers().find((u) => u.uid === uid) || null;
  }

  /**
   * Toggles an emoji reaction for a specific thread message.
   * @param messageId - Target message ID.
   * @param emoji - The emoji symbol or character.
   * @param typeOfChat - Context of the chat (e.g., 'thread').
   */
  toggleEmoji(messageId: string, emoji: string | number | symbol, typeOfChat: string): void {
    this.chatSerivce.toggleReaction(messageId, emoji, typeOfChat);
  }

  setEditMsgHoverdTrue(): void {
    this.isEditMsgHoverd = true;
  }

  setEditMsgHoverdFalse(): void {
    this.isEditMsgHoverd = false;
  }
}