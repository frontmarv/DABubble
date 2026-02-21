import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageList } from "./message-list/message-list";
import { MessageComposer } from "./message-composer/message-composer";
import { ChatService } from '../../services/chat.service';
import { DisplayForeignUserService } from '../../services/display-foreign-user.service';
import { FirebaseService } from '../../services/firebase.service';

@Component({
  selector: 'app-chat',
  imports: [MessageList, MessageComposer, FormsModule],
  templateUrl: './main-chat.html',
  styleUrl: './main-chat.scss',
})
export class MainChat {
  chat = inject(ChatService);
  displayForeignUserService = inject(DisplayForeignUserService);
  firebaseService = inject(FirebaseService);

  currentChannel = computed(() => {
    const id = this.firebaseService.selectedChannelId(); 
    if (!id) return null;
    return this.firebaseService.channels.find((c: any) => c.id === id) ?? null;
  });

  showMembersModal = false;
  showAddPeopleModal = false;
  addPersonSearch = '';
  filteredUsers: any[] = [];
  selectedUsers: any[] = [];
  isAddingMembers = false;

  channelMembers = computed(() => {
    const channel = this.currentChannel();
    if (!channel) return [];
    const allUsers = this.firebaseService.getAllUsers();
    if (!channel.members || channel.members.length === 0) return allUsers;
    return allUsers.filter((u: any) => channel.members.includes(u.uid));
  });

  getVisibleMembers(): any[] {
    return this.channelMembers().slice(0, 3);
  }

  getMemberCount(): number {
    return this.channelMembers().length;
  }

  openMembersModal() {
    this.showMembersModal = true;
    this.showAddPeopleModal = false;
  }

  closeMembersModal() {
    this.showMembersModal = false;
  }

  switchToAddPeople() {
    this.showMembersModal = false;
    this.openAddPeopleModal();
  }

  openAddPeopleModal() {
    this.showAddPeopleModal = true;
    this.showMembersModal = false;
    this.addPersonSearch = '';
    this.filteredUsers = [];
    this.selectedUsers = [];
  }

  closeAddPeopleModal() {
    this.showAddPeopleModal = false;
    this.addPersonSearch = '';
    this.filteredUsers = [];
    this.selectedUsers = [];
  }

  openChannelInfo() {
    // Placeholder: open channel details / edit modal
  }

  filterUsers() {
    const search = this.addPersonSearch.toLowerCase().trim();
    if (!search) {
      this.filteredUsers = [];
      return;
    }
    const alreadyMembers = this.channelMembers().map((m: any) => m.uid);
    const alreadySelected = this.selectedUsers.map((u: any) => u.uid);
    this.filteredUsers = this.firebaseService.getAllUsers().filter((u: any) => {
      const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
      return (
        fullName.includes(search) &&
        !alreadyMembers.includes(u.uid) &&
        !alreadySelected.includes(u.uid)
      );
    });
  }

  selectUser(user: any) {
    this.selectedUsers.push(user);
    this.addPersonSearch = '';
    this.filteredUsers = [];
  }

  removeSelectedUser(user: any) {
    this.selectedUsers = this.selectedUsers.filter((u) => u.uid !== user.uid);
  }

  async addMembersToChannel() {
    const channel = this.currentChannel();
    if (!channel || this.selectedUsers.length === 0) return;

    this.isAddingMembers = true;
    try {
      for (const user of this.selectedUsers) {
        await this.firebaseService.addMemberToChannel(channel.id, user.uid);
      }
      this.closeAddPeopleModal();
    } catch (e) {
      console.error(e);
    } finally {
      this.isAddingMembers = false;
    }
  }
}