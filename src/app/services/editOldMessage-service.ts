import { Injectable, signal } from '@angular/core';

@Injectable({
    providedIn: 'root'
})

export class editOldMessageService {
    currentMessageId = signal('');
    currentMessageText = signal<string>('');

    setEditMessage(id: string, text: string) {
        this.currentMessageId.set(id);
        this.currentMessageText.set(text);
        console.log(this.currentMessageText())
    }

    clearEditMessage() {
        this.currentMessageId.set("");
        this.currentMessageText.set('');
    }
}