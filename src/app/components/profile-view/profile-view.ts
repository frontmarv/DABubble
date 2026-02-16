import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { User } from '../../models/user.class';
import { FirebaseService } from '../../services/firebase.service';
import { inject } from '@angular/core';

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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['user'] && this.user && !this.isEditing) {
      this.fullName = this.buildFullName(this.user);
      this.validateFullName(this.fullName);
    }
  }

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
    if (this.user) {
      this.fullName = this.buildFullName(this.user);
    } else {
      this.fullName = '';
    }

    this.validateFullName(this.fullName);
    this.isEditing = false;
  }

  saveProfile(): void {
    this.validateFullName(this.fullName);
    if (!this.isInputValid) return;
    else {
      const currentUser = this.firebaseService.currentUser();
      this.firebaseService.updateSingleUser(currentUser?.uid ?? '', {
        firstName: this.splitFullName(this.fullName).firstName,
        lastName: this.splitFullName(this.fullName).lastName,
      });
      this.isEditing = false;
    }

  }

  validateFullName(value: string): void {
    const trimmed = (value ?? '').trim();

    this.isInputValid = trimmed.length > 1 && trimmed.length <= 30;

    if (trimmed.length < 1) {
      this.errorMessage = 'Bitte Name eingeben';
    } else if (trimmed.length > 30) {
      this.errorMessage = 'Name darf maximal 30 Zeichen haben';
    } else {
      this.errorMessage = '';
    }
  }

  private buildFullName(user: User): string {
    const first = user.firstName ?? '';
    const last = user.lastName ?? '';
    return `${first} ${last}`.trim();
  }

  private splitFullName(fullName: string): { firstName: string; lastName: string } {
    const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { firstName: '', lastName: '' };
    if (parts.length === 1) return { firstName: parts[0], lastName: '' };

    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ');
    return { firstName, lastName };
  }

  getAvatarUrl(avatar?: string | null): string {
    const fallback = '/shared/profile-pics/profile-pic1.svg';
    if (!avatar) return fallback;
    if (avatar.startsWith('http')) return avatar;

    const file = avatar
      .replace(/^\/?shared\/profile-pics\//, '')
      .replace(/^profile-pics\//, '');

    return `/shared/profile-pics/${file}`;
  }
}