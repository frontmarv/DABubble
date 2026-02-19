import { Injectable, signal } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class DisplayForeignUserService {

    selectedUser = signal<any>(null);
    showForeignUserProfile = signal(true);

    toggle() {
        this.showForeignUserProfile.update(current => !current);
    }

    setToFalse() {
        this.showForeignUserProfile.set(false);
    }

    setToTrue() {
        this.showForeignUserProfile.set(true);
    }

    setSelectedUser(user: any) {
        this.selectedUser.set(user);
    }
}