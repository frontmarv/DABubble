import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FirebaseService } from '../../../services/firebase.service';
import { DisplayForeignUserService } from '../../../services/display-foreign-user.service';
import { ChatService } from '../../../services/chat.service';

interface MessagePart {
  type: 'text' | 'user' | 'channel';
  content: string;
  data?: any;
}

@Component({
  selector: 'app-message-formatter',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './message-formatter.html',
  styleUrl: './message-formatter.scss'
})
export class MessageFormatter {
  @Input() text: string = '';

  firebaseService = inject(FirebaseService);
  displayForeignUserService = inject(DisplayForeignUserService);
  chatService = inject(ChatService);

  get parsedText(): MessagePart[] {
    if (!this.text) return [];

    const users = this.firebaseService.getAllUsers();
    const channels = this.firebaseService.channels();

    // 1. Alle echten User und Channels aus der DB als Such-Strings vorbereiten
    const userMentions = users.map(u => ({ match: `@${u.firstName} ${u.lastName}`, type: 'user', data: u }));
    const channelMentions = channels.map(c => ({ match: `#${c.name}`, type: 'channel', data: c }));
    
    const allMentions = [...userMentions, ...channelMentions];
    
    // 2. WICHTIG: Nach Länge absteigend sortieren, damit längere Namen zuerst gefunden werden
    allMentions.sort((a, b) => b.match.length - a.match.length);

    let parts: MessagePart[] = [{ type: 'text', content: this.text }];

    // 3. Den Text iterativ zerschneiden
    for (const mention of allMentions) {
      let newParts: MessagePart[] = [];
      for (const part of parts) {
        if (part.type === 'text') {
          const splitContent = part.content.split(mention.match);
          for (let i = 0; i < splitContent.length; i++) {
            if (splitContent[i]) {
              newParts.push({ type: 'text', content: splitContent[i] });
            }
            if (i < splitContent.length - 1) {
              newParts.push({ type: mention.type as any, content: mention.match, data: mention.data });
            }
          }
        } else {
          newParts.push(part);
        }
      }
      parts = newParts;
    }

    return parts;
  }

  // --- KLICK-AKTIONEN ---

  onUserClick(user: any, event: Event) {
    event.stopPropagation();
    this.displayForeignUserService.setSelectedUser(user);
    this.displayForeignUserService.toggle();
  }

  onChannelClick(channel: any, event: Event) {
    event.stopPropagation();
    this.firebaseService.setSelectedChannel(channel.id);
    this.chatService.openChannel(channel.id);
  }
}