import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // <--- WICHTIG!
import { FirebaseService } from '../../services/firebase.service';
import { Channel } from '../../models/channel.class';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule], 
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  channelsOpen = true;
  dmOpen = true;
  isCreateChannelOpen = false;
  isAddPeopleOpen = false;

  channelName = "";
  channelDescription = "";

  constructor(public firebaseService: FirebaseService) {}

  openCreateChannel() {
    this.isCreateChannelOpen = true;
  }

  closeCreateChannel() {
    this.isCreateChannelOpen = false;
  }

  async addChannel() {
    if (this.channelName.trim().length === 0) {
        return; 
    }

    let newChannel = new Channel({
      name: this.channelName,
      description: this.channelDescription
    });

    const newId = await this.firebaseService.addChannel(newChannel);
    console.log("Erstellt mit ID:", newId);

    if (newId) {
      this.firebaseService.setSelectedChannel(newId);
    }

    this.channelName = "";
    this.channelDescription = "";
    this.closeCreateChannel(); 
  }

  closeAddPeople() { this.isAddPeopleOpen = false; }
  toggleChannels() { this.channelsOpen = !this.channelsOpen; }
  toggleDm() { this.dmOpen = !this.dmOpen; }
}