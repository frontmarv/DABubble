import { Component, inject, ViewChild, ElementRef, Output, EventEmitter, effect, AfterViewInit } from '@angular/core';
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
export class MessageList implements AfterViewInit {
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
  lastMessageCount = 0;

  /**
   * Initializes an effect to observe message changes and trigger auto-scroll.
   */
  constructor() {
    effect(() => {
      this.handleAutoScrollOnNewMessage();
    });
  }

  /**
   * Focuses the bottom of the list after the view is initialized.
   */
  ngAfterViewInit(): void {
    this.scrollToBottom();
  }

  /**
   * Checks if new messages arrived and scrolls to the bottom if the element exists.
   */
  private handleAutoScrollOnNewMessage(): void {
    const messages = this.chat.messages();
    if (messages.length > this.lastMessageCount && this.bottom) {
      setTimeout(() => this.scrollToBottom(), 0);
    }
    this.lastMessageCount = messages.length;
  }

  /**
   * Scrolls the message list container to its lowest point.
   */
  scrollToBottom(): void {
    if (this.bottom) {
      this.bottom.nativeElement.scrollIntoView({ behavior: 'auto' });
    }
  }

  /**
   * Opens the thread panel for a specific message.
   * @param message - The selected message object.
   */
  openThread(message: Message): void {
    const basePath = this.chat.basePath();
    if (!basePath || !message.id) return;
    this.threadService.openThread(message, basePath, this.resolveContextName());
  }

  /**
   * Resolves the name of the current chat context (Channel name or User name).
   * @returns A string representing the current context.
   */
  private resolveContextName(): string {
    const channelId = this.firebaseService.selectedChannelId();
    if (channelId) return this.findChannelName(channelId);
    
    const other = this.chat.otherUser();
    return other ? `${other.firstName} ${other.lastName}` : 'Direktnachricht';
  }

  /**
   * Finds the name of a channel by its ID.
   * @param channelId - The UID of the channel.
   * @returns The channel name or a fallback string.
   */
  private findChannelName(channelId: string): string {
    const channels = this.firebaseService.channels();
    return channels.find((c: any) => c.id === channelId)?.name ?? 'Channel';
  }

  /**
   * Toggles an emoji reaction for a specific message in the main chat.
   * @param itemId - The ID of the message.
   * @param emoji - The emoji character or symbol.
   */
  toggleEmoji(itemId: string, emoji: string | number | symbol): void {
    this.chat.toggleReaction(itemId, emoji, 'mainChat');
  }

  /**
   * Navigates to a direct message room and closes mobile sidebar if active.
   * @param user - The user object to chat with.
   */
  selectDm(user: any): void {
    this.mobileNavigation.emit();
    this.chat.openChatRoom(user);
  }

  /**
   * Opens the profile view for the current chat partner.
   */
  clickOnUser(): void {
    this.displayForeignUserService.setSelectedUser(this.chat.otherUser());
    this.displayForeignUserService.toggle();
  }

  setEditMsgHoverdTrue(): void { this.isEditMsgHoverd = true; }
  setEditMsgHoverdFalse(): void { this.isEditMsgHoverd = false; }
}