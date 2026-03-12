import { Injectable, signal, inject } from '@angular/core';
import { ChatService } from './chat.service';
import { ThreadStateService } from './thread-state.service';

@Injectable({
    providedIn: 'root'
})
export class DateSeperator {

    chat = inject(ChatService);
    threadService = inject(ThreadStateService);

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

    getDateSeparatorLabel(date?: Date | null): string {
        if (!date) return '';
        const now = new Date();
        if (this.isSameDay(date, now)) return 'Heute';
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        if (this.isSameDay(date, yesterday)) return 'Gestern';
        return this.formatFullDate(date);
    }

    private formatFullDate(date: Date): string {
        const fmt = (opts: Intl.DateTimeFormatOptions) =>
            new Intl.DateTimeFormat('de-DE', opts).format(date);
        const weekday = fmt({ weekday: 'long' });
        const day = fmt({ day: '2-digit' });
        const month = fmt({ month: 'long' });
        return `${weekday}, ${day}.${month.charAt(0).toUpperCase() + month.slice(1)}`;
    }

    private toDate(value: any): Date | null {
        if (!value) return null;
        if (typeof value?.toDate === 'function') return value.toDate();
        if (value instanceof Date) return value;
        return null;
    }

    private isSameDay(a: Date, b: Date): boolean {
        return a.getFullYear() === b.getFullYear()
            && a.getMonth() === b.getMonth()
            && a.getDate() === b.getDate();
    }
}