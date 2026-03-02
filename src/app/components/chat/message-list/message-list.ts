import { Component, inject } from '@angular/core';
import { ThreadStateService } from '../../../services/thread-state.service';
import { ChatService } from '../../../services/chat.service';
import { FirebaseService } from '../../../services/firebase.service';
import { DatePipe } from '@angular/common';
import { CommonModule } from '@angular/common';
import { EmojiPicker } from '../../emoji-picker/emoji-picker';
import { EmojiPickerStateService } from '../../../services/emoji-picker-serivce';
import { ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
@Component({
  selector: 'app-message-list',
  imports: [DatePipe, CommonModule, EmojiPicker],
  templateUrl: './message-list.html',
  styleUrl: './message-list.scss',
})
export class MessageList {
  emojiPickerService = inject(EmojiPickerStateService)
  threadService = inject(ThreadStateService);
  chat = inject(ChatService);
  firebaseService = inject(FirebaseService);
  @ViewChild('scrollAnchor') private scrollAnchor!: ElementRef;

  openThread() {
    this.threadService.setVisible();
  }

  toggleSelectedEmoji(itemId: string, emoji: string) {
    this.chat.toggleReaction(itemId, emoji);
  }
}


