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

  // --- RESPONSIVE STATE ---
  windowWidth = signal(typeof window !== 'undefined' ? window.innerWidth : 1300);
  isMobile = computed(() => this.windowWidth() <= 1240);

  // --- STATE SIGNALS ---
  newMessageSearch = signal('');
  newMessageResults = signal<any[]>([]);
  showMembersModal = signal(false);
  showAddPeopleModal = signal(false);
  showChannelInfoModal = signal(false);
  isAddingMembers = signal(false);
  addPersonSearch = signal('');
  filteredUsers = signal<any[]>([]);
  selectedUsers = signal<any[]>([]);

  /**
   * Lauscht auf Fenstergrößenänderungen für das responsive Design.
   */
  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    this.windowWidth.set(window.innerWidth);
  }

  /**
   * Initialisiert die Fensterbreite beim Start der Komponente.
   */
  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      this.windowWidth.set(window.innerWidth);
    }
  }

  // --- COMPUTED PROPERTIES ---

  /** Berechnet den aktuell ausgewählten Channel anhand der ID. */
  currentChannel = computed(() => {
    const id = this.firebaseService.selectedChannelId();
    if (!id) return null;
    return this.firebaseService.channels().find((c: any) => c.id === id) ?? null;
  });

  /** Berechnet alle Mitglieder des aktuellen Channels. */
  channelMembers = computed(() => {
    const channel = this.currentChannel();
    if (!channel) return [];
    const allUsers = this.firebaseService.getAllUsers();
    if (!channel.members?.length) return allUsers;
    return allUsers.filter((u: any) => channel.members.includes(u.uid));
  });

  /** Prüft, ob der aktuell eingeloggte Nutzer Mitglied im offenen Channel ist. */
  isCurrentUserMember = computed(() => {
    const channel = this.currentChannel();
    const uid = this.firebaseService.currentUser()?.uid;
    return (uid && channel?.members?.includes(uid)) ?? false;
  });


  // --- NEUE NACHRICHT LOGIK ---

  /**
   * Verarbeitet die Eingabe im "Neue Nachricht"-Suchfeld.
   * @param term Der eingegebene Suchbegriff.
   */
  onNewMessageSearch(term: string): void {
    this.newMessageSearch.set(term);
    const search = term.toLowerCase().trim();

    if (!search) {
      this.clearSearch();
    } else {
      this.newMessageResults.set(this.getSearchResults(search));
    }
  }

  /**
   * Ermittelt die Suchergebnisse basierend auf dem Präfix (@ oder #).
   * @param search Der formatierte Suchstring.
   * @returns Ein Array mit passenden Nutzern und/oder Channels.
   */
  private getSearchResults(search: string): any[] {
    if (search.startsWith('@')) return this.searchUsers(search.slice(1));
    if (search.startsWith('#')) return this.searchChannels(search.slice(1));
    return [...this.searchUsers(search), ...this.searchChannels(search)];
  }

  /**
   * Sucht nach Nutzern, deren Namen mit der Suchanfrage übereinstimmen.
   * @param query Die Suchanfrage ohne Präfix.
   * @returns Array mit formatierten Nutzer-Objekten.
   */
  private searchUsers(query: string): any[] {
    return this.firebaseService.getAllUsers()
      .filter((u: any) => this.isUserMatch(u, query))
      .map(u => ({ ...u, type: 'user' }));
  }

  /**
   * Prüft, ob Vor- und Nachname eines Nutzers den Suchbegriff enthalten.
   * @param user Das zu prüfende Nutzer-Objekt.
   * @param query Der Suchbegriff.
   * @returns True, wenn der Name übereinstimmt.
   */
  private isUserMatch(user: any, query: string): boolean {
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
    return fullName.includes(query);
  }

  /**
   * Sucht nach Channels, deren Namen mit der Suchanfrage übereinstimmen.
   * @param query Die Suchanfrage ohne Präfix.
   * @returns Array mit formatierten Channel-Objekten.
   */
  private searchChannels(query: string): any[] {
    return this.firebaseService.channels()
      .filter((c: any) => c.name.toLowerCase().includes(query))
      .map(c => ({ ...c, type: 'channel' }));
  }

  /**
   * Wird aufgerufen, wenn der Nutzer ein Ergebnis aus dem Dropdown auswählt.
   * @param item Der ausgewählte Nutzer oder Channel.
   */
  selectSearchResult(item: any): void {
    this.openSelectedTarget(item);
    this.clearSearch();
  }

  /**
   * Öffnet basierend auf dem Typ (Nutzer/Channel) den passenden Chat.
   * @param item Das zu öffnende Element.
   */
  private openSelectedTarget(item: any): void {
    if (item.type === 'user') {
      this.chat.openChatRoom(item);
    } else {
      this.firebaseService.setSelectedChannel(item.id);
      this.chat.openChannel(item.id);
    }
  }

  /**
   * Setzt das Suchfeld und die Dropdown-Ergebnisse zurück.
   */
  private clearSearch(): void {
    this.newMessageSearch.set('');
    this.newMessageResults.set([]);
  }


  // --- VIEW HELPERS ---

  /** Gibt die ersten 3 Mitglieder für die Vorschau-Avatare zurück. */
  getVisibleMembers(): any[] { 
    return this.channelMembers().slice(0, 3); 
  }

  /** Gibt die Gesamtanzahl der Channel-Mitglieder zurück. */
  getMemberCount(): number { 
    return this.channelMembers().length; 
  }


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

  /** Setzt den Status des "Leute hinzufügen"-Modals zurück. */
  private resetAddPeopleState(): void {
    this.addPersonSearch.set('');
    this.filteredUsers.set([]);
    this.selectedUsers.set([]);
  }


  // --- ADD MEMBERS LOGIK ---

  /**
   * Filtert die Nutzerliste basierend auf der Eingabe im "Leute hinzufügen"-Modal.
   */
  filterUsers(): void {
    const search = this.addPersonSearch().toLowerCase().trim();
    this.filteredUsers.set(search ? this.getMatchingUsers(search) : []);
  }

  /**
   * Ermittelt alle Nutzer, die auf die Suchanfrage passen und noch nicht ausgewählt/im Channel sind.
   * @param search Der Suchbegriff.
   * @returns Array von passenden Nutzern.
   */
  private getMatchingUsers(search: string): any[] {
    const excluded = this.getExcludedUserIds();
    return this.firebaseService.getAllUsers()
      .filter((u: any) => this.isUserMatch(u, search) && !excluded.includes(u.uid));
  }

  /**
   * Sammelt alle UIDs von Nutzern, die bereits im Channel oder in der Auswahl sind.
   * @returns Array von UIDs als Strings.
   */
  private getExcludedUserIds(): string[] {
    return [
      ...(this.currentChannel()?.members ?? []),
      ...this.selectedUsers().map((u: any) => u.uid),
    ];
  }

  /**
   * Fügt einen Nutzer zur temporären Auswahl hinzu.
   * @param user Der ausgewählte Nutzer.
   */
  selectUser(user: any): void {
    this.selectedUsers.update((users) => [...users, user]);
    this.addPersonSearch.set('');
    this.filteredUsers.set([]);
  }

  /**
   * Entfernt einen Nutzer wieder aus der temporären Auswahl.
   * @param user Der zu entfernende Nutzer.
   */
  removeSelectedUser(user: any): void {
    this.selectedUsers.update((users) => users.filter((u) => u.uid !== user.uid));
  }

  /**
   * Speichert alle ausgewählten Nutzer final im aktuellen Channel ab.
   */
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

  /**
   * Lässt den aktuell eingeloggten Nutzer dem Channel beitreten.
   */
  async joinCurrentChannel(): Promise<void> {
    const channel = this.currentChannel();
    const uid = this.firebaseService.currentUser()?.uid;
    if (!channel || !uid) return;
    
    await this.firebaseService.addMemberToChannel(channel.id, uid);
    this.chat.openChannel(channel.id);
  }

  /** Hilfsmethode, um alle registrierten Nutzer einem leeren Channel hinzuzufügen. */
  private async addAllUsers(channelId: string): Promise<void> {
    for (const user of this.firebaseService.getAllUsers()) {
      await this.firebaseService.addMemberToChannel(channelId, (user as any).uid);
    }
  }

  /** Hilfsmethode, um die spezifisch ausgewählten Nutzer dem Channel hinzuzufügen. */
  private async addSelectedUsers(channelId: string): Promise<void> {
    for (const user of this.selectedUsers()) {
      await this.firebaseService.addMemberToChannel(channelId, user.uid);
    }
  }
}