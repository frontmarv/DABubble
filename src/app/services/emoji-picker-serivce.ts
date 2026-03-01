import { Injectable, signal } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class EmojiPickerStateService {
    isEmojiPickerVisible = signal(false);

    toggle() {
        this.isEmojiPickerVisible.set(!this.isEmojiPickerVisible());
    }

    setHidden() {
        this.isEmojiPickerVisible.set(false);
    }

    setVisible() {
        this.isEmojiPickerVisible.set(true);
    }
}