import { Injectable, inject, Injector, runInInjectionContext } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  doc,
  setDoc,
} from '@angular/fire/firestore';
import { User } from '../models/user.class';
import { Channel } from '../models/channel.class';
import { Unsubscribe } from 'firebase/firestore';

@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  private firestore = inject(Firestore);
  private injector = inject(Injector);

  currentUser: User = new User();
  channels: any[] = [];

  currentChannelName: string = 'Allgemein';
  selectedChannelId: string = '';

  unsubUser: Unsubscribe | null = null;
  unsubChannels: Unsubscribe | null = null;

  constructor() {
    this.unsubChannels = this.subChannels();
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

  setSelectedChannel(id: string) {
    this.selectedChannelId = id;

    const channel = this.channels.find((c) => c.id === id);
    if (channel) {
      this.currentChannelName = channel.name;
    }
  }

  subUser(uid: string): Unsubscribe {
    this.unsubUser?.();
    this.unsubUser = onSnapshot(doc(this.firestore, 'users', uid), snap => {
      if (snap.data()) this.currentUser = new User(snap.data());
    });
    return this.unsubUser;
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
}
