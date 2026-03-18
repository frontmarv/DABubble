import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User } from '../../models/user.class';
import { FirebaseService } from '../../services/firebase.service';
import { ChatService } from '../../services/chat.service';
import { ThreadStateService } from '../../services/thread-state.service';

@Component({
  selector: 'app-profile-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile-view.html',
  styleUrls: ['./profile-view.scss'],
})
export class ProfileView implements OnChanges {
  firebaseService = inject(FirebaseService);
  chatService = inject(ChatService);
  threadService = inject(ThreadStateService);

  @Input() user: User | null = null;
  @Output() close = new EventEmitter<void>();

  isEditing = false;
  fullName = '';
  errorMessage = '';
  isInputValid = true;
  selectedAvatar = '';

  readonly availableAvatars: string[] = [
    '/shared/profile-pics/profile-pic1.svg',
    '/shared/profile-pics/profile-pic2.svg',
    '/shared/profile-pics/profile-pic3.svg',
    '/shared/profile-pics/profile-pic4.svg',
    '/shared/profile-pics/profile-pic5.svg',
    '/shared/profile-pics/profile-pic6.svg',
  ];

  /**
   * Detects input changes to reset the view when a new user is provided.
   * @param changes - The object containing changed properties.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['user'] && this.user && !this.isEditing) {
      this.resetProfileView();
    }
  }

  /**
   * Closes the profile view, shuts down any active threads,
   * and opens a direct chat with the current profile user.
   */
  async onMessageUser(): Promise<void> {
    if (!this.user) return;
    this.threadService.setHidden();
    this.closeProfile();
    await this.chatService.openChatRoom(this.user);
  }

  /**
   * Closes the profile view and resets the editing state.
   */
  closeProfile(): void {
    this.isEditing = false;
    this.close.emit();
  }

  /**
   * Activates the editing mode, setzt den aktuellen Avatar als Vorauswahl.
   */
  editProfile(): void {
    this.isEditing = true;
    if (this.user && !this.fullName.trim()) {
      this.fullName = this.buildFullName(this.user);
    }
    this.selectedAvatar = this.getAvatarUrl(this.user?.avatar);
    this.validateFullName(this.fullName);
  }

  /**
   * Setzt den ausgewählten Avatar im Edit-Modus.
   * @param avatar - Der Pfad des gewählten Avatars.
   */
  selectAvatar(avatar: string): void {
    this.selectedAvatar = avatar;
  }

  /**
   * Prüft ob ein Avatar gerade ausgewählt ist (für CSS-Klasse im Template).
   * @param avatar - Der zu prüfende Avatar-Pfad.
   */
  isAvatarSelected(avatar: string): boolean {
    return this.selectedAvatar === avatar;
  }

  /**
   * Discards changes and returns to the read-only view.
   */
  cancelEdit(): void {
    this.resetProfileView();
    this.isEditing = false;
    this.errorMessage = '';
  }

  /**
   * Synchronizes the input field and avatar with the current user data.
   */
  private resetProfileView(): void {
    this.fullName = this.user ? this.buildFullName(this.user) : '';
    this.selectedAvatar = this.getAvatarUrl(this.user?.avatar);
    this.validateFullName(this.fullName);
  }

  /**
   * Validates input and updates the user profile in the database.
   */
  async saveProfile(): Promise<void> {
    this.validateFullName(this.fullName);
    if (this.isInputValid) {
      await this.updateUserInDb();
      this.closeProfile();
    }
  }

  /**
   * Speichert Name UND Avatar gemeinsam in einem einzigen Firestore-Update.
   */
  private async updateUserInDb(): Promise<void> {
    const currentUser = this.firebaseService.currentUser();
    if (currentUser?.uid) {
      const nameData = this.splitFullName(this.fullName);
      await this.firebaseService.updateSingleUser(currentUser.uid, {
        ...nameData,
        avatar: this.selectedAvatar,
      });
    }
  }

  /**
   * Validates the name length and updates the validation state.
   * @param value - The raw string value from the input.
   */
  validateFullName(value: string): void {
    const trimmed = (value ?? '').trim();
    this.isInputValid = trimmed.length > 1 && trimmed.length <= 30;
    this.setValidationMessage(trimmed.length);
  }

  /**
   * Sets the appropriate error message based on the input length.
   * @param length - The length of the trimmed input string.
   */
  private setValidationMessage(length: number): void {
    if (length === 0) {
      this.errorMessage = 'Bitte Name eingeben';
    } else if (length > 30) {
      this.errorMessage = 'Name darf maximal 30 Zeichen haben';
    } else {
      this.errorMessage = '';
    }
  }

  /**
   * Concatenates first and last name into a single string.
   */
  private buildFullName(user: User): string {
    const first = user.firstName ?? '';
    const last = user.lastName ?? '';
    return `${first} ${last}`.trim();
  }

  /**
   * Splits a full name string into first and last name components.
   */
  private splitFullName(fullName: string): { firstName: string; lastName: string } {
    const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { firstName: '', lastName: '' };
    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(' ')
    };
  }

  /**
   * Resolves the correct path for the user's avatar image.
   */
  getAvatarUrl(avatar?: string | null): string {
    if (!avatar) return '/shared/profile-pics/profile-pic1.svg';
    if (avatar.startsWith('http')) return avatar;
    const cleanFile = this.sanitizeAvatarPath(avatar);
    return `/shared/profile-pics/${cleanFile}`;
  }

  /**
   * Removes redundant folder paths from the avatar string.
   */
  private sanitizeAvatarPath(path: string): string {
    return path
      .replace(/^\/?shared\/profile-pics\//, '')
      .replace(/^profile-pics\//, '');
  }
}