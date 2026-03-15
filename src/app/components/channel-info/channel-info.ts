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

  closeModal() {
    this.close.emit();
  }

  getMember(uid: string) {
    const users = this.firebaseService.getAllUsers();
    if (!users) return null;
    return users.find(u => u.uid === uid) || null;
  }

  async leaveChannel() {
    const currentUid = this.firebaseService.currentUser()?.uid;
    if (this.channel?.id && currentUid) {
      try {
        await this.firebaseService.removeMemberFromChannel(this.channel.id, currentUid);
      } catch (error) {
        console.error('Fehler beim Verlassen des Channels:', error);
      }
    }
    this.closeModal();
  }

  toggleEditChannelName() {
    if (this.editChannelNameMode()) {
      this.saveChannelName();
    } else {
      this.channelNameError.set(''); 
      this.editChannelNameInput.set(this.channel?.name || '');
      this.editChannelNameMode.set(true);
    }
  }

  toggleEditChannelDesc() {
    if (this.editChannelDescMode()) {
      this.saveChannelDesc();
    } else {
      const currentDesc = this.channel?.description || 
        'Dieser Channel ist für alles rund um dieses Thema. Hier kannst du zusammen mit deinem Team Meetings abhalten, Dokumente teilen und Entscheidungen treffen.';
      this.editChannelDescInput.set(currentDesc);
      this.editChannelDescMode.set(true);
    }
  }

  async saveChannelName() {
    const newName = this.editChannelNameInput().trim();
    if (this.channel && newName.length > 0) {
      if (newName === this.channel.name) {
        this.editChannelNameMode.set(false);
        return;
      }
      const nameExists = this.firebaseService.channels().some(
        (c: any) => c.name.toLowerCase() === newName.toLowerCase()
      );
      if (nameExists) {
        this.channelNameError.set('Dieser Channel existiert bereits.');
        return; 
      }
      this.channelNameError.set(''); 
      try {
        await this.firebaseService.updateChannel(this.channel.id, { name: newName });
      } catch (e) {
        console.error(e);
      }
    }
    this.editChannelNameMode.set(false);
  }

  async saveChannelDesc() {
    const newDesc = this.editChannelDescInput().trim();
    if (this.channel && newDesc !== this.channel.description) {
      try {
        await this.firebaseService.updateChannel(this.channel.id, { description: newDesc });
      } catch (e) {
        console.error(e);
      }
    }
    this.editChannelDescMode.set(false);
  }
}