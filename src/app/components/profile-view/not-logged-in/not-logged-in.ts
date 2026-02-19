import { Component, EventEmitter, Output } from '@angular/core';
import { FirebaseService } from '../../../services/firebase.service';
import { inject } from '@angular/core';
import { User } from '../../../models/user.class';
import { DisplayForeignUserService } from '../../../services/display-foreign-user.service';

@Component({
  selector: 'app-not-logged-in',
  imports: [],
  templateUrl: './not-logged-in.html',
  styleUrl: './not-logged-in.scss',
})
export class NotLoggedIn {
  displayForeignUserService = inject(DisplayForeignUserService);
  firebaseService = inject(FirebaseService);
  @Output() close = new EventEmitter<void>();

  selectedUser: User | null = null;

  closeProfile(): void {
    this.close.emit();
  }
}
