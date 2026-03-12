import { Injectable, inject, signal } from '@angular/core';
import { Firestore, collection, addDoc, onSnapshot, query, doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove, Unsubscribe, getDocs, collectionGroup } from '@angular/fire/firestore';
import { User } from '../models/user.class';
import { Channel } from '../models/channel.class';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { Chat } from '../models/chat.class';

@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  public firestore = inject(Firestore);

  currentUser = signal<User | null>(null);
  channels = signal<Channel[]>([]);
  selectedChannelId = signal<string>('');

  chats: Chat[] = [];
  currentChannelName: string = 'Allgemein';
  currentChatName: string = 'Allgemein';
  selectedChatId: string = '';

  unsubUser: Unsubscribe | null = null;
  unsubChannels: Unsubscribe | null = null;
  unsubChats: Unsubscribe | null = null;

  constructor() {
    this.subChannels();
    this.subChats();
  }

  ngOnDestroy(): void {
    if (this.unsubChannels) this.unsubChannels();
    if (this.unsubUser) this.unsubUser();
    if (this.unsubChats) this.unsubChats();
  }

  async removeMemberFromChannel(channelId: string, uid: string): Promise<void> {
    try {
      const channelRef = doc(this.firestore, 'channels', channelId);
      await updateDoc(channelRef, { members: arrayRemove(uid) });
    } catch (error) {
      console.error('Fehler beim Entfernen des Mitglieds:', error);
    }
  }

  async checkUserExists(uid: string): Promise<boolean> {
    const docRef = doc(this.firestore, 'users', uid);
    const snap = await getDoc(docRef);
    return snap.exists();
  }

  subUser(uid: string): void {
    this.unsubUser?.();
    const docRef = doc(this.firestore, 'users', uid);
    this.unsubUser = onSnapshot(docRef, (snap) => this.handleUserSnapshot(snap));
  }

  private handleUserSnapshot(snap: any): void {
    const data = snap.data();
    this.currentUser.set(data ? new User(data) : null);
  }

  async addUser(user: User, uid: string): Promise<void> {
    const docRef = doc(this.firestore, 'users', uid);
    await setDoc(docRef, user.toJSON(), { merge: true })
      .catch((err) => console.error('Fehler beim User-Erstellen:', err));
  }

  async getSingleUser(uid: string): Promise<User | null> {
    if (!uid) {
      console.warn('getSingleUser wurde ohne UID aufgerufen.');
      return this.getDeletedUserFallback('unknown');
    }

    try {
      const docRef = doc(this.firestore, 'users', uid); 
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        return new User(snap.data());
      } else {
        return this.getDeletedUserFallback(uid);
      }
    } catch (error) {
      console.error('Fehler beim Abrufen des Users:', error);
      return this.getDeletedUserFallback(uid);
    }
  }

  private getDeletedUserFallback(uid: string): User {
    return new User({
      uid: uid,
      firstName: 'Gelöschter',
      lastName: 'Nutzer',
      email: '',
      avatar: '/shared/profile-pics/unkown-user.svg',
      status: 'offline'
    });
  }

  async updateSingleUser(uid: string, userData: any): Promise<void> {
    const docRef = doc(this.firestore, 'users', uid);
    await setDoc(docRef, userData, { merge: true });
  }

  subChannels(): void {
    this.unsubChannels?.();
    const q = query(collection(this.firestore, 'channels'));
    this.unsubChannels = onSnapshot(q, (snap) => this.updateChannelsState(snap));
  }

  private updateChannelsState(snap: any): void {
    const mappedChannels = snap.docs.map((d: any) => new Channel({ id: d.id, ...d.data() }));
    this.channels.set(mappedChannels);
  }

  setSelectedChannel(id: string): void {
    this.selectedChannelId.set(id);
    this.updateCurrentChannelName(id);
  }

  private updateCurrentChannelName(id: string): void {
    const channel = this.channels().find((c) => c.id === id);
    if (channel) {
      this.currentChannelName = channel.name;
    }
  }

  async addChannel(channel: Channel): Promise<string | null> {
    const data = this.prepareChannelData(channel);
    return await this.saveChannelToFirestore(data);
  }

  private prepareChannelData(channel: Channel): any {
    const data: any = channel.toJSON ? channel.toJSON() : { ...channel };
    data.createdAt = Date.now();
    return data;
  }

  private async saveChannelToFirestore(data: any): Promise<string | null> {
    try {
      const docRef = await addDoc(collection(this.firestore, 'channels'), data);
      return docRef.id;
    } catch (err) {
      console.error('Fehler beim Erstellen des Channels:', err);
      return null;
    }
  }

  async addMemberToChannel(channelId: string, uid: string): Promise<void> {
    const channelRef = doc(this.firestore, 'channels', channelId);
    await updateDoc(channelRef, { members: arrayUnion(uid) });
  }

  async updateChannel(channelId: string, data: any): Promise<void> {
    try {
      const channelRef = doc(this.firestore, 'channels', channelId);
      await updateDoc(channelRef, data);
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Channels:', error);
    }
  }

  async searchMessagesInChannels(term: string): Promise<{ channelId: string; channelName: string; messageId: string; text: string }[]> {
    try {
      const snapshot = await this.fetchAllMessages();
      return this.filterMessagesByTerm(snapshot, term.toLowerCase());
    } catch (err) {
      console.error('Fehler bei der globalen Suche:', err);
      return [];
    }
  }

  private async fetchAllMessages() {
    const q = query(collectionGroup(this.firestore, 'messages'));
    return await getDocs(q);
  }

  private filterMessagesByTerm(snapshot: any, lowerTerm: string) {
    const results: any[] = [];
    snapshot.forEach((doc: any) => {
      const match = this.createMessageResult(doc, lowerTerm);
      if (match) results.push(match);
    });
    return results;
  }

  private createMessageResult(doc: any, lowerTerm: string) {
    const text = (doc.data()['text'] ?? '');
    if (!text.toLowerCase().includes(lowerTerm)) return null;

    const channel = this.findChannelForMessage(doc);
    if (!channel) return null;

    return { channelId: channel.id, channelName: channel.name, messageId: doc.id, text };
  }

  private findChannelForMessage(doc: any): Channel | undefined {
    const parentChannelId = doc.ref.parent.parent?.id;
    return this.channels().find(c => c.id === parentChannelId);
  }

  subChats(): void {
    this.unsubChats?.();
    const q = query(collection(this.firestore, 'chats'));
    this.unsubChats = onSnapshot(q, (snap) => this.updateChatsState(snap));
  }

  private updateChatsState(snap: any): void {
    this.chats = snap.docs.map((d: any) => new Chat({ id: d.id, ...d.data() }));
  }

  async addChat(chat: Chat): Promise<void> {
    const chatRef = doc(this.firestore, 'chats', chat.id);
    await setDoc(chatRef, chat.toJSON());
  }

  private users = new Observable<User[]>((observer) => {
    const q = query(collection(this.firestore, 'users'));
    const unsubscribe = onSnapshot(q,
      (snap) => observer.next(snap.docs.map((d) => new User(d.data()))),
      (error) => observer.error(error)
    );
    return () => unsubscribe();
  });

  readonly getAllUsers = toSignal(this.users, { initialValue: [] as User[] });
}