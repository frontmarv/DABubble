import { Component, inject, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FirebaseService } from '../../services/firebase.service';
import { Channel } from '../../models/channel.class';
import { DisplayForeignUserService } from '../../services/display-foreign-user.service';
import { ChatService } from '../../services/chat.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  chat = inject(ChatService);
  firebaseService = inject(FirebaseService);
  displayForeignUserService = inject(DisplayForeignUserService);
  @Output() mobileNavigation = new EventEmitter<void>();

  channelsOpen = false;
  dmOpen = true;
  isCreateChannelOpen = false;
  isAddPeopleOpen = false;

  channelName = '';
  channelDescription = '';
  addPeopleOption: string = 'all';

  memberSearch = '';
  filteredMembers: any[] = [];
  selectedMembers: any[] = [];

  private tempChannelName = '';
  private tempChannelDescription = '';

  isCreating = false;

  displayAllUsersSidebar = this.firebaseService.getAllUsers;

  selectChannel(channelId: string) {
    this.firebaseService.setSelectedChannel(channelId);
    this.mobileNavigation.emit();
  }

  selectDm(user: any) {
    this.mobileNavigation.emit();
    this.chat.openChatRoom(user);
  }

  openCreateChannel() {
    this.isCreateChannelOpen = true;
  }

  closeCreateChannel() {
    this.isCreateChannelOpen = false;
    this.channelName = '';
    this.channelDescription = '';
    this.tempChannelName = '';
    this.tempChannelDescription = '';
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
    this.channelName = '';
    this.channelDescription = '';
    this.tempChannelName = '';
    this.tempChannelDescription = '';
    this.addPeopleOption = 'all';
    this.memberSearch = '';
    this.filteredMembers = [];
    this.selectedMembers = [];
  }

  filterMembers() {
    const search = this.memberSearch.toLowerCase().trim();
    if (!search) {
      this.filteredMembers = [];
      return;
    }
    const alreadySelected = this.selectedMembers.map((u) => u.uid);
    this.filteredMembers = this.firebaseService.getAllUsers().filter((u: any) => {
      const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
      return fullName.includes(search) && !alreadySelected.includes(u.uid);
    });
  }

  selectMember(user: any) {
    this.selectedMembers.push(user);
    this.memberSearch = '';
    this.filteredMembers = [];
  }

  removeMember(user: any) {
    this.selectedMembers = this.selectedMembers.filter((u) => u.uid !== user.uid);
  }

  async createChannel() {
    if (!this.isAddPeopleOpen || this.isCreating) return;
    if (!this.tempChannelName || this.tempChannelName.trim() === '') return;

    this.isCreating = true;

    try {
      let newChannel = new Channel({
        name: this.tempChannelName,
        description: this.tempChannelDescription,
      });

      const newId = await this.firebaseService.addChannel(newChannel);

      if (newId) {
        if (this.addPeopleOption === 'specific' && this.selectedMembers.length > 0) {
          for (const user of this.selectedMembers) {
            await this.firebaseService.addMemberToChannel(newId, user.uid);
          }
        } else if (this.addPeopleOption === 'all') {
          const allUsers = this.firebaseService.getAllUsers();
          for (const user of allUsers) {
            await this.firebaseService.addMemberToChannel(newId, (user as any).uid);
          }
        }
        this.firebaseService.setSelectedChannel(newId);
      }

      this.isAddPeopleOpen = false;
      this.channelName = '';
      this.channelDescription = '';
      this.tempChannelName = '';
      this.tempChannelDescription = '';
      this.addPeopleOption = 'all';
      this.memberSearch = '';
      this.filteredMembers = [];
      this.selectedMembers = [];

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