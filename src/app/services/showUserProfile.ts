import { Injectable, signal } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class ShowUserProfile {
    showUserProfile = signal(false);

    toggle() {
        this.showUserProfile.update(current => !current);
    }

    setToFalse() {
        this.showUserProfile.set(false);
    }

    setToTrue() {
        this.showUserProfile.set(true);
    }
}