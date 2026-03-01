import { Component, inject } from '@angular/core';
import { ChatService } from '../../../services/chat.service';
import { EmojiPickerStateService } from '../../../services/emoji-picker-serivce';
import { EmojiPicker } from '../../emoji-picker/emoji-picker';

@Component({
  selector: 'app-message-composer',
  imports: [EmojiPicker],
  templateUrl: './message-composer.html',
  styleUrl: './message-composer.scss',
})
export class MessageComposer {

  chatService = inject(ChatService)
emojiPickerService = inject(EmojiPickerStateService);
}
