import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageList } from "./message-list/message-list";
import { MessageComposer } from "./message-composer/message-composer";
import { ChatService } from '../../services/chat.service';
import { DisplayForeignUserService } from '../../services/display-foreign-user.service';
import { FirebaseService } from '../../services/firebase.service';
import { ChannelInfo } from '../channel-info/channel-info'; 

@Component({
  selector: 'app-chat',
  imports: [MessageList, MessageComposer, FormsModule, ChannelInfo],
  templateUrl: './main-chat.html',
  styleUrl: './main-chat.scss',
})
export class MainChat {
  chat = inject(ChatService);
  displayForeignUserService = inject(DisplayForeignUserService);
  firebaseService = inject(FirebaseService);

  // --- SIGNALS & COMPUTED ---

  currentChannel = computed(() => {
    const id = this.firebaseService.selectedChannelId(); 
    if (!id) return null;
    return this.firebaseService.channels().find((c: any) => c.id === id) ?? null;
  });

  channelMembers = computed(() => {
    const channel = this.currentChannel();
    if (!channel) return [];
    const allUsers = this.firebaseService.getAllUsers();
    if (!channel.members || channel.members.length === 0) return allUsers;
    return allUsers.filter((u: any) => channel.members.includes(u.uid));
  });

  showMembersModal = signal(false);
  showAddPeopleModal = signal(false);
  showChannelInfoModal = signal(false);
  isAddingMembers = signal(false);
  
  addPersonSearch = signal('');
  filteredUsers = signal<any[]>([]);
  selectedUsers = signal<any[]>([]);

  // --- VIEW HELPER ---

  getVisibleMembers(): any[] {
    return this.channelMembers().slice(0, 3);
  }

  getMemberCount(): number {
    return this.channelMembers().length;
  }

  // --- MODAL MANAGEMENT ---

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
    this.resetAddPeopleState();
  }

  closeAddPeopleModal() {
    this.showAddPeopleModal.set(false);
    this.resetAddPeopleState();
  }

  private resetAddPeopleState() {
    this.addPersonSearch.set('');
    this.filteredUsers.set([]);
    this.selectedUsers.set([]);
  }

  openChannelInfo() {
    this.showChannelInfoModal.set(true);
  }

  closeChannelInfo() {
    this.showChannelInfoModal.set(false);
  }

  // --- USER SEARCH & FILTERING ---

  filterUsers() {
    const search = this.addPersonSearch().toLowerCase().trim();
    if (!search) {
      this.filteredUsers.set([]);
      return;
    }
    this.filteredUsers.set(this.getMatchingUsers(search));
  }

  private getMatchingUsers(search: string): any[] {
    const excludedIds = this.getExcludedUserIds();
    return this.firebaseService.getAllUsers().filter((u: any) => 
      this.isUserMatchingSearch(u, search) && !excludedIds.includes(u.uid)
    );
  }

  private getExcludedUserIds(): string[] {
    const channel = this.currentChannel();
    const channelMemberIds = channel?.members || [];
    const selectedUserIds = this.selectedUsers().map((u: any) => u.uid);
    return [...channelMemberIds, ...selectedUserIds];
  }

  private isUserMatchingSearch(user: any, search: string): boolean {
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
    return fullName.includes(search);
  }

  selectUser(user: any) {
    this.selectedUsers.update(users => [...users, user]);
    this.addPersonSearch.set('');
    this.filteredUsers.set([]);
  }

  removeSelectedUser(user: any) {
    this.selectedUsers.update(users => users.filter((u) => u.uid !== user.uid));
  }

  // --- ADDING MEMBERS ---

  async addMembersToChannel() {
    const channel = this.currentChannel();
    if (!channel || this.selectedUsers().length === 0) return;
    
    this.isAddingMembers.set(true);
    await this.processMemberAdditions(channel);
    this.finalizeMemberAddition();
  }

  private async processMemberAdditions(channel: any) {
    try {
      if (!channel.members || channel.members.length === 0) {
        await this.addAllExistingUsersToChannel(channel.id);
      }
      await this.addSelectedUsersToChannel(channel.id);
    } catch (e) {
      console.error('Fehler beim Hinzufügen von Mitgliedern:', e);
    }
  }

  private async addAllExistingUsersToChannel(channelId: string) {
    const allUsers = this.firebaseService.getAllUsers();
    for (const user of allUsers) {
      await this.firebaseService.addMemberToChannel(channelId, (user as any).uid);
    }
  }

  private async addSelectedUsersToChannel(channelId: string) {
    for (const user of this.selectedUsers()) {
      await this.firebaseService.addMemberToChannel(channelId, user.uid);
    }
  }

  private finalizeMemberAddition() {
    this.closeAddPeopleModal();
    this.isAddingMembers.set(false);
  }
}