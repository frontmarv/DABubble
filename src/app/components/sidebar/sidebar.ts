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
  // --- INJECTIONS & OUTPUTS ---
  chat = inject(ChatService);
  firebaseService = inject(FirebaseService);
  displayForeignUserService = inject(DisplayForeignUserService);
  @Output() mobileNavigation = new EventEmitter<void>();

  // --- UI STATE ---
  channelsOpen = false;
  dmOpen = true;
  isCreateChannelOpen = false;
  isAddPeopleOpen = false;
  isCreating = false;

  // --- FORM STATE ---
  channelName = '';
  channelDescription = '';
  addPeopleOption: string = 'all';
  private tempChannelName = '';
  private tempChannelDescription = '';

  // --- MEMBER SEARCH STATE ---
  memberSearch = '';
  filteredMembers: any[] = [];
  selectedMembers: any[] = [];

  displayAllUsersSidebar = this.firebaseService.getAllUsers;

  // --- NAVIGATION ---

  selectChannel(channelId: string) {
    this.firebaseService.setSelectedChannel(channelId);
    this.mobileNavigation.emit();
    this.chat.openChannel(channelId);
  }

  selectDm(user: any) {
    this.mobileNavigation.emit();
    this.chat.openChatRoom(user);
  }

  toggleChannels() {
    this.channelsOpen = !this.channelsOpen;
  }

  toggleDm() {
    this.dmOpen = !this.dmOpen;
  }

  // --- MODAL MANAGEMENT & FORM RESET ---

  openCreateChannel() {
    this.isCreateChannelOpen = true;
  }

  closeCreateChannel() {
    this.resetCreationState();
  }

  closeAddPeople() {
    this.resetCreationState();
  }

  private resetCreationState() {
    this.isCreateChannelOpen = false;
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

  proceedToAddMembers() {
    if (!this.channelName?.trim()) return;
    this.tempChannelName = this.channelName;
    this.tempChannelDescription = this.channelDescription;
    
    this.isCreateChannelOpen = false;
    this.isAddPeopleOpen = true;
  }

  // --- MEMBER SEARCH & FILTERING ---

  filterMembers() {
    const search = this.memberSearch.toLowerCase().trim();
    if (!search) {
      this.filteredMembers = [];
      return;
    }
    this.filteredMembers = this.getMatchingMembers(search);
  }

  private getMatchingMembers(search: string): any[] {
    const alreadySelected = this.selectedMembers.map((u) => u.uid);
    return this.firebaseService.getAllUsers().filter((u: any) => {
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

  // --- CHANNEL CREATION LOGIC ---

  async createChannel() {
    if (!this.isValidForCreation()) return;

    this.isCreating = true;
    try {
      const newId = await this.saveNewChannel();
      if (newId) await this.handleNewChannelMembers(newId);
      this.resetCreationState();
    } catch (error) {
      console.error('Fehler beim Erstellen des Channels:', error);
    } finally {
      this.isCreating = false;
    }
  }

  private isValidForCreation(): boolean {
    return Boolean(this.isAddPeopleOpen && !this.isCreating && this.tempChannelName?.trim());
  }

  private async saveNewChannel(): Promise<string | null> {
    const newChannel = new Channel({
      name: this.tempChannelName,
      description: this.tempChannelDescription,
    });
    return await this.firebaseService.addChannel(newChannel);
  }

  private async handleNewChannelMembers(newId: string) {
    if (this.addPeopleOption === 'specific' && this.selectedMembers.length > 0) {
      await this.addSpecificMembers(newId);
    } else if (this.addPeopleOption === 'all') {
      await this.addAllMembers(newId);
    }
    this.firebaseService.setSelectedChannel(newId);
  }

  private async addSpecificMembers(newId: string) {
    for (const user of this.selectedMembers) {
      await this.firebaseService.addMemberToChannel(newId, user.uid);
    }
  }

  private async addAllMembers(newId: string) {
    const allUsers = this.firebaseService.getAllUsers();
    for (const user of allUsers) {
      await this.firebaseService.addMemberToChannel(newId, (user as any).uid);
    }
  }
}