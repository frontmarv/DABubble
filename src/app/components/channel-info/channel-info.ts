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

  closeModal() {
    this.close.emit();
  }

  leaveChannel() {
    console.log('Channel wird verlassen...');
    // Hier später die Austritts-Logik einbauen
    this.closeModal();
  }

  toggleEditChannelName() {
    if (this.editChannelNameMode()) {
      this.saveChannelName();
    } else {
      this.editChannelNameInput.set(this.channel?.name || '');
      this.editChannelNameMode.set(true);
    }
  }

  toggleEditChannelDesc() {
    if (this.editChannelDescMode()) {
      this.saveChannelDesc();
    } else {
      this.editChannelDescInput.set(this.channel?.description || '');
      this.editChannelDescMode.set(true);
    }
  }

  async saveChannelName() {
    const newName = this.editChannelNameInput().trim();
    if (this.channel && newName.length > 0 && newName !== this.channel.name) {
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