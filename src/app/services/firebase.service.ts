import { Injectable, inject, Injector, runInInjectionContext } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  doc,
  setDoc,
  getDoc,
  Unsubscribe,
} from '@angular/fire/firestore';
import { User } from '../models/user.class';
import { Channel } from '../models/channel.class';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  private firestore = inject(Firestore);
  private injector = inject(Injector);

  currentUser = signal<User | null>(null);
  channels: any[] = []; 

  currentChannelName: string = 'Allgemein';
  selectedChannelId: string = '';

  chats: any[] = [];

  currentChatName: string = 'Allgemein';
  selectedChatId: string = '';

  unsubUser: Unsubscribe | null = null;
  unsubChannels: Unsubscribe | null = null;
  unsubChats: Unsubscribe | null = null;

  constructor() {
    this.unsubChannels = this.subChannels();
    this.unsubChats = this.subChats();
  }

  ngOnDestroy() {
    if (this.unsubChannels) this.unsubChannels();
    if (this.unsubUser) this.unsubUser();
  }

  subChannels(): Unsubscribe {
    const q = query(collection(this.firestore, 'channels'));
    this.unsubChannels?.();
    this.unsubChannels = onSnapshot(q, snap => {
      this.channels = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    });
    return this.unsubChannels;
  }

  subChats(): Unsubscribe {
    const q = query(collection(this.firestore, 'chats'));
    this.unsubChats?.();
    this.unsubChats = onSnapshot(q, snap => {
      this.chats = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    });
    return this.unsubChats;
  }

  setSelectedChannel(id: string) {
    this.selectedChannelId = id;

    const channel = this.channels.find((c) => c.id === id);
    if (channel) {
      this.currentChannelName = channel.name;
    }
  }

  isChatAvailable(id: string) {
    const chat = this.chats.find((c) => c.id === id);
    if (chat) {
      return true
    }
    return false
  }

  subUser(uid: string) {
    this.unsubUser?.();
    this.unsubUser = onSnapshot(doc(this.firestore, 'users', uid), (snap) => {
      const data = snap.data();
      if (data) {
        this.currentUser.set(new User(data));
      } else {
        this.currentUser.set(null);
      }
    });
  }


  async addUser(user: User, uid: string) {
    return runInInjectionContext(this.injector, async () => {
      await setDoc(doc(this.firestore, 'users', uid), user.toJSON(), { merge: true }).catch((err) =>
        console.error(err)
      );
    });
  }

  async addChannel(channel: Channel): Promise<string | null> {
    return runInInjectionContext(this.injector, async () => {
      const data: any = channel.toJSON ? channel.toJSON() : { ...channel };
      data.createdAt = new Date().getTime();

      try {
        const docRef = await addDoc(collection(this.firestore, 'channels'), data);
        return docRef.id;
      } catch (err) {
        console.error(err);
        return null;
      }
    });
  }

  async getSingleUser(uid: string): Promise<User | null> {
    const docRef = doc(this.firestore, 'users', uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return new User(snap.data());
    }
    return null;
  }

  async updateSingleUser(uid: string, userData: any) {
    const docRef = doc(this.firestore, 'users', uid);
    await setDoc(docRef, userData, { merge: true });
    // userData as object like { firstName: "newFirstName", lastName: "newLastName" }
  }


  // get all users as Observable
  private users = new Observable<User[]>((observer) => {
    const q = query(collection(this.firestore, 'users'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const users = querySnapshot.docs.map(d => new User(d.data()));
      observer.next(users);
    }, (error) => {
      observer.error(error);
    });
    return () => unsubscribe();
  });
  //Convert it into Signal 
  readonly getAllUsers = toSignal(this.users, { initialValue: [] as User[] });

}