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
    return this.firebaseService.channels().find((c: any) => c.id === id) ?? null;
  });

  showMembersModal = signal(false);
  showAddPeopleModal = signal(false);
  addPersonSearch = signal('');
  filteredUsers = signal<any[]>([]);
  selectedUsers = signal<any[]>([]);
  isAddingMembers = signal(false);

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
    this.showMembersModal.set(true);
    this.showAddPeopleModal.set(false);
  }

  closeMembersModal() {
    this.showMembersModal.set(false);
  }

  switchToAddPeople() {
    this.showMembersModal.set(false);
    this.openAddPeopleModal();
  }

  openAddPeopleModal() {
    this.showAddPeopleModal.set(true);
    this.showMembersModal.set(false);
    this.addPersonSearch.set('');
    this.filteredUsers.set([]);
    this.selectedUsers.set([]);
  }

  closeAddPeopleModal() {
    this.showAddPeopleModal.set(false);
    this.addPersonSearch.set('');
    this.filteredUsers.set([]);
    this.selectedUsers.set([]);
  }

  openChannelInfo() {
    // Placeholder: open channel details / edit modal
  }

  filterUsers() {
    const search = this.addPersonSearch().toLowerCase().trim();
    if (!search) {
      this.filteredUsers.set([]);
      return;
    }
    const channel = this.currentChannel();
    const alreadyMemberIds: string[] = (channel?.members && channel.members.length > 0)
      ? channel.members
      : [];
    const alreadySelected = this.selectedUsers().map((u: any) => u.uid);
    const filtered = this.firebaseService.getAllUsers().filter((u: any) => {
      const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
      return (
        fullName.includes(search) &&
        !alreadyMemberIds.includes(u.uid) &&
        !alreadySelected.includes(u.uid)
      );
    });
    this.filteredUsers.set(filtered);
  }

  selectUser(user: any) {
    this.selectedUsers.update(users => [...users, user]);
    this.addPersonSearch.set('');
    this.filteredUsers.set([]);
  }

  removeSelectedUser(user: any) {
    this.selectedUsers.update(users => users.filter((u) => u.uid !== user.uid));
  }

  async addMembersToChannel() {
    const channel = this.currentChannel();
    if (!channel || this.selectedUsers().length === 0) return;
    this.isAddingMembers.set(true);
    try {
      if (!channel.members || channel.members.length === 0) {
        const allUsers = this.firebaseService.getAllUsers();
        for (const user of allUsers) {
          await this.firebaseService.addMemberToChannel(channel.id, (user as any).uid);
        }
      }
      for (const user of this.selectedUsers()) {
        await this.firebaseService.addMemberToChannel(channel.id, user.uid);
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.closeAddPeopleModal();
      this.isAddingMembers.set(false);
    }
  }
}