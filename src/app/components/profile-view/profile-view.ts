import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User } from '../../models/user.class'; 
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-profile-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile-view.html',
  styleUrl: './profile-view.scss',
})
export class ProfileView {
  @Input() user: User | null = null; 
  @Output() close = new EventEmitter<void>();
  
  isEditing = false;
  fullName: string = ''; 

  constructor(private userService: UserService) {}

  editProfile() {
    if (this.user) {
      this.fullName = `${this.user.firstName} ${this.user.lastName}`.trim(); 
    }
    this.isEditing = true;
  }

  cancelEdit() {
    this.isEditing = false;
  }

  saveProfile() {
    if (this.user && this.fullName.trim()) {
      const parts = this.fullName.trim().split(' '); 
      this.user.firstName = parts[0]; 
      this.user.lastName = parts.length > 1 ? parts.slice(1).join(' ') : ''; 
      
      this.userService.updateUser(this.user); 
    }
    this.isEditing = false;
  }

  closeProfile() {
    this.close.emit();
    this.isEditing = false;
  }
}