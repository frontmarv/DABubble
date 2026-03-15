import { Component, inject, signal, computed, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageList } from './message-list/message-list';
import { MessageComposer } from './message-composer/message-composer';
import { ChatService } from '../../services/chat.service';
import { DisplayForeignUserService } from '../../services/display-foreign-user.service';
import { FirebaseService } from '../../services/firebase.service';
import { ChannelInfo } from '../channel-info/channel-info';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [MessageList, MessageComposer, FormsModule, ChannelInfo],
  templateUrl: './main-chat.html',
  styleUrl: './main-chat.scss',
})
export class MainChat implements OnInit {
  chat = inject(ChatService);
  displayForeignUserService = inject(DisplayForeignUserService);
  firebaseService = inject(FirebaseService);

  windowWidth = signal(typeof window !== 'undefined' ? window.innerWidth : 1300);
  isMobile = computed(() => this.windowWidth() <= 1240);

  newMessageSearch = signal('');
  newMessageResults = signal<any[]>([]);

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.windowWidth.set(window.innerWidth);
  }

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      this.windowWidth.set(window.innerWidth);
    }
  }

  currentChannel = computed(() => {
    const id = this.firebaseService.selectedChannelId();
    if (!id) return null;
    return this.firebaseService.channels().find((c: any) => c.id === id) ?? null;
  });

  channelMembers = computed(() => {
    const channel = this.currentChannel();
    if (!channel) return [];
    const allUsers = this.firebaseService.getAllUsers();
    if (!channel.members?.length) return allUsers;
    return allUsers.filter((u: any) => channel.members.includes(u.uid));
  });

  isCurrentUserMember = computed(() => {
    const channel = this.currentChannel();
    const uid = this.firebaseService.currentUser()?.uid;
    return (uid && channel?.members?.includes(uid)) ?? false;
  });

  onNewMessageSearch(term: string) {
    this.newMessageSearch.set(term);
    const search = term.toLowerCase().trim();

    if (!search) {
      this.newMessageResults.set([]);
      return;
    }

    if (search.startsWith('@')) {
      const query = search.slice(1);
      this.newMessageResults.set(
        this.firebaseService.getAllUsers()
          .filter((u: any) => (u.firstName + ' ' + u.lastName).toLowerCase().includes(query))
          .map(u => ({ ...u, type: 'user' }))
      );
    } else if (search.startsWith('#')) {
      const query = search.slice(1);
      this.newMessageResults.set(
        this.firebaseService.channels()
          .filter((c: any) => c.name.toLowerCase().includes(query))
          .map(c => ({ ...c, type: 'channel' }))
      );
    } else {
      const users = this.firebaseService.getAllUsers()
        .filter((u: any) => (u.firstName + ' ' + u.lastName).toLowerCase().includes(search))
        .map(u => ({ ...u, type: 'user' }));
      const channels = this.firebaseService.channels()
        .filter((c: any) => c.name.toLowerCase().includes(search))
        .map(c => ({ ...c, type: 'channel' }));
      this.newMessageResults.set([...users, ...channels]);
    }
  }

  selectSearchResult(item: any) {
    if (item.type === 'user') {
      this.chat.openChatRoom(item);
    } else {
      this.firebaseService.setSelectedChannel(item.id);
      this.chat.openChannel(item.id);
    }
    this.newMessageSearch.set('');
    this.newMessageResults.set([]);
  }

  // --- MODAL SIGNALS ---
  showMembersModal = signal(false);
  showAddPeopleModal = signal(false);
  showChannelInfoModal = signal(false);
  isAddingMembers = signal(false);

  addPersonSearch = signal('');
  filteredUsers = signal<any[]>([]);
  selectedUsers = signal<any[]>([]);

  // --- VIEW HELPERS ---
  getVisibleMembers(): any[] { return this.channelMembers().slice(0, 3); }
  getMemberCount(): number { return this.channelMembers().length; }

  // --- MODAL MANAGEMENT ---
  openMembersModal(): void { 
    this.showMembersModal.set(true); 
    this.showAddPeopleModal.set(false); 
  }
  
  closeMembersModal(): void { this.showMembersModal.set(false); }
  openChannelInfo(): void { this.showChannelInfoModal.set(true); }
  closeChannelInfo(): void { this.showChannelInfoModal.set(false); }

  switchToAddPeople(): void {
    this.showMembersModal.set(false);
    this.openAddPeopleModal();
  }

  openAddPeopleModal(): void {
    this.showAddPeopleModal.set(true);
    this.showMembersModal.set(false);
    this.resetAddPeopleState();
  }

  closeAddPeopleModal(): void {
    this.showAddPeopleModal.set(false);
    this.resetAddPeopleState();
  }

  private resetAddPeopleState(): void {
    this.addPersonSearch.set('');
    this.filteredUsers.set([]);
    this.selectedUsers.set([]);
  }

  // --- USER SEARCH ---
  filterUsers(): void {
    const search = this.addPersonSearch().toLowerCase().trim();
    this.filteredUsers.set(search ? this.getMatchingUsers(search) : []);
  }

  private getMatchingUsers(search: string): any[] {
    const excluded = this.getExcludedUserIds();
    return this.firebaseService.getAllUsers()
      .filter((u: any) => this.matchesSearch(u, search) && !excluded.includes(u.uid));
  }

  private getExcludedUserIds(): string[] {
    return [
      ...(this.currentChannel()?.members ?? []),
      ...this.selectedUsers().map((u: any) => u.uid),
    ];
  }

  private matchesSearch(user: any, search: string): boolean {
    return `${user.firstName} ${user.lastName}`.toLowerCase().includes(search);
  }

  selectUser(user: any): void {
    this.selectedUsers.update((users) => [...users, user]);
    this.addPersonSearch.set('');
    this.filteredUsers.set([]);
  }

  removeSelectedUser(user: any): void {
    this.selectedUsers.update((users) => users.filter((u) => u.uid !== user.uid));
  }

  // --- MEMBER MANAGEMENT ---
  async addMembersToChannel(): Promise<void> {
    const channel = this.currentChannel();
    if (!channel || !this.selectedUsers().length) return;
    this.isAddingMembers.set(true);
    try {
      if (!channel.members?.length) await this.addAllUsers(channel.id);
      await this.addSelectedUsers(channel.id);
    } catch (e) {
      console.error('Fehler beim Hinzufügen von Mitgliedern:', e);
    }
    this.closeAddPeopleModal();
    this.isAddingMembers.set(false);
  }

  async joinCurrentChannel(): Promise<void> {
    const channel = this.currentChannel();
    const uid = this.firebaseService.currentUser()?.uid;
    if (!channel || !uid) return;
    await this.firebaseService.addMemberToChannel(channel.id, uid);
    this.chat.openChannel(channel.id);
  }

  private async addAllUsers(channelId: string): Promise<void> {
    for (const user of this.firebaseService.getAllUsers()) {
      await this.firebaseService.addMemberToChannel(channelId, (user as any).uid);
    }
  }

  private async addSelectedUsers(channelId: string): Promise<void> {
    for (const user of this.selectedUsers()) {
      await this.firebaseService.addMemberToChannel(channelId, user.uid);
    }
  }
}