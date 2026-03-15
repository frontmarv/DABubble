import { Injectable, inject, signal } from '@angular/core';
import { 
  Firestore, collection, addDoc, onSnapshot, query, doc, 
  setDoc, getDoc, updateDoc, arrayUnion, arrayRemove, 
  Unsubscribe, getDocs, collectionGroup 
} from '@angular/fire/firestore';
import { User } from '../models/user.class';
import { Channel } from '../models/channel.class';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { Chat } from '../models/chat.class';

/**
 * Service responsible for all direct interactions with Firebase Firestore.
 * Handles real-time subscriptions for users, channels, and chats.
 */
@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  public firestore = inject(Firestore);

  /** Signal holding the currently authenticated and observed user. */
  currentUser = signal<User | null>(null);
  /** Signal holding the list of all available channels. */
  channels = signal<Channel[]>([]);
  /** Signal tracking the currently active channel ID. */
  selectedChannelId = signal<string>('');

  chats: Chat[] = [];
  currentChannelName: string = 'Allgemein';
  currentChatName: string = 'Allgemein';
  selectedChatId: string = '';

  unsubUser: Unsubscribe | null = null;
  unsubChannels: Unsubscribe | null = null;
  unsubChats: Unsubscribe | null = null;

  /**
   * Initializes real-time listeners for channels and chats on service creation.
   */
  constructor() {
    this.subChannels();
    this.subChats();
  }

  /**
   * Cleans up all active Firebase subscriptions when the service is destroyed.
   */
  ngOnDestroy(): void {
    if (this.unsubChannels) this.unsubChannels();
    if (this.unsubUser) this.unsubUser();
    if (this.unsubChats) this.unsubChats();
  }

  /**
   * Removes a specific user from a channel's member list.
   * @param channelId - The ID of the target channel.
   * @param uid - The unique ID of the user to remove.
   */
  async removeMemberFromChannel(channelId: string, uid: string): Promise<void> {
    try {
      const channelRef = doc(this.firestore, 'channels', channelId);
      await updateDoc(channelRef, { members: arrayRemove(uid) });
    } catch (error) {
      console.error('Error removing member:', error);
    }
  }

  /**
   * Checks if a user document exists within the Firestore 'users' collection.
   * @param uid - The unique ID of the user.
   */
  async checkUserExists(uid: string): Promise<boolean> {
    const docRef = doc(this.firestore, 'users', uid);
    const snap = await getDoc(docRef);
    return snap.exists();
  }

  /**
   * Subscribes to real-time updates for a specific user document.
   * @param uid - The unique ID of the user to observe.
   */
  subUser(uid: string): void {
    this.unsubUser?.();
    const docRef = doc(this.firestore, 'users', uid);
    this.unsubUser = onSnapshot(docRef, (snap) => this.handleUserSnapshot(snap));
  }

  /**
   * Maps user document data to the currentUser signal.
   */
  private handleUserSnapshot(snap: any): void {
    const data = snap.data();
    this.currentUser.set(data ? new User(data) : null);
  }

  /**
   * Adds a new user document or merges data into an existing one.
   * @param user - The User object.
   * @param uid - Target document ID.
   */
  async addUser(user: User, uid: string): Promise<void> {
    const docRef = doc(this.firestore, 'users', uid);
    await setDoc(docRef, user.toJSON(), { merge: true })
      .catch((err) => console.error('Error creating user:', err));
  }

  /**
   * Retrieves data for a single user. Returns a fallback object if user is not found.
   * @param uid - The unique ID of the user.
   */
  async getSingleUser(uid: string): Promise<User | null> {
    if (!uid) return this.getDeletedUserFallback('unknown');
    try {
      const docRef = doc(this.firestore, 'users', uid); 
      const snap = await getDoc(docRef);
      return snap.exists() ? new User(snap.data()) : this.getDeletedUserFallback(uid);
    } catch (error) {
      return this.getDeletedUserFallback(uid);
    }
  }

  /**
   * Generates a fallback User object for UI consistency when a user has been deleted.
   */
  private getDeletedUserFallback(uid: string): User {
    return new User({
      uid: uid, firstName: 'Gelöschter', lastName: 'Nutzer', email: '',
      avatar: '/shared/profile-pics/unkown-user.svg', status: 'offline'
    });
  }

  /**
   * Updates specific fields for a user document.
   */
  async updateSingleUser(uid: string, userData: any): Promise<void> {
    const docRef = doc(this.firestore, 'users', uid);
    await setDoc(docRef, userData, { merge: true });
  }

  /**
   * Starts a real-time listener for the entire 'channels' collection.
   */
  subChannels(): void {
    this.unsubChannels?.();
    const q = query(collection(this.firestore, 'channels'));
    this.unsubChannels = onSnapshot(q, (snap) => this.updateChannelsState(snap));
  }

  /**
   * Updates the channels signal with the latest Firestore snapshot.
   */
  private updateChannelsState(snap: any): void {
    const mappedChannels = snap.docs.map((d: any) => new Channel({ id: d.id, ...d.data() }));
    this.channels.set(mappedChannels);
  }

  /**
   * Selects a channel and synchronizes the current channel name.
   */
  setSelectedChannel(id: string): void {
    this.selectedChannelId.set(id);
    this.updateCurrentChannelName(id);
  }

  /**
   * Updates the currentChannelName property based on the selected ID.
   */
  private updateCurrentChannelName(id: string): void {
    const channel = this.channels().find((c) => c.id === id);
    if (channel) {
      this.currentChannelName = channel.name;
    }
  }

  /**
   * Saves a new channel to Firestore.
   * @returns {Promise<string | null>} The generated ID of the new channel.
   */
  async addChannel(channel: Channel): Promise<string | null> {
    const data = this.prepareChannelData(channel);
    try {
      const docRef = await addDoc(collection(this.firestore, 'channels'), data);
      return docRef.id;
    } catch (err) {
      return null;
    }
  }

  /**
   * Prepares raw data for channel storage.
   */
  private prepareChannelData(channel: Channel): any {
    const data: any = channel.toJSON ? channel.toJSON() : { ...channel };
    data.createdAt = Date.now();
    return data;
  }

  /**
   * Adds a user to the member list of an existing channel.
   */
  async addMemberToChannel(channelId: string, uid: string): Promise<void> {
    const channelRef = doc(this.firestore, 'channels', channelId);
    await updateDoc(channelRef, { members: arrayUnion(uid) });
  }

  /**
   * Updates generic channel data in Firestore.
   */
  async updateChannel(channelId: string, data: any): Promise<void> {
    try {
      const channelRef = doc(this.firestore, 'channels', channelId);
      await updateDoc(channelRef, data);
    } catch (error) {
      console.error('Error updating channel:', error);
    }
  }

  /**
   * Executes a global search for a term across all messages in all channels.
   * Uses collectionGroup to query sub-collections named 'messages'.
   */
  async searchMessagesInChannels(term: string): Promise<any[]> {
    try {
      const q = query(collectionGroup(this.firestore, 'messages'));
      const snapshot = await getDocs(q);
      return this.filterMessagesByTerm(snapshot, term.toLowerCase());
    } catch (err) {
      return [];
    }
  }

  /**
   * Filters a snapshot of messages for a search term.
   */
  private filterMessagesByTerm(snapshot: any, lowerTerm: string) {
    const results: any[] = [];
    snapshot.forEach((doc: any) => {
      const match = this.createMessageResult(doc, lowerTerm);
      if (match) results.push(match);
    });
    return results;
  }

  /**
   * Creates a result object if a message contains the search term.
   */
  private createMessageResult(doc: any, lowerTerm: string) {
    const text = (doc.data()['text'] ?? '');
    if (!text.toLowerCase().includes(lowerTerm)) return null;

    const channel = this.findChannelForMessage(doc);
    if (!channel) return null;

    return { channelId: channel.id, channelName: channel.name, messageId: doc.id, text };
  }

  /**
   * Identifies the parent channel of a specific message document.
   */
  private findChannelForMessage(doc: any): Channel | undefined {
    const parentChannelId = doc.ref.parent.parent?.id;
    return this.channels().find(c => c.id === parentChannelId);
  }

  /**
   * Starts a real-time listener for the 'chats' collection.
   */
  subChats(): void {
    this.unsubChats?.();
    const q = query(collection(this.firestore, 'chats'));
    this.unsubChats = onSnapshot(q, (snap) => this.updateChatsState(snap));
  }

  /**
   * Updates the internal chats list.
   */
  private updateChatsState(snap: any): void {
    this.chats = snap.docs.map((d: any) => new Chat({ id: d.id, ...d.data() }));
  }

  /**
   * Adds or updates a direct message chat document.
   */
  async addChat(chat: Chat): Promise<void> {
    const chatRef = doc(this.firestore, 'chats', chat.id);
    await setDoc(chatRef, chat.toJSON());
  }

  /**
   * Observable stream of all users, used to feed the getAllUsers signal.
   */
  private users = new Observable<User[]>((observer) => {
    const q = query(collection(this.firestore, 'users'));
    const unsubscribe = onSnapshot(q,
      (snap) => observer.next(snap.docs.map((d) => new User(d.data()))),
      (error) => observer.error(error)
    );
    return () => unsubscribe();
  });

  /** signal representing all users in the system. */
  readonly getAllUsers = toSignal(this.users, { initialValue: [] as User[] });
}