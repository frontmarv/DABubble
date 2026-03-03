import { Component, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ThreadStateService } from '../../services/thread-state.service';
import { FirebaseService } from '../../services/firebase.service';
import { EmojiPicker } from '../emoji-picker/emoji-picker';
import { EmojiPickerStateService } from '../../services/emoji-picker-serivce';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-thread-panel',
  standalone: true,
  imports: [CommonModule, DatePipe, EmojiPicker, FormsModule],
  templateUrl: './thread-panel.html',
  styleUrl: './thread-panel.scss',
})
export class ThreadPanel {
  threadService     = inject(ThreadStateService);
  firebaseService   = inject(FirebaseService);
  emojiPickerService = inject(EmojiPickerStateService);

  replyText = '';

  async sendReply(): Promise<void> {
    if (!this.replyText.trim()) return;
    await this.threadService.sendThreadReply(this.replyText);
    this.replyText = '';
  }

  sendReplyOnEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey && this.replyText.trim().length > 0) {
      event.preventDefault();
      this.sendReply();
    }
  }

  isOwnMessage(senderId: string): boolean {
    return senderId === this.firebaseService.currentUser()?.uid;
  }

  getUserFor(uid: string) {
    return this.threadService.users()[uid];
  }
}