import { Component, inject, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FirebaseService } from '../../services/firebase.service';
import { Channel } from '../../models/channel.class';
import { MainChat } from '../chat/main-chat';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [FormsModule], 
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  chat = inject(MainChat);
  firebaseService = inject(FirebaseService);
  @Output() mobileNavigation = new EventEmitter<void>();

  channelsOpen = false;
  dmOpen = true;
  isCreateChannelOpen = false;
  isAddPeopleOpen = false;

  channelName = "";
  channelDescription = "";
  addPeopleOption: string = 'all';

  private tempChannelName = "";
  private tempChannelDescription = "";

  isCreating = false;

  usersToDisplay = this.firebaseService.getAllUsers;
  constructor() {
    this.logUsers();
  }

  logUsers() {
    console.log(this.usersToDisplay());
  }

  selectChannel(channelId: string) {
    this.firebaseService.setSelectedChannel(channelId);
    this.mobileNavigation.emit();
  }

  selectDm() {
    this.mobileNavigation.emit();
  }

  openCreateChannel() {
    this.isCreateChannelOpen = true;
  }

  closeCreateChannel() {
    this.isCreateChannelOpen = false;
    this.channelName = "";
    this.channelDescription = "";
    this.tempChannelName = "";
    this.tempChannelDescription = "";
  }

  proceedToAddMembers() {
    if (!this.channelName || this.channelName.trim() === '') return;

    this.tempChannelName = this.channelName;
    this.tempChannelDescription = this.channelDescription;

    this.isCreateChannelOpen = false;
    this.isAddPeopleOpen = true;
  }

  closeAddPeople() {
    this.isAddPeopleOpen = false;
    this.channelName = "";
    this.channelDescription = "";
    this.tempChannelName = "";
    this.tempChannelDescription = "";
    this.addPeopleOption = 'all';
  }

  async createChannel() {
    if (!this.isAddPeopleOpen || this.isCreating) return;
    if (!this.tempChannelName || this.tempChannelName.trim() === '') return;

    this.isCreating = true;

    try {
      let newChannel = new Channel({
        name: this.tempChannelName,
        description: this.tempChannelDescription
      });

      const newId = await this.firebaseService.addChannel(newChannel);

      if (newId) {
        this.firebaseService.setSelectedChannel(newId);
      }

      this.isAddPeopleOpen = false;
      this.channelName = "";
      this.channelDescription = "";
      this.tempChannelName = "";
      this.tempChannelDescription = "";
      this.addPeopleOption = 'all';

    } catch (error) {
      console.error(error);
    } finally {
      this.isCreating = false;
    }
  }

  toggleChannels() { 
    this.channelsOpen = !this.channelsOpen; 
  }

  toggleDm() { 
    this.dmOpen = !this.dmOpen; 
  }
}