import { Injectable, signal, inject } from '@angular/core';
import { FirebaseService } from './firebase.service';

/**
 * Service responsible for managing the state of the emoji picker and 
 * handling the logic for message reactions, including limits and user formatting.
 */
@Injectable({
  providedIn: 'root'
})
export class EmojiPickerStateService {
  private firebaseService = inject(FirebaseService);

  /** * Determines the number of reactions shown before collapsing based on screen width. 
   * @returns {number} 7 for mobile devices, 15 for desktop.
   */
  get REACTION_LIMIT(): number {
    return typeof window !== 'undefined' && window.innerWidth < 700 ? 5 : 10;
  }

  /** Set of message IDs that currently have their reactions list expanded. */
  expandedReactions = new Set<string>();

  /** Signal to track the global visibility of the emoji picker component. */
  isEmojiPickerVisible = signal(false);

  /**
   * Toggles the visibility state of the emoji picker.
   */
  toggle(): void {
    this.isEmojiPickerVisible.set(!this.isEmojiPickerVisible());
  }

  /**
   * Explicitly hides the emoji picker.
   */
  setHidden(): void {
    this.isEmojiPickerVisible.set(false);
  }

  /**
   * Explicitly shows the emoji picker.
   */
  setVisible(): void {
    this.isEmojiPickerVisible.set(true);
  }

  /**
   * Toggles the expanded/collapsed state for the reaction list of a specific message.
   * @param messageId - The unique ID of the message.
   */
  toggleReactionsExpanded(messageId: string): void {
    if (this.expandedReactions.has(messageId)) {
      this.expandedReactions.delete(messageId);
    } else {
      this.expandedReactions.add(messageId);
    }
  }

  /**
   * Checks if the reactions for a specific message are currently expanded.
   * @param messageId - The ID of the message.
   * @returns {boolean}
   */
  isReactionsExpanded(messageId: string): boolean {
    return this.expandedReactions.has(messageId);
  }

  /**
   * Returns a subset of reactions based on whether the message is expanded or the limit is reached.
   * @param reactions - The raw reactions object from the database.
   * @param messageId - The ID of the message.
   * @returns {any} A filtered or complete reactions object.
   */
  getVisibleReactions(reactions: any, messageId: string): any {
    if (!reactions) return {};
    const entries = Object.entries(reactions);
    const isExpanded = this.isReactionsExpanded(messageId);

    if (!isExpanded && entries.length > this.REACTION_LIMIT) {
      return Object.fromEntries(entries.slice(0, this.REACTION_LIMIT));
    }
    return reactions;
  }

  /**
   * Calculates how many reactions are currently hidden for a message.
   * @param reactions - The raw reactions object.
   * @param messageId - The ID of the message.
   * @returns {number} The count of hidden reactions.
   */
  getHiddenReactionsCount(reactions: any, messageId: string): number {
    if (!reactions) return 0;
    const count = Object.keys(reactions).length;
    const isExpanded = this.isReactionsExpanded(messageId);
    return !isExpanded && count > this.REACTION_LIMIT ? count - this.REACTION_LIMIT : 0;
  }

  /**
   * Utility to check if a reaction list exceeds the maximum desktop limit (15).
   * @param reactions - The reactions object to check.
   * @returns {boolean}
   */
  hasMoreThan15Reactions(reactions: any): boolean {
    if (!reactions) return false;
    return Object.keys(reactions).length > 10;
  }

  /**
   * Formats a list of UIDs into a readable string of names for tooltips.
   * Replaces the current user's UID with 'Du' and handles deleted users.
   * @param userIds - Array of UIDs who reacted.
   * @returns {string} Formatted string like "Name1, Name2 und Name3".
   */
  formatReactionUsers(userIds: string[]): string {
    if (userIds.length === 0) return '';
    const currentUserId = this.firebaseService.currentUser()?.uid;
    const allUsers = this.firebaseService.getAllUsers();

    const names = userIds.map(uid => this.resolveName(uid, currentUserId, allUsers));

    if (names.length === 1) return names[0];
    const allButLast = names.slice(0, -1).join(', ');
    return `${allButLast} und ${names[names.length - 1]}`;
  }

  /**
   * Resolves a single UID to a display name.
   * @private
   */
  private resolveName(uid: string, currentUserId: string | undefined, allUsers: any[]): string {
    if (uid === currentUserId) return 'Du';
    const user = allUsers.find(u => u.uid === uid);
    if (user) return `${user.firstName} ${user.lastName}`;
    return allUsers.length > 0 ? 'Gelöschter Nutzer' : 'Laden...';
  }

  /**
   * Checks if the current window width is considered "mobile" for layout decisions.
   * @returns {boolean} True if width is below 1240px.
   */
  isMobileActive(): boolean {
    return typeof window !== 'undefined' && window.innerWidth < 1240;
  }
}