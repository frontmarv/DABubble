import { Component, inject } from '@angular/core';
import { MessageComposer } from '../chat/message-composer/message-composer';
import { CommonModule } from '@angular/common';
import { ThreadStateService } from '../../services/thread-state.service';
import { EmojiPicker } from '../emoji-picker/emoji-picker';
import { EmojiPickerStateService } from '../../services/emoji-picker-serivce';

@Component({
  selector: 'app-thread-panel',
  imports: [MessageComposer, CommonModule, EmojiPicker],
  templateUrl: './thread-panel.html',
  styleUrl: './thread-panel.scss',
})
export class ThreadPanel {
  threadService = inject(ThreadStateService)
  emojiPickerService = inject(EmojiPickerStateService)
}
