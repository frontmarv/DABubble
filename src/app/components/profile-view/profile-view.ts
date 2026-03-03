import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User } from '../../models/user.class';
import { FirebaseService } from '../../services/firebase.service';

@Component({
  selector: 'app-profile-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile-view.html',
  styleUrls: ['./profile-view.scss'],
})
export class ProfileView implements OnChanges {
  firebaseService = inject(FirebaseService);

  @Input() user: User | null = null;
  @Output() close = new EventEmitter<void>();

  isEditing = false;
  fullName = '';
  errorMessage = '';
  isInputValid = true;

  // --- LIFECYCLE ---

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['user'] && this.user && !this.isEditing) {
      this.resetProfileView();
    }
  }

  // --- VIEW ACTIONS ---

  closeProfile(): void {
    this.isEditing = false;
    this.close.emit();
  }

  editProfile(): void {
    this.isEditing = true;
    if (this.user && !this.fullName.trim()) {
      this.fullName = this.buildFullName(this.user);
    }
    this.validateFullName(this.fullName);
  }

  cancelEdit(): void {
    this.resetProfileView();
    this.isEditing = false;
  }

  private resetProfileView(): void {
    this.fullName = this.user ? this.buildFullName(this.user) : '';
    this.validateFullName(this.fullName);
  }

  // --- SAVING ---

  async saveProfile(): Promise<void> {
    this.validateFullName(this.fullName);
    if (!this.isInputValid) return;
    
    await this.updateUserInDb();
    this.closeProfile();
  }

  private async updateUserInDb(): Promise<void> {
    const currentUser = this.firebaseService.currentUser();
    if (!currentUser?.uid) return;

    // Destructuring: Die Funktion wird nur noch EINMAL aufgerufen
    const { firstName, lastName } = this.splitFullName(this.fullName);
    await this.firebaseService.updateSingleUser(currentUser.uid, { firstName, lastName });
  }

  // --- VALIDATION & STRING MANIPULATION ---

  validateFullName(value: string): void {
    const trimmed = (value ?? '').trim();
    this.isInputValid = trimmed.length > 1 && trimmed.length <= 30;
    this.updateErrorMessage(trimmed.length);
  }

  private updateErrorMessage(length: number): void {
    if (length < 2) {
      this.errorMessage = 'Bitte Name eingeben';
    } else if (length > 30) {
      this.errorMessage = 'Name darf maximal 30 Zeichen haben';
    } else {
      this.errorMessage = '';
    }
  }

  private buildFullName(user: User): string {
    return `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  }

  private splitFullName(fullName: string): { firstName: string; lastName: string } {
    const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { firstName: '', lastName: '' };
    
    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(' ')
    };
  }

  // --- UTILS ---

  getAvatarUrl(avatar?: string | null): string {
    if (!avatar) return '/shared/profile-pics/profile-pic1.svg';
    if (avatar.startsWith('http')) return avatar;

    const file = avatar.replace(/^\/?shared\/profile-pics\//, '').replace(/^profile-pics\//, '');
    return `/shared/profile-pics/${file}`;
  }
}