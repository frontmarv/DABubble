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

interface MentionDefinition {
  match: string;
  type: 'user' | 'channel';
  data: any;
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


  /**
   * Main getter to retrieve the formatted message as an array of parts.
   * @returns An array of MessagePart objects for rendering.
   */
  get parsedText(): MessagePart[] {
    if (!this.text) return [];
    const allMentions = this.getSortedMentions();
    return this.parseTextIteratively(allMentions);
  }


  /**
   * Collects and sorts all possible user and channel mentions from the database.
   * @returns A sorted list of mention definitions (longest match first).
   */
  private getSortedMentions(): MentionDefinition[] {
    const users = this.firebaseService.getAllUsers().map(u => ({
      match: `@${u.firstName} ${u.lastName}`,
      type: 'user' as const,
      data: u
    }));
    const channels = this.firebaseService.channels().map(c => ({
      match: `#${c.name}`,
      type: 'channel' as const,
      data: c
    }));
    return [...users, ...channels].sort((a, b) => b.match.length - a.match.length);
  }


  /**
   * Iterates through all mentions to split the text content into parts.
   * @param mentions - List of sorted mention definitions.
   * @returns Final array of MessageParts.
   */
  private parseTextIteratively(mentions: MentionDefinition[]): MessagePart[] {
    let parts: MessagePart[] = [{ type: 'text', content: this.text }];
    for (const mention of mentions) {
      parts = this.splitPartsByMention(parts, mention);
    }
    return parts;
  }


  /**
   * Takes existing parts and further splits any 'text' parts by a specific mention.
   * @param parts - Current array of MessageParts.
   * @param mention - The mention definition to look for.
   * @returns A new array of MessageParts.
   */
  private splitPartsByMention(parts: MessagePart[], mention: MentionDefinition): MessagePart[] {
    const newParts: MessagePart[] = [];
    for (const part of parts) {
      if (part.type === 'text') {
        this.pushSplitContent(newParts, part.content, mention);
      } else {
        newParts.push(part);
      }
    }
    return newParts;
  }


  /**
   * Splits a string by a mention and pushes text/mention fragments to the array.
   * @param targetArray - The array to push new fragments into.
   * @param content - The text content to split.
   * @param mention - The mention definition acting as the separator.
   */
  private pushSplitContent(targetArray: MessagePart[], content: string, mention: MentionDefinition): void {
    const splitContent = content.split(mention.match);
    for (let i = 0; i < splitContent.length; i++) {
      if (splitContent[i]) {
        targetArray.push({ type: 'text', content: splitContent[i] });
      }
      if (i < splitContent.length - 1) {
        targetArray.push({ type: mention.type, content: mention.match, data: mention.data });
      }
    }
  }


  /**
   * Handles click events on a user mention.
   * @param user - The user data associated with the mention.
   * @param event - The DOM event.
   */
  onUserClick(user: any, event: Event): void {
    event.stopPropagation();
    this.displayForeignUserService.setSelectedUser(user);
    this.displayForeignUserService.toggle();
  }


  /**
   * Handles click events on a channel mention.
   * @param channel - The channel data associated with the mention.
   * @param event - The DOM event.
   */
  onChannelClick(channel: any, event: Event): void {
    event.stopPropagation();
    this.firebaseService.setSelectedChannel(channel.id);
    this.chatService.openChannel(channel.id);
  }
}