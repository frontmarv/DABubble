import { Injectable } from '@angular/core';
import { Firestore, collection, doc, setDoc, addDoc, onSnapshot, query } from '@angular/fire/firestore';
import { User } from '../models/user.class';
import { Channel } from '../models/channel.class';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {

  currentUser: User = new User();
  channels: any[] = [];

  currentChannelName: string = "Allgemein"; 
  selectedChannelId: string = ""; 

  unsubChannels: any;
  unsubUser: any;

  constructor(private firestore: Firestore) {
    this.unsubChannels = this.subChannels();
  }

  ngOnDestroy() {
    if (this.unsubChannels) this.unsubChannels();
    if (this.unsubUser) this.unsubUser();
  }

  subChannels() {
    const q = query(collection(this.firestore, "channels"));
    
    return onSnapshot(q, (list: any) => {
      this.channels = [];
      list.forEach((element: any) => {
        this.channels.push({ id: element.id, ...element.data() });
      });
      console.log("Channels update:", this.channels);
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
    await setDoc(doc(this.firestore, "users", uid), user.toJSON())
      .catch((err) => { console.error(err); });
  }

  async addChannel(channel: Channel) {
    try {
      const docRef = await addDoc(collection(this.firestore, "channels"), channel.toJSON());
      
      console.log("Document written with ID: ", docRef.id);
      
      return docRef.id;
    } catch (err) {
      console.error(err);
      return null;
    }
  }
}