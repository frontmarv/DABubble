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

  // --- UI STATE ---
  channelsOpen = false;
  dmOpen = true;
  isCreateChannelOpen = false;
  isAddPeopleOpen = false;
  isCreating = false;

  // --- FORM STATE ---
  channelName = '';
  channelDescription = '';
  addPeopleOption = 'all';
  memberSearch = '';
  filteredMembers: any[] = [];
  selectedMembers: any[] = [];

  private tempChannelName = '';
  private tempChannelDescription = '';

  displayAllUsersSidebar = this.firebaseService.getAllUsers;

selectChannel(channelId: string): void {
  this.chat.activeConversation.set(null); 
  this.firebaseService.setSelectedChannel(channelId);
  this.mobileNavigation.emit();

  const uid = this.firebaseService.currentUser()?.uid;
  const channel = this.firebaseService.channels().find(c => c.id === channelId);
  const isMember = channel?.members?.includes(uid) ?? false;

  if (isMember) this.chat.openChannel(channelId);
}

async selectDm(user: any): Promise<void> {
  this.firebaseService.setSelectedChannel(''); 
  this.mobileNavigation.emit();
  await this.chat.openChatRoom(user);
}

  toggleChannels(): void { this.channelsOpen = !this.channelsOpen; }
  toggleDm(): void { this.dmOpen = !this.dmOpen; }

  // --- MODAL MANAGEMENT ---

  openCreateChannel(): void { this.isCreateChannelOpen = true; }
  closeCreateChannel(): void { this.resetCreationState(); }
  closeAddPeople(): void { this.resetCreationState(); }

  proceedToAddMembers(): void {
    if (!this.channelName?.trim()) return;
    this.tempChannelName = this.channelName;
    this.tempChannelDescription = this.channelDescription;
    this.isCreateChannelOpen = false;
    this.isAddPeopleOpen = true;
  }

  private resetCreationState(): void {
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

  // --- MEMBER SEARCH ---

  filterMembers(): void {
    const search = this.memberSearch.toLowerCase().trim();
    this.filteredMembers = search ? this.getMatchingMembers(search) : [];
  }

  private getMatchingMembers(search: string): any[] {
    const selected = this.selectedMembers.map((u) => u.uid);
    return this.firebaseService.getAllUsers().filter((u: any) => {
      return `${u.firstName} ${u.lastName}`.toLowerCase().includes(search)
        && !selected.includes(u.uid);
    });
  }

  selectMember(user: any): void {
    this.selectedMembers.push(user);
    this.memberSearch = '';
    this.filteredMembers = [];
  }

  removeMember(user: any): void {
    this.selectedMembers = this.selectedMembers.filter((u) => u.uid !== user.uid);
  }

  async createChannel(): Promise<void> {
    if (!this.isAddPeopleOpen || this.isCreating || !this.tempChannelName?.trim()) return;
    this.isCreating = true;
    try {
      const newId = await this.firebaseService.addChannel(
        new Channel({ name: this.tempChannelName, description: this.tempChannelDescription })
      );
      if (newId) await this.handleNewChannelMembers(newId);
      this.resetCreationState();
    } catch (e) {
      console.error('Fehler beim Erstellen des Channels:', e);
    } finally {
      this.isCreating = false;
    }
  }

  private async handleNewChannelMembers(newId: string): Promise<void> {
    if (this.addPeopleOption === 'specific' && this.selectedMembers.length) {
      await this.addSpecificMembers(newId);
    } else if (this.addPeopleOption === 'all') {
      await this.addAllMembers(newId);
    }
    this.firebaseService.setSelectedChannel(newId);
  }

  private async addSpecificMembers(newId: string): Promise<void> {
    for (const user of this.selectedMembers) {
      await this.firebaseService.addMemberToChannel(newId, user.uid);
    }
  }

  private async addAllMembers(newId: string): Promise<void> {
    for (const user of this.firebaseService.getAllUsers()) {
      await this.firebaseService.addMemberToChannel(newId, (user as any).uid);
    }
  }

  isDmActive(user: any): boolean {
    const active = this.chat.activeConversation();
    if (!active || active.mode !== 'dm') return false;
    return active.id === this.buildDmChatId(user);
  }

  private buildDmChatId(user: any): string {
    const currentUid = this.firebaseService.currentUser()?.uid || '';
    return [currentUid, user.uid].sort().join('_');
  }
}