import { Injectable, inject } from '@angular/core';
import { ChatService } from './chat.service';
import { ThreadStateService } from './thread-state.service';

/**
 * Service responsible for determining if a date separator should be displayed 
 * between messages and formatting the separator labels (e.g., 'Heute', 'Gestern').
 */
@Injectable({
  providedIn: 'root'
})
export class DateSeperator {

  private chat = inject(ChatService);
  private threadService = inject(ThreadStateService);

  /**
   * Logic to determine if a date separator is required for a specific message index.
   * A separator is shown if the message is the first in the list or if the 
   * previous message was sent on a different calendar day.
   * @param index - The index of the message in the current list.
   * @param isThread - Flag to switch between main chat or thread message sources.
   * @returns {boolean} True if a separator should be rendered.
   */
  shouldShowDateSeparator(index: number, isThread: boolean): boolean {
    const messages = isThread
      ? this.threadService.threadMessages()
      : this.chat.messages();
    
    const current = this.toDate(messages?.[index]?.createdAt);
    if (!current) return false;
    if (index === 0) return true;

    const prev = this.toDate(messages?.[index - 1]?.createdAt);
    return !prev || !this.isSameDay(prev, current);
  }

  /**
   * Generates a user-friendly label for the date separator.
   * Supports specific strings for 'Heute' (Today) and 'Gestern' (Yesterday).
   * @param date - The Date object to format.
   * @returns {string} The formatted label or an empty string if date is null.
   */
  getDateSeparatorLabel(date?: Date | null): string {
    if (!date) return '';
    const now = new Date();
    if (this.isSameDay(date, now)) return 'Heute';
    
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (this.isSameDay(date, yesterday)) return 'Gestern';
    
    return this.formatFullDate(date);
  }

  /**
   * Formats a date into a long-form string localized for 'de-DE'.
   * Example: "Montag, 15.März"
   * @param date - The Date object to format.
   * @returns {string} The localized full date string.
   */
  private formatFullDate(date: Date): string {
    const fmt = (opts: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat('de-DE', opts).format(date);
    
    const weekday = fmt({ weekday: 'long' });
    const day = fmt({ day: '2-digit' });
    const month = fmt({ month: 'long' });
    
    return `${weekday}, ${day}.${month.charAt(0).toUpperCase() + month.slice(1)}`;
  }

  /**
   * Normalizes various timestamp formats (Firebase Timestamp, Date, etc.) into a JS Date object.
   * @param value - The raw timestamp value from the database.
   * @returns {Date | null} The parsed Date object or null if invalid.
   */
  private toDate(value: any): Date | null {
    if (!value) return null;
    if (typeof value?.toDate === 'function') return value.toDate();
    if (value instanceof Date) return value;
    return null;
  }

  /**
   * Compares two Date objects to check if they represent the same calendar day.
   * @param a - First Date object.
   * @param b - Second Date object.
   * @returns {boolean} True if day, month, and year are identical.
   */
  private isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate();
  }
}