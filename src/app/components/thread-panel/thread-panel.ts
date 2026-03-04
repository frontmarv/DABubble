import { Component, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ThreadStateService } from '../../services/thread-state.service';
import { FirebaseService } from '../../services/firebase.service';
import { EmojiPicker } from '../emoji-picker/emoji-picker';
import { EmojiPickerStateService } from '../../services/emoji-picker-serivce';
import { MessageComposer } from '../chat/message-composer/message-composer';

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

  isOwnMessage(senderId: string): boolean {
    return senderId === this.firebaseService.currentUser()?.uid;
  }

  getUserFor(uid: string) {
    return this.threadService.users()[uid];
  }
}
