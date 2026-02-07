import { Injectable, inject, Injector, runInInjectionContext } from '@angular/core';
import { Firestore, collection, addDoc, onSnapshot, query, doc, setDoc } from '@angular/fire/firestore';
import { User } from '../models/user.class';
import { Channel } from '../models/channel.class';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private firestore = inject(Firestore);
  private injector = inject(Injector);
  
  currentUser: User = new User();
  channels: any[] = [];

  currentChannelName: string = "Allgemein"; 
  selectedChannelId: string = ""; 

  unsubChannels: any;
  unsubUser: any;

  constructor() {
    this.unsubChannels = this.subChannels();
  }

  ngOnDestroy() {
    if (this.unsubChannels) this.unsubChannels();
    if (this.unsubUser) this.unsubUser();
  }

  subChannels() {
    const q = query(collection(this.firestore, "channels"));
    
    return onSnapshot(q, (list: any) => {
      this.channels.length = 0;
      
      list.forEach((element: any) => {
        this.channels.push({ id: element.id, ...element.data() });
      });

      this.channels.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

      if (this.channels.length > 0 && !this.selectedChannelId) {
        this.setSelectedChannel(this.channels[0].id);
      }
    });
  }

  setSelectedChannel(id: string) {
    this.selectedChannelId = id;
    
    const channel = this.channels.find(c => c.id === id);
    if (channel) {
      this.currentChannelName = channel.name;
    }
  }

  subUser(uid: string) {
    return onSnapshot(doc(this.firestore, "users", uid), (docSnap: any) => {
      if(docSnap.data()) {
        this.currentUser = new User(docSnap.data());
      }
    });
  }

  async addUser(user: User, uid: string) {
    return runInInjectionContext(this.injector, async () => {
      await setDoc(doc(this.firestore, "users", uid), user.toJSON())
        .catch((err) => { console.error(err); });
    });
  }

  async addChannel(channel: Channel): Promise<string | null> {
    return runInInjectionContext(this.injector, async () => {
      let data: any = channel.toJSON ? channel.toJSON() : { ...channel };
      data.createdAt = new Date().getTime();

      try {
        const docRef = await addDoc(collection(this.firestore, "channels"), data);
        return docRef.id;
      } catch (err) {
        console.error(err);
        return null;
      }
    });
  }
}