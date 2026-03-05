import { Injectable, inject, signal } from '@angular/core';
import { Firestore, collection, addDoc, onSnapshot, query, doc, setDoc, getDoc, updateDoc, arrayUnion, Unsubscribe, getDocs, collectionGroup } from '@angular/fire/firestore';
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
  channels = signal<any[]>([]);
  selectedChannelId = signal<string>('');

  chats: any[] = [];
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
    const docRef = doc(this.firestore, 'users', uid);
    const snap = await getDoc(docRef);
    return snap.exists() ? new User(snap.data()) : null;
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
    const mappedChannels = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
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
    const results: { channelId: string; channelName: string; messageId: string; text: string }[] = [];
    const lowerTerm = term.toLowerCase();
    const currentChannels = this.channels();

    const searchPromises = currentChannels.map(async (channel) => {
      try {
        const messagesRef = collection(this.firestore, 'channels', channel.id, 'messages');
        const snapshot = await getDocs(messagesRef);

        snapshot.forEach((msgDoc) => {
          const data = msgDoc.data();
          const text: string = data['text'] ?? '';
          if (text.toLowerCase().includes(lowerTerm)) {
            results.push({
              channelId: channel.id,
              channelName: channel.name,
              messageId: msgDoc.id,
              text,
            });
          }
        });
      } catch (err) {
        console.error(`Fehler beim Suchen in Channel ${channel.id}:`, err);
      }
    });

    await Promise.all(searchPromises);
    return results;
  }

  subChats(): void {
    this.unsubChats?.();
    const q = query(collection(this.firestore, 'chats'));
    this.unsubChats = onSnapshot(q, (snap) => this.updateChatsState(snap));
  }

  private updateChatsState(snap: any): void {
    this.chats = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
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