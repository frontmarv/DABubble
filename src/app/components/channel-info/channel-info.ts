import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirebaseService } from '../../services/firebase.service';

@Component({
  selector: 'app-channel-info',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './channel-info.html',
  styleUrl: './channel-info.scss'
})
export class ChannelInfo {
  @Input({ required: true }) channel: any;
  @Output() close = new EventEmitter<void>();

  firebaseService = inject(FirebaseService);

  editChannelNameMode = signal(false);
  editChannelDescMode = signal(false);
  editChannelNameInput = signal('');
  editChannelDescInput = signal('');
  channelNameError = signal('');

  /**
   * Emits the close event to hide the modal.
   */
  closeModal(): void {
    this.close.emit();
  }


  /**
   * Retrieves a user object from the database by their UID.
   * @param uid - The unique identifier of the user.
   * @returns The user object if found, otherwise null.
   */
  getMember(uid: string): any | null {
    const users = this.firebaseService.getAllUsers();
    if (!users) return null;
    return users.find(u => u.uid === uid) || null;
  }


  /**
   * Removes the current user from the active channel and closes the modal.
   */
  async leaveChannel(): Promise<void> {
    const currentUid = this.firebaseService.currentUser()?.uid;
    if (this.channel?.id && currentUid) {
      await this.executeLeaveProcess(this.channel.id, currentUid);
    }
    this.closeModal();
  }


  /**
   * Internal helper to handle the Firebase removal process.
   * @param channelId - ID of the channel to leave.
   * @param uid - UID of the member to remove.
   */
  private async executeLeaveProcess(channelId: string, uid: string): Promise<void> {
    try {
      await this.firebaseService.removeMemberFromChannel(channelId, uid);
    } catch (error) {
      console.error('Error leaving channel:', error);
    }
  }

  /**
   * Toggles the edit mode for the channel name or saves the changes.
   */
  toggleEditChannelName(): void {
    if (this.editChannelNameMode()) {
      this.saveChannelName();
    } else {
      this.enterEditNameMode();
    }
  }

  /**
   * Prepares the state signals to enter name editing mode.
   */
  private enterEditNameMode(): void {
    this.channelNameError.set('');
    this.editChannelNameInput.set(this.channel?.name || '');
    this.editChannelNameMode.set(true);
  }


  /**
   * Toggles the edit mode for the channel description or saves the changes.
   */
  toggleEditChannelDesc(): void {
    if (this.editChannelDescMode()) {
      this.saveChannelDesc();
    } else {
      this.enterEditDescMode();
    }
  }

  /**
   * Prepares the state signals to enter description editing mode.
   */
  private enterEditDescMode(): void {
    const defaultDesc = '';
    const currentDesc = this.channel?.description || defaultDesc;
    this.editChannelDescInput.set(currentDesc);
    this.editChannelDescMode.set(true);
  }

 /**
   * Validates and saves the new channel name to Firebase.
   */
 async saveChannelName(): Promise<void> {
  const newName = this.editChannelNameInput().trim();
  
  // NEU: TypeScript Limit-Check zur Sicherheit
  if (newName.length > 30) {
    this.channelNameError.set('Der Name darf maximal 30 Zeichen lang sein.');
    return;
  }

  if (this.isNameUpdateRequired(newName)) {
    await this.processNameUpdate(newName);
  } else {
    this.editChannelNameMode.set(false);
  }
}
  /**
   * Checks if the name has changed and is valid.
   * @param newName - The trimmed input name.
   */
  private isNameUpdateRequired(newName: string): boolean {
    return !!(this.channel && newName.length > 0 && newName !== this.channel.name);
  }

  /**
   * Performs the actual Firebase update after checking for duplicates.
   * @param newName - The validated new channel name.
   */
  private async processNameUpdate(newName: string): Promise<void> {
    if (this.isChannelNameDuplicate(newName)) {
      this.channelNameError.set('Dieser Channel existiert bereits.');
      return;
    }
    await this.updateChannelNameInFirebase(newName);
    this.editChannelNameMode.set(false);
  }

  /**
   * Checks if a channel with the given name already exists.
   * @param name - Name to check.
   */
  private isChannelNameDuplicate(name: string): boolean {
    return this.firebaseService.channels().some(
      (c: any) => c.name.toLowerCase() === name.toLowerCase()
    );
  }

  /**
   * Direct Firebase call to update the name field.
   */
  private async updateChannelNameInFirebase(name: string): Promise<void> {
    try {
      await this.firebaseService.updateChannel(this.channel.id, { name: name });
      this.channelNameError.set('');
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * Saves the new channel description to Firebase.
   */
  async saveChannelDesc(): Promise<void> {
    const newDesc = this.editChannelDescInput().trim();
    if (this.channel && newDesc !== this.channel.description) {
      await this.updateChannelDescInFirebase(newDesc);
    }
    this.editChannelDescMode.set(false);
  }

  /**
   * Direct Firebase call to update the description field.
   */
  private async updateChannelDescInFirebase(description: string): Promise<void> {
    try {
      await this.firebaseService.updateChannel(this.channel.id, { description });
    } catch (e) {
      console.error(e);
    }
  }
}