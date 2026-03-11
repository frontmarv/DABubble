import { Component, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ThreadStateService } from '../../services/thread-state.service';
import { FirebaseService } from '../../services/firebase.service';
import { EmojiPicker } from '../emoji-picker/emoji-picker';
import { EmojiPickerStateService } from '../../services/emoji-picker-serivce';
import { MessageComposer } from '../chat/message-composer/message-composer';
import { editOldMessageService } from '../../services/editOldMessage-service';

@Component({
  selector: 'app-thread-panel',
  standalone: true,
  imports: [CommonModule, DatePipe, EmojiPicker, MessageComposer],
  templateUrl: './thread-panel.html',
  styleUrl: './thread-panel.scss',
})
export class ThreadPanel {
  threadService = inject(ThreadStateService);
  firebaseService = inject(FirebaseService);
  emojiPickerService = inject(EmojiPickerStateService);
  editOldMessageSerivce = inject(editOldMessageService);
  isEditMsgHoverd = false;


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
}
