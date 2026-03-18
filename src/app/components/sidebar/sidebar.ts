import { Component, inject, Output, EventEmitter, Input, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FirebaseService } from '../../services/firebase.service';
import { Channel } from '../../models/channel.class';
import { DisplayForeignUserService } from '../../services/display-foreign-user.service';
import { ChatService } from '../../services/chat.service';

/**
 * Sidebar component managing navigation, search, and channel/DM creation.
 */
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
  
  // NgZone is crucial here to force UI updates after async Firebase calls.
  private zone = inject(NgZone); 

  // --- COMMUNICATION WITH CHAT-ROOM FOR SEARCH ---
  @Input() searchQuery: string = '';
  @Input() filteredResults: any[] = [];
  @Input() showSearchDropdown: boolean = false;

  @Output() searchInput = new EventEmitter<Event>();
  @Output() resultSelect = new EventEmitter<any>();
  @Output() mobileNavigation = new EventEmitter<void>();

  // --- UI & FORM STATE ---
  channelsOpen = false;
  dmOpen = true;
  isCreateChannelOpen = false;
  isAddPeopleOpen = false;
  isCreating = false;

  channelName = '';
  channelDescription = '';
  channelNameError = ''; 
  addPeopleOption = 'all';
  memberSearch = '';
  filteredMembers: any[] = [];
  selectedMembers: any[] = [];

  private tempChannelName = '';
  private tempChannelDescription = '';

  displayAllUsersSidebar = this.firebaseService.getAllUsers;

  // --- UTILITY METHODS ---

  /**
   * Formats the user's name, handling deleted or missing names.
   */
  getUserName(user: any): string {
    if (!user) return 'Unknown User';
    if (user.firstName === 'Gelöschter') return 'Deleted User';
    
    const first = user.firstName || '';
    const last = user.lastName || '';
    return [first, last].filter(Boolean).join(' ');
  }

  /**
   * Cleans up the avatar path for correct rendering.
   */
  getMemberAvatar(avatar?: string | null): string {
    if (!avatar) return '/shared/profile-pics/profile-pic1.svg';
    if (avatar.startsWith('http')) return avatar;
    
    const cleanPath = avatar.replace(/^\/?shared\/profile-pics\//, '').replace(/^profile-pics\//, '');
    return `/shared/profile-pics/${cleanPath}`;
  }

  // --- NAVIGATION METHODS ---

  /**
   * Opens the selected channel in the main chat area.
   */
  selectChannel(channelId: string): void {
    this.chat.activeConversation.set(null); 
    this.firebaseService.setSelectedChannel(channelId);
    this.mobileNavigation.emit();
    this.chat.openChannel(channelId);
  }

  /**
   * Clears current selections to start a new, empty message view.
   */
  createNewMessage(): void {
    this.firebaseService.setSelectedChannel('');
    this.chat.activeConversation.set(null);
    this.mobileNavigation.emit();
  }

  /**
   * Opens a direct message conversation with a specific user.
   */
  async selectDm(user: any): Promise<void> {
    this.firebaseService.setSelectedChannel(''); 
    this.chat.activeConversation.set(null);
    this.mobileNavigation.emit();
    await this.chat.openChatRoom(user);
  }

  toggleChannels(): void { this.channelsOpen = !this.channelsOpen; }
  toggleDm(): void { this.dmOpen = !this.dmOpen; }

  // --- MODAL MANAGEMENT ---

  openCreateChannel(): void { this.isCreateChannelOpen = true; }
  closeCreateChannel(): void { this.resetCreationState(); }
  closeAddPeople(): void { this.resetCreationState(); }

  /**
   * Validates channel name and moves to the "Add Members" step if successful.
   */
  proceedToAddMembers(): void {
    const name = this.channelName?.trim();
    if (!this.isValidName(name)) return;

    this.executeProceed(name);
  }

  /**
   * Checks if the channel name is provided, within length limits, and unique.
   */
  private isValidName(name: string | undefined): boolean {
    if (!name) return false;
    
    if (name.length > 30) {
      this.channelNameError = 'Der Name darf maximal 30 Zeichen lang sein.';
      return false;
    }
    
    if (this.isNameDuplicate(name)) {
      this.channelNameError = 'Dieser Channel existiert bereits.';
      return false; 
    }
    return true;
  }

  /**
   * Verifies if the proposed channel name already exists in the database.
   */
  private isNameDuplicate(name: string): boolean {
    return this.firebaseService.channels().some(
      (c: any) => c.name.toLowerCase() === name.toLowerCase()
    );
  }

  /**
   * Finalizes the transition from "Create" modal to "Add Members" modal.
   */
  private executeProceed(name: string): void {
    this.channelNameError = ''; 
    this.tempChannelName = name;
    this.tempChannelDescription = this.channelDescription;
    this.isCreateChannelOpen = false;
    this.isAddPeopleOpen = true;
  }

  /**
   * Hard resets all variables related to the channel creation flow.
   */
  private resetCreationState(): void {
    this.isCreateChannelOpen = false;
    this.isAddPeopleOpen = false;
    this.addPeopleOption = 'all';
    this.selectedMembers = [];
    this.resetFormFields();
  }

  /**
   * Clears the input fields for channel name and description.
   */
  resetFormFields(): void {
    this.channelName = '';
    this.channelDescription = '';
    this.tempChannelName = '';
    this.tempChannelDescription = '';
    this.channelNameError = '';
    this.memberSearch = '';
    this.filteredMembers = [];
  }

  // --- MEMBER SEARCH LOGIC ---

  /**
   * Triggers the member search filter based on user input.
   */
  filterMembers(): void {
    const search = this.memberSearch.toLowerCase().trim();
    this.filteredMembers = search ? this.getMatchingMembers(search) : [];
  }

  /**
   * Finds users matching the search term, excluding deleted or already selected users.
   */
  private getMatchingMembers(search: string): any[] {
    const selected = this.selectedMembers.map((u) => u.uid);
    return this.firebaseService.getAllUsers().filter((u: any) => {
      const nameMatch = `${u.firstName} ${u.lastName}`.toLowerCase().includes(search);
      const isValidUser = u.firstName !== 'Gelöschter' && !selected.includes(u.uid);
      return nameMatch && isValidUser;
    });
  }

  /**
   * Adds a user to the selected members list and clears the search.
   */
  selectMember(user: any): void {
    this.selectedMembers.push(user);
    this.memberSearch = '';
    this.filteredMembers = [];
  }

  /**
   * Removes a user from the selected members list.
   */
  removeMember(user: any): void {
    this.selectedMembers = this.selectedMembers.filter((u) => u.uid !== user.uid);
  }

  // --- CHANNEL CREATION (REFACTORED) ---

  /**
   * Orchestrates the creation of a new channel (Entry Point).
   */
  async createChannel() {
    const currentUser = this.firebaseService.currentUser();
    if (this.isCreating || !currentUser) return;

    this.isCreating = true;
    const memberIds = this.getChannelMembers(currentUser.uid);
    const newChannel = this.buildNewChannel(currentUser, memberIds);

    await this.saveChannelToFirebase(newChannel);
  }

  /**
   * Determines which members will be added to the new channel based on user choice.
   */
  private getChannelMembers(creatorId: string): string[] {
    if (this.addPeopleOption === 'all') {
      const allUsers = this.firebaseService.getAllUsers();
      return allUsers.filter(u => u.firstName !== 'Gelöschter').map(u => u.uid);
    }
    
    const selectedIds = this.selectedMembers.map(m => m.uid);
    return [...new Set([creatorId, ...selectedIds])];
  }

  /**
   * Constructs the Channel object ready for database insertion.
   */
  private buildNewChannel(user: any, members: string[]): Channel {
    return new Channel({
      name: this.tempChannelName,
      description: this.tempChannelDescription || '',
      creatorId: user.uid,
      creatorName: `${user.firstName} ${user.lastName}`,
      members: members,
      createdAt: Date.now()
    });
  }

  /**
   * Executes the database save and manages success/error states via NgZone.
   */
  private async saveChannelToFirebase(channel: Channel): Promise<void> {
    try {
      const newId = await this.firebaseService.addChannel(channel);
      this.handleCreationSuccess(newId);
    } catch (err) {
      console.error("Fehler beim Erstellen:", err);
      this.zone.run(() => { this.isCreating = false; });
    }
  }

  /**
   * Updates the UI state inside the Angular Zone after successful channel creation.
   */
  private handleCreationSuccess(newId: string | null): void {
    this.zone.run(() => {
      if (newId) this.firebaseService.setSelectedChannel(newId);
      this.resetCreationState();
      this.isCreating = false;
    });
  }

  /**
   * Checks if the currently active view is a DM with the provided user.
   */
  isDmActive(user: any): boolean {
    const active = this.chat.activeConversation();
    if (!active || active.mode !== 'dm') return false;
    return active.id === this.buildDmChatId(user);
  }

  /**
   * Generates a deterministic ID for a DM conversation based on user UIDs.
   */
  private buildDmChatId(user: any): string {
    const currentUid = this.firebaseService.currentUser()?.uid || '';
    return [currentUid, user.uid].sort().join('_');
  }
}