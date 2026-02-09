import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User } from '../../models/user.class';
import { AuthService } from '../../services/auth.service';
import { FirebaseService } from '../../services/firebase.service';

@Component({
  selector: 'app-profile-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile-view.html',
  styleUrl: './profile-view.scss',
})
export class ProfileView {
  private authService = inject(AuthService);
  private firebaseService = inject(FirebaseService);

  @Input() user: User | null = null;
  @Output() close = new EventEmitter<void>();

  isEditing = false;
  fullName: string = '';

  getAvatarUrl(avatar?: string | null): string {
    const fallback = '/shared/profile-pics/profile-pic1.svg';

    if (!avatar) return fallback;
    if (avatar.startsWith('http://') || avatar.startsWith('https://')) return avatar;

    const file = avatar
      .replace(/^\/?shared\/profile-pics\//, '')
      .replace(/^profile-pics\//, '');

    return `/shared/profile-pics/${file}`;
  }

  editProfile() {
    if (this.user) {
      this.fullName = `${this.user.firstName} ${this.user.lastName}`.trim();
    }
    this.isEditing = true;
  }

  cancelEdit() {
    this.isEditing = false;
  }

  async saveProfile() {
    if (this.user && this.fullName.trim()) {
      const parts = this.fullName.trim().split(' ');
      this.user.firstName = parts[0];
      this.user.lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';

      const uid = this.authService.getCurrentUserId();
      if (uid) {
        await this.firebaseService.addUser(this.user, uid); 
      }
    }
    this.isEditing = false;
  }

  closeProfile() {
    this.close.emit();
    this.isEditing = false;
  }
}