import { Component, EventEmitter, Output } from '@angular/core';
import { FirebaseService } from '../../../services/firebase.service';
import { inject } from '@angular/core';
import { User } from '../../../models/user.class';
import { DisplayForeignUserService } from '../../../services/display-foreign-user.service';
import { ChatService } from '../../../services/chat.service';

@Component({
  selector: 'app-not-logged-in',
  imports: [],
  templateUrl: './not-logged-in.html',
  styleUrl: '../profile-view.scss',
})
export class NotLoggedIn {
  displayForeignUserService = inject(DisplayForeignUserService);
  firebaseService = inject(FirebaseService);
  chat = inject(ChatService);
  @Output() close = new EventEmitter<void>();
  @Output() mobileNavigation = new EventEmitter<void>();

  selectedUser: User | null = null;

  closeProfile(): void {
    this.close.emit();
  }

  selectDm(user: any) {
    this.mobileNavigation.emit();
    this.chat.openChatRoom(user);
  }

}
