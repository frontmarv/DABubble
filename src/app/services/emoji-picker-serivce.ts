import { Injectable, signal, inject } from '@angular/core';
import { FirebaseService } from './firebase.service';

@Injectable({
    providedIn: 'root'
})
export class EmojiPickerStateService {
    get REACTION_LIMIT(): number {
        return typeof window !== 'undefined' && window.innerWidth < 700 ? 7 : 15;
    }
    expandedReactions = new Set<string>();
    isEmojiPickerVisible = signal(false);
    firebaseService = inject(FirebaseService);
    toggle() {
        this.isEmojiPickerVisible.set(!this.isEmojiPickerVisible());
    }

    setHidden() {
        this.isEmojiPickerVisible.set(false);
    }

    setVisible() {
        this.isEmojiPickerVisible.set(true);
    }

    toggleReactionsExpanded(messageId: string): void {
        if (this.expandedReactions.has(messageId)) {
            this.expandedReactions.delete(messageId);
        } else {
            this.expandedReactions.add(messageId);
        }
    }

    isReactionsExpanded(messageId: string): boolean {
        return this.expandedReactions.has(messageId);
    }

    getVisibleReactions(reactions: any, messageId: string): any {
        if (!reactions) return {};
        const entries = Object.entries(reactions);
        const isExpanded = this.isReactionsExpanded(messageId);
        if (!isExpanded && entries.length > this.REACTION_LIMIT) {
            return Object.fromEntries(entries.slice(0, this.REACTION_LIMIT));
        }
        return reactions;
    }

    getHiddenReactionsCount(reactions: any, messageId: string): number {
        if (!reactions) return 0;
        const count = Object.keys(reactions).length;
        const isExpanded = this.isReactionsExpanded(messageId);
        return !isExpanded && count > this.REACTION_LIMIT ? count - this.REACTION_LIMIT : 0;
    }

    hasMoreThan15Reactions(reactions: any): boolean {
        if (!reactions) return false;
        return Object.keys(reactions).length > 15;
    }

    formatReactionUsers(userIds: string[]): string {
        if (userIds.length === 0) return '';
        const currentUserId = this.firebaseService.currentUser()?.uid;
        const allUsers = this.firebaseService.getAllUsers();
        const names = userIds.map(uid => {
            if (uid === currentUserId) {
                return 'Du';
            }
            const user = allUsers.find(u => u.uid === uid);
            return user ? `${user.firstName} ${user.lastName}` : 'Gelöschter Nutzer';
        });
        if (names.length === 1) {
            return `${names[0]}`;
        }
        const allButLast = names.slice(0, -1).join(', ');
        return `${allButLast} und ${names[names.length - 1]}`;
    }

    isMobileActive() {
        if (window.innerWidth < 1240) { return true }
        else { return false }
    }
}