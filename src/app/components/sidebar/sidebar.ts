import { Component, inject, Output, EventEmitter, Input } from '@angular/core';
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

  // --- COMMUNICATION WITH CHAT-ROOM FOR SEARCH ---
  @Input() searchQuery: string = '';
  @Input() filteredResults: any[] = [];
  @Input() showSearchDropdown: boolean = false;

  @Output() searchInput = new EventEmitter<Event>();
  @Output() resultSelect = new EventEmitter<any>();
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
  channelNameError = ''; 
  addPeopleOption = 'all';
  memberSearch = '';
  filteredMembers: any[] = [];
  selectedMembers: any[] = [];

  private tempChannelName = '';
  private tempChannelDescription = '';

  displayAllUsersSidebar = this.firebaseService.getAllUsers;

  /**
   * Resolves the display name for a user, handling deleted or unknown users.
   * @param user - The user object to resolve the name for.
   * @returns {string} The formatted user name.
   */
  getUserName(user: any): string {
    if (!user) return 'Unknown User';
    if (!user.firstName || user.firstName === 'Gelöschter') {
      return 'Deleted User';
    }
    return `${user.firstName} ${user.lastName || ''}`.trim();
  }

  /**
   * Selects a channel and updates the application state to open the respective chat.
   * @param {string} channelId - The unique identifier of the channel.
   */
  selectChannel(channelId: string): void {
    this.chat.activeConversation.set(null); 
    this.firebaseService.setSelectedChannel(channelId);
    this.mobileNavigation.emit();
    this.chat.openChannel(channelId);
  }

  /**
   * Resets selection states to prepare the UI for creating a brand new message.
   */
  createNewMessage(): void {
    this.firebaseService.setSelectedChannel('');
    this.chat.activeConversation.set(null);
    this.mobileNavigation.emit();
  }

  /**
   * Opens a direct message room with a specific user.
   * @param {any} user - The user object to start a DM with.
   * @returns {Promise<void>}
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
   * Validates the channel name and proceeds to the member assignment step.
   * Checks for name uniqueness before continuing.
   */
  proceedToAddMembers(): void {
    const name = this.channelName?.trim();
    if (!name) return;

    const nameExists = this.firebaseService.channels().some(
      (c: any) => c.name.toLowerCase() === name.toLowerCase()
    );

    if (nameExists) {
      this.channelNameError = 'This channel already exists.';
      return; 
    }

    this.channelNameError = ''; 
    this.tempChannelName = name;
    this.tempChannelDescription = this.channelDescription;
    this.isCreateChannelOpen = false;
    this.isAddPeopleOpen = true;
  }

  /**
   * Resets all variables associated with the channel creation process.
   */
  private resetCreationState(): void {
    this.isCreateChannelOpen = false;
    this.isAddPeopleOpen = false;
    this.channelName = '';
    this.channelDescription = '';
    this.tempChannelName = '';
    this.tempChannelDescription = '';
    this.channelNameError = ''; 
    this.addPeopleOption = 'all';
    this.memberSearch = '';
    this.filteredMembers = [];
    this.selectedMembers = [];
  }

  // --- MEMBER SEARCH ---

  /**
   * Filters the user list based on search input for adding members to a channel.
   */
  filterMembers(): void {
    const search = this.memberSearch.toLowerCase().trim();
    this.filteredMembers = search ? this.getMatchingMembers(search) : [];
  }

  /**
   * Retrieves users matching the search term who are not already selected or deleted.
   * @param {string} search - The search term.
   * @returns {any[]} List of matching user objects.
   */
  private getMatchingMembers(search: string): any[] {
    const selected = this.selectedMembers.map((u) => u.uid);
    return this.firebaseService.getAllUsers().filter((u: any) => {
      return `${u.firstName} ${u.lastName}`.toLowerCase().includes(search)
        && u.firstName !== 'Gelöschter' 
        && !selected.includes(u.uid);
    });
  }

  /**
   * Adds a user to the temporary selection list for channel creation.
   * @param {any} user - User to be selected.
   */
  selectMember(user: any): void {
    this.selectedMembers.push(user);
    this.memberSearch = '';
    this.filteredMembers = [];
  }

  /**
   * Removes a user from the temporary selection list.
   * @param {any} user - User to be removed.
   */
  removeMember(user: any): void {
    this.selectedMembers = this.selectedMembers.filter((u) => u.uid !== user.uid);
  }

  /**
   * Orchestrates the creation of a new channel and handles initial member assignment.
   */
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
      console.error('Error creating channel:', e);
    } finally {
      this.isCreating = false;
    }
  }

  /**
   * Decides which members to add to the newly created channel based on user choice.
   * @param {string} newId - The ID of the newly created channel.
   */
  private async handleNewChannelMembers(newId: string): Promise<void> {
    if (this.addPeopleOption === 'specific' && this.selectedMembers.length) {
      await this.addSpecificMembers(newId);
    } else if (this.addPeopleOption === 'all') {
      await this.addAllMembers(newId);
    }
    this.firebaseService.setSelectedChannel(newId);
  }

  /**
   * Adds specifically selected users to the Firestore channel document.
   * @param {string} newId - Channel identifier.
   */
  private async addSpecificMembers(newId: string): Promise<void> {
    for (const user of this.selectedMembers) {
      await this.firebaseService.addMemberToChannel(newId, user.uid);
    }
  }

  /**
   * Adds all existing users (excluding deleted accounts) to the Firestore channel document.
   * @param {string} newId - Channel identifier.
   */
  private async addAllMembers(newId: string): Promise<void> {
    for (const user of this.firebaseService.getAllUsers()) {
      if ((user as any).firstName !== 'Gelöschter') {
        await this.firebaseService.addMemberToChannel(newId, (user as any).uid);
      }
    }
  }

  /**
   * Checks if a DM conversation with a specific user is currently active.
   * @param {any} user - The user to check against.
   * @returns {boolean}
   */
  isDmActive(user: any): boolean {
    const active = this.chat.activeConversation();
    if (!active || active.mode !== 'dm') return false;
    return active.id === this.buildDmChatId(user);
  }

  /**
   * Generates a unique, sorted DM chat ID based on current and target user UIDs.
   * @param {any} user - Target user.
   * @returns {string} The generated chat ID.
   */
  private buildDmChatId(user: any): string {
    const currentUid = this.firebaseService.currentUser()?.uid || '';
    return [currentUid, user.uid].sort().join('_');
  }
}