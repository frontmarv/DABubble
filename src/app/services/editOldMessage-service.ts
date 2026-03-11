import { Injectable, signal } from '@angular/core';

@Injectable({
    providedIn: 'root'
})

export class editOldMessageService {
    currentMessageId = signal<string>('');
    currentMessageText = signal<string>('');
    currentChat = signal<string>('')

    setEditMessage(id: string, text: string, currentChat: string) {
        this.currentMessageId.set(id);
        this.currentMessageText.set(text);
        this.currentChat.set(currentChat);
    }

    clearEditMessage() {
        this.currentMessageId.set("");
        this.currentMessageText.set('');
    }
}