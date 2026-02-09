import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-profile-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile-view.html',
  styleUrl: './profile-view.scss',
})
export class ProfileView {
  @Input() currentUserName: string = '';
  @Input() userEmail: string = 'fred.beck@email.com'; 
  @Output() close = new EventEmitter<void>();

  isEditing = false;

  closeProfile() {
    this.close.emit();
    this.isEditing = false;
  }

  editProfile() {
    this.isEditing = true;
  }

  cancelEdit() {
    this.isEditing = false;
  }

  saveProfile() {
    this.isEditing = false;
  }
}